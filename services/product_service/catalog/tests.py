import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from catalog.models import Category, Product
from unittest.mock import patch
from django.contrib.auth.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(username='testuser', password='testpassword')

@pytest.fixture
def authenticated_client(test_user):
    client = APIClient()
    client.force_authenticate(user=test_user)
    return client

@pytest.fixture
def category(db):
    return Category.objects.create(name='Electronics', slug='electronics', description='Electronic items')

@pytest.fixture
def product(db, category):
    return Product.objects.create(
        category=category,
        seller_id=1,
        name='Laptop',
        slug='laptop',
        description='A powerful laptop',
        price=999.99,
        stock=10
    )

@pytest.mark.django_db
class TestModels:
    def test_category_creation(self, category):
        assert category.name == 'Electronics'
        assert category.slug == 'electronics'
        assert str(category) == 'Electronics'

    def test_product_creation(self, product, category):
        assert product.name == 'Laptop'
        assert product.category == category
        assert product.price == 999.99
        assert product.stock == 10
        assert product.is_active is True
        assert str(product) == 'Laptop'


@pytest.fixture(autouse=True)
def dummy_cache(settings):
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

@pytest.mark.django_db
class TestViews:
    def test_category_list(self, api_client, category):
        response = api_client.get('/categories/')
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['name'] == 'Electronics'

    def test_product_list(self, api_client, product):
        response = api_client.get('/products/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Laptop'

    @patch('catalog.views.requests.get')
    def test_product_creation_api(self, mock_get, authenticated_client, category):
        # Mock payment service response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {'tier': 'pro'}
        
        data = {
            'name': 'New Product',
            'category_id': category.id,
            'description': 'Description here',
            'price': '199.99',
            'stock': 5
        }
        
        response = authenticated_client.post('/products/', data, format='json')
        assert response.status_code == 201
        assert response.data['name'] == 'New Product'
        assert response.data['is_premium'] is True

    @patch('catalog.views.requests.get')
    def test_product_creation_limit_reached(self, mock_get, authenticated_client, category):
        # Mock payment service response (free tier allows 10 products)
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {'tier': 'free'}
        
        # Create 10 products to hit the limit
        for i in range(10):
            Product.objects.create(
                category=category,
                seller_id=authenticated_client.handler._force_user.id,
                name=f'Old Product {i}',
                slug=f'old-product-{i}',
                description='Desc',
                price=10.0,
                stock=1
            )
            
        data = {
            'name': 'New Product Limit',
            'category_id': category.id,
            'description': 'Description here',
            'price': '199.99',
            'stock': 5
        }
        
        response = authenticated_client.post('/products/', data, format='json')
        assert response.status_code == 400
        assert 'Product limit reached' in response.data['detail']

    def test_decrement_stock(self, api_client, product):
        response = api_client.post(f'/products/{product.id}/decrement_stock/', {'quantity': 3}, format='json')
        assert response.status_code == 200
        assert response.data['success'] is True
        assert response.data['new_stock'] == 7
        
        # Test not enough stock
        response = api_client.post(f'/products/{product.id}/decrement_stock/', {'quantity': 10}, format='json')
        assert response.status_code == 400
        assert 'Not enough stock' in response.data['detail']

    def test_get_bulk_products(self, api_client, product):
        response = api_client.post('/products/bulk/', {'product_ids': [product.id]}, format='json')
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['name'] == 'Laptop'

    def test_update_seller_premium_status(self, api_client, product):
        response = api_client.post('/products/update-seller-premium/', {'seller_id': product.seller_id, 'is_premium': True}, format='json')
        assert response.status_code == 200
        
        product.refresh_from_db()
        assert product.is_premium is True
