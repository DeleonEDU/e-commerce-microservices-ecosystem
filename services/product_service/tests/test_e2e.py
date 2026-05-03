import pytest
from rest_framework.test import APIClient
from catalog.models import Category, Product
from django.contrib.auth.models import User
from unittest.mock import patch

@pytest.fixture(autouse=True)
def dummy_cache(settings):
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(username='e2e_user', password='password123')

@pytest.fixture
def auth_client(test_user):
    client = APIClient()
    client.force_authenticate(user=test_user)
    return client

@pytest.mark.django_db
@patch('catalog.views.requests.get')
def test_e2e_product_lifecycle(mock_get, auth_client, api_client):
    # Mock subscription request
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {'tier': 'pro'}

    # 1. Admin/User creates a category
    # Categories are restricted by IsAuthenticatedOrReadOnly, so auth_client can create it
    # Oh wait, CategoryViewSet only has IsAuthenticatedOrReadOnly. Can any authenticated user create?
    # In a real app it might be Admin, but here IsAuthenticatedOrReadOnly is used.
    cat_response = auth_client.post('/categories/', {
        'name': 'Home Appliances',
        'slug': 'home-appliances',
        'description': 'Appliances for home'
    }, format='json')
    assert cat_response.status_code == 201
    category_id = cat_response.data['id']

    # 2. Verify category appears in the list
    list_cat = api_client.get('/categories/')
    assert list_cat.status_code == 200
    assert any(c['name'] == 'Home Appliances' for c in list_cat.data)

    # 3. Seller creates a product
    prod_data = {
        'name': 'Vacuum Cleaner',
        'category_id': category_id,
        'description': 'A very good vacuum cleaner',
        'price': '150.00',
        'stock': 10
    }
    prod_response = auth_client.post('/products/', prod_data, format='json')
    assert prod_response.status_code == 201
    product_id = prod_response.data['id']

    # 4. Verify product appears in the product list
    list_prod = api_client.get('/products/')
    assert list_prod.status_code == 200
    assert any(p['name'] == 'Vacuum Cleaner' for p in list_prod.data['results'])

    # 5. Decrement stock
    dec_response = api_client.post(f'/products/{product_id}/decrement_stock/', {'quantity': 2}, format='json')
    assert dec_response.status_code == 200
    assert dec_response.data['new_stock'] == 8

    # 6. Update product as seller
    update_response = auth_client.patch(f'/products/{product_id}/', {'price': '130.00'}, format='json')
    assert update_response.status_code == 200
    assert update_response.data['price'] == '130.00'

    # 7. Try to decrement more stock than available
    dec_fail_response = api_client.post(f'/products/{product_id}/decrement_stock/', {'quantity': 10}, format='json')
    assert dec_fail_response.status_code == 400
    assert 'Not enough stock' in dec_fail_response.data['detail']

    # 8. Get bulk products
    bulk_response = api_client.post('/products/bulk/', {'product_ids': [product_id]}, format='json')
    assert bulk_response.status_code == 200
    assert len(bulk_response.data) == 1
    assert bulk_response.data[0]['name'] == 'Vacuum Cleaner'
    assert bulk_response.data[0]['price'] == 130.00
