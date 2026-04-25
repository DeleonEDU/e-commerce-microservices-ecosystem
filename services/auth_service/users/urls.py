from django.urls import path
from .views import RegisterView, UserProfileView, SellerProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('sellers/<int:pk>/', SellerProfileView.as_view(), name='seller_profile'),
]
