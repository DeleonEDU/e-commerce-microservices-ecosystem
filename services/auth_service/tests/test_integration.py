import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import UserRole

User = get_user_model()

@pytest.mark.django_db
class TestAuthFlowIntegration:
    def setup_method(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.token_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.profile_url = reverse('user_profile')

    def test_full_auth_flow(self):
        # 1. Register a new user
        register_payload = {
            'email': 'integration@example.com',
            'username': 'integration',
            'password': 'StrongPassword123!',
            'role': UserRole.BUYER
        }
        response = self.client.post(self.register_url, register_payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED

        # 2. Login to get tokens
        login_payload = {
            'email': 'integration@example.com',
            'password': 'StrongPassword123!'
        }
        response = self.client.post(self.token_url, login_payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

        access_token = response.data['access']
        refresh_token = response.data['refresh']

        # 3. Access protected profile endpoint with token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.profile_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'integration@example.com'

        # 4. Refresh the token
        refresh_payload = {
            'refresh': refresh_token
        }
        response = self.client.post(self.refresh_url, refresh_payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

        new_access_token = response.data['access']

        # 5. Access protected profile endpoint with the new token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access_token}')
        response = self.client.get(self.profile_url)
        assert response.status_code == status.HTTP_200_OK

    def test_seller_profile_visibility(self):
        # Register a seller
        seller = User.objects.create_user(
            email='seller_integration@example.com',
            username='seller',
            password='Password123',
            role=UserRole.SELLER,
            store_name='Best Store'
        )

        seller_url = reverse('seller_profile', kwargs={'pk': seller.pk})

        # Access seller profile publicly (no token needed)
        self.client.credentials()  # clear credentials
        response = self.client.get(seller_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['store_name'] == 'Best Store'

    def test_health_check(self):
        # Check health endpoint
        health_url = reverse('health')
        response = self.client.get(health_url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['status'] == 'ok'
        assert data['service'] == 'auth'
