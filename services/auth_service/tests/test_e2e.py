import pytest
import requests
from django.test import LiveServerTestCase
from django.urls import reverse
from users.models import UserRole

@pytest.mark.django_db
class TestAuthServiceE2E(LiveServerTestCase):
    def test_e2e_user_registration_and_login_flow(self):
        """
        E2E test that verifies user registration, login, profile retrieval,
        and token refreshing over actual HTTP network calls.
        """
        # Register URL
        register_url = f"{self.live_server_url}{reverse('register')}"
        login_url = f"{self.live_server_url}{reverse('token_obtain_pair')}"
        profile_url = f"{self.live_server_url}{reverse('user_profile')}"
        refresh_url = f"{self.live_server_url}{reverse('token_refresh')}"

        # 1. Register
        register_data = {
            'email': 'e2e@example.com',
            'username': 'e2e_user',
            'password': 'E2ePassword123!',
            'role': UserRole.BUYER
        }
        resp = requests.post(register_url, json=register_data)
        assert resp.status_code == 201

        # 2. Login
        login_data = {
            'email': 'e2e@example.com',
            'password': 'E2ePassword123!'
        }
        resp = requests.post(login_url, json=login_data)
        assert resp.status_code == 200
        tokens = resp.json()
        assert 'access' in tokens
        assert 'refresh' in tokens

        access_token = tokens['access']
        refresh_token = tokens['refresh']

        # 3. Access Profile
        headers = {
            'Authorization': f"Bearer {access_token}"
        }
        resp = requests.get(profile_url, headers=headers)
        assert resp.status_code == 200
        profile_data = resp.json()
        assert profile_data['email'] == 'e2e@example.com'
        assert profile_data['role'] == 'buyer'

        # 4. Refresh Token
        resp = requests.post(refresh_url, json={'refresh': refresh_token})
        assert resp.status_code == 200
        new_tokens = resp.json()
        assert 'access' in new_tokens
        
        # 5. Access Profile with new token
        headers = {
            'Authorization': f"Bearer {new_tokens['access']}"
        }
        resp = requests.get(profile_url, headers=headers)
        assert resp.status_code == 200
        assert resp.json()['email'] == 'e2e@example.com'
