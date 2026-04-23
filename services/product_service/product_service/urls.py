from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from catalog.views import CategoryViewSet, ProductViewSet, update_seller_premium_status, get_bulk_products, decrement_stock
from product_service.health import health

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('products/health/', health, name='health'),
    path('products/update-seller-premium/', update_seller_premium_status, name='update_seller_premium'),
    path('products/bulk/', get_bulk_products, name='bulk_products'),
    path('products/<int:pk>/decrement_stock/', decrement_stock, name='decrement_stock'),
    path('', include(router.urls)),
]
    