import pytest
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from users.models import UserRole
from users.serializers import UserSerializer
from rest_framework.test import APIClient
from django.urls import reverse
from rest_framework import status

User = get_user_model()

@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpassword123',
            role=UserRole.BUYER
        )
        assert user.email == 'test@example.com'
        assert user.username == 'testuser'
        assert user.role == UserRole.BUYER
        assert user.check_password('testpassword123')
        assert str(user) == 'test@example.com (buyer)'

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email='admin@example.com',
            username='adminuser',
            password='testpassword123',
            role=UserRole.ADMIN
        )
        assert admin.email == 'admin@example.com'
        assert admin.is_superuser
        assert admin.is_staff
        assert admin.role == UserRole.ADMIN

@pytest.mark.django_db
class TestUserSerializer:
    def test_serializer_with_valid_data(self):
        valid_data = {
            'email': 'serial@example.com',
            'username': 'serialuser',
            'password': 'password123',
            'role': UserRole.SELLER,
            'phone_number': '1234567890'
        }
        serializer = UserSerializer(data=valid_data)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.email == 'serial@example.com'
        assert user.role == UserRole.SELLER
        assert user.check_password('password123')

    def test_serializer_with_invalid_data(self):
        invalid_data = {
            'email': 'not-an-email',
            'username': 'serialuser',
            'password': 'password123'
        }
        serializer = UserSerializer(data=invalid_data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors

@pytest.mark.django_db
class TestUserViews:
    def setup_method(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.profile_url = reverse('user_profile')

    def test_register_user(self):
        payload = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'password123',
            'role': UserRole.BUYER
        }
        response = self.client.post(self.register_url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == payload['email']
        assert 'password' not in response.data

    def test_get_user_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_profile_authenticated(self):
        user = User.objects.create_user(
            email='auth@example.com',
            username='authuser',
            password='password123'
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(self.profile_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['username'] == user.username

    def test_update_user_profile(self):
        user = User.objects.create_user(
            email='update@example.com',
            username='updateuser',
            password='password123'
        )
        self.client.force_authenticate(user=user)
        payload = {
            'phone_number': '0987654321',
            'role': UserRole.SELLER,
            'store_name': 'My Cool Store'
        }
        response = self.client.patch(self.profile_url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        user.refresh_from_db()
        assert user.phone_number == '0987654321'
        assert user.role == UserRole.SELLER
        assert user.store_name == 'My Cool Store'

    def test_get_seller_profile(self):
        seller = User.objects.create_user(
            email='seller@example.com',
            username='selleruser',
            password='password123',
            role=UserRole.SELLER,
            store_name='Seller Store'
        )
        seller_url = reverse('seller_profile', kwargs={'pk': seller.pk})
        
        # This endpoint is AllowAny
        response = self.client.get(seller_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == seller.email
        assert response.data['store_name'] == 'Seller Store'

    def test_get_seller_profile_not_found(self):
        # Even if a user exists, but they are not a seller, it should return 404
        buyer = User.objects.create_user(
            email='buyer@example.com',
            username='buyeruser',
            password='password123',
            role=UserRole.BUYER
        )
        seller_url = reverse('seller_profile', kwargs={'pk': buyer.pk})
        response = self.client.get(seller_url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
