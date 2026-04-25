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
        store_name = request.data.get('store_name')
        store_description = request.data.get('store_description')
        store_logo = request.data.get('store_logo')
        
        if role in dict(UserRole.choices).keys():
            user.role = role
        if phone_number is not None:
            user.phone_number = phone_number
        if username is not None:
            user.username = username
        if store_name is not None:
            user.store_name = store_name
        if store_description is not None:
            user.store_description = store_description
        if store_logo is not None:
            user.store_logo = store_logo
            
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)

class SellerProfileView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role=UserRole.SELLER)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'Seller not found'}, status=status.HTTP_404_NOT_FOUND)
