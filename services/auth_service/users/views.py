from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from .models import UserRole

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

class UserProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        role = request.data.get('role')
        phone_number = request.data.get('phone_number')
        username = request.data.get('username')
        
        if role in dict(UserRole.choices).keys():
            user.role = role
        if phone_number is not None:
            user.phone_number = phone_number
        if username is not None:
            user.username = username
            
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)
