from rest_framework_simplejwt.authentication import JWTAuthentication

class DummyUser:
    def __init__(self, user_id):
        self.id = user_id
        self.is_authenticated = True
        self.is_active = True

def get_dummy_user(token):
    user_id = token.get('user_id', 1)
    return DummyUser(user_id)

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        return get_dummy_user(validated_token)
