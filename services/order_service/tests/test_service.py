from unittest.mock import MagicMock, patch

import pytest
import requests
from fastapi import HTTPException

from service import OrderService
import models
import schemas

@pytest.fixture
def mock_repo():
    return MagicMock()

@pytest.fixture
def service(mock_repo):
    return OrderService(mock_repo)

def test_get_cart_existing(service, mock_repo):
    user_id = 1
    mock_cart = models.Cart(id=1, user_id=user_id)
    mock_repo.get_cart_by_user.return_value = mock_cart

    result = service.get_cart(user_id)
    
    assert result.id == 1
    assert result.user_id == user_id
    mock_repo.get_cart_by_user.assert_called_once_with(user_id)
    mock_repo.create_cart.assert_not_called()

def test_get_cart_new(service, mock_repo):
    user_id = 1
    mock_repo.get_cart_by_user.return_value = None
    mock_new_cart = models.Cart(id=2, user_id=user_id)
    mock_repo.create_cart.return_value = mock_new_cart

    result = service.get_cart(user_id)
    
    assert result.id == 2
    mock_repo.get_cart_by_user.assert_called_once_with(user_id)
    mock_repo.create_cart.assert_called_once_with(user_id)

@pytest.mark.parametrize("quantity", range(1, 91))
def test_add_to_cart_parameterized(service, mock_repo, quantity):
    user_id = 1
    item_data = schemas.CartItemCreate(product_id=10, quantity=quantity)
    mock_cart = models.Cart(id=1, user_id=user_id)
    mock_repo.get_cart_by_user.return_value = mock_cart
    
    mock_repo.add_item_to_cart.return_value = models.CartItem(id=1, cart_id=1, product_id=10, quantity=quantity)

    result = service.add_to_cart(user_id, item_data)
    
    assert result.product_id == 10
    assert result.quantity == quantity

@patch("requests.post")
@patch("service.distributed_lock")
def test_create_order_product_service_unavailable(mock_lock, mock_post, service, mock_repo):
    user_id = 1
    order_data = schemas.OrderCreate(
        user_id=user_id,
        items=[schemas.OrderItemCreate(product_id=1, quantity=1)],
        full_name="Test User",
        address="Test Addr",
        city="Test City",
        zip_code="12345",
        payment_method="card"
    )
    
    mock_post.side_effect = requests.RequestException("Connection error")
    
    with pytest.raises(HTTPException) as exc:
        service.create_order(order_data)
        
    assert exc.value.status_code == 503
    assert exc.value.detail == "Product service unavailable"

@patch("requests.post")
@patch("service.distributed_lock")
def test_create_order_success(mock_lock, mock_post, service, mock_repo):
    user_id = 1
    order_data = schemas.OrderCreate(
        user_id=user_id,
        items=[schemas.OrderItemCreate(product_id=1, quantity=2)],
        full_name="Test User",
        address="Test Addr",
        city="Test City",
        zip_code="12345",
        payment_method="card"
    )
    
    # Mock product service bulk response
    mock_post.side_effect = [
        MagicMock(status_code=200, json=lambda: [{"id": 1, "price": 15.0, "seller_id": 2}]),
        MagicMock(status_code=200, json=lambda: {"success": True}),  # decrement stock
    ]
    
    mock_lock_instance = MagicMock()
    mock_lock_instance.__enter__.return_value = True
    mock_lock.return_value = mock_lock_instance
    
    mock_created_order = models.Order(id=1, user_id=user_id, total_price=30.0)
    mock_repo.create_order.return_value = mock_created_order
    mock_repo.get_order_by_id.return_value = mock_created_order
    
    with patch("observers.order_subject.notify") as mock_notify:
        result = service.create_order(order_data)
        
        assert result.total_price == 30.0
        assert mock_repo.create_order.called
        assert mock_repo.create_order_items.called
        mock_notify.assert_called_once()


def test_approve_item_success(service, mock_repo):
    seller_id = 5
    item_id = 10
    mock_item = MagicMock(order_id=100, is_approved=False)
    mock_repo.get_order_item_for_seller.return_value = mock_item
    
    mock_order = MagicMock(status=models.OrderStatus.PAID, payment_method="card")
    mock_order.items = [mock_item]
    mock_repo.get_order_by_id.return_value = mock_order

    with patch("observers.order_subject.notify"):
        result = service.approve_item(seller_id, item_id)
    
    assert result["is_approved"] is True
    assert mock_item.is_approved is True
    assert mock_order.status == models.OrderStatus.SHIPPED
    mock_repo.update_order_item.assert_called_once()
    mock_repo.update_order.assert_called_once()

def test_approve_item_not_found(service, mock_repo):
    mock_repo.get_order_item_for_seller.return_value = None
    with pytest.raises(HTTPException) as excinfo:
        service.approve_item(1, 1)
    assert excinfo.value.status_code == 404

def test_deliver_item_success(service, mock_repo):
    seller_id = 5
    item_id = 10
    mock_item = MagicMock(order_id=100, is_approved=True, is_delivered=False)
    mock_repo.get_order_item_for_seller.return_value = mock_item
    
    mock_order = MagicMock(status=models.OrderStatus.SHIPPED, payment_method="card")
    mock_order.items = [mock_item]
    mock_repo.get_order_by_id.return_value = mock_order

    result = service.deliver_item(seller_id, item_id)
    
    assert result["is_delivered"] is True
    assert mock_item.is_delivered is True
    assert mock_order.status == models.OrderStatus.DELIVERED
    mock_repo.update_order_item.assert_called_once()
    mock_repo.update_order.assert_called_once()

def test_get_seller_analytics(service, mock_repo):
    seller_id = 1
    from datetime import datetime
    now = datetime.utcnow()
    mock_item1 = MagicMock(id=1, price=10.0, quantity=2, product_id=100, order=MagicMock(created_at=now))
    mock_item2 = MagicMock(id=2, price=20.0, quantity=1, product_id=101, order=MagicMock(created_at=now))
    
    mock_repo.get_seller_analytics_items.return_value = [mock_item1, mock_item2]

    result = service.get_seller_analytics(seller_id)
    
    assert result["total_revenue"] == 40.0
    assert result["total_sales"] == 3
    assert len(result["top_products"]) == 2
