import json
import base64
import requests
from django.utils.text import slugify
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from django.db.models import Case, When, Value, IntegerField, Q
from rest_framework.exceptions import ValidationError
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'seller_id']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'is_premium']
    
    def get_queryset(self):
        now = timezone.now()
        five_mins_ago = now - timedelta(minutes=5)
        one_week_ago = now - timedelta(days=7)

        # Deactivate products out of stock for > 1 week
        Product.objects.filter(stock=0, out_of_stock_at__lt=one_week_ago, is_active=True).update(is_active=False)

        qs = Product.objects.filter(is_active=True)

        # Custom manual filters for fields not in filterset_fields
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        in_stock = self.request.query_params.get('in_stock')

        if min_price:
            try:
                qs = qs.filter(price__gte=float(min_price))
            except ValueError:
                pass
                
        if max_price:
            try:
                qs = qs.filter(price__lte=float(max_price))
            except ValueError:
                pass
                
        if in_stock and in_stock.lower() == 'true':
            qs = qs.filter(stock__gt=0)

        # Annotate for out_of_stock penalty (if stock == 0 AND out_of_stock_at < 5 mins ago -> penalty)
        qs = qs.annotate(
            out_of_stock_penalty=Case(
                When(Q(stock=0) & Q(out_of_stock_at__lt=five_mins_ago), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

        return qs.order_by('out_of_stock_penalty', '-is_premium', '-created_at')

    def perform_create(self, serializer):
        seller_id = 1
        auth_header = self.request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload_part = token.split('.')[1]
                payload_part += '=' * (-len(payload_part) % 4)
                payload = json.loads(base64.urlsafe_b64decode(payload_part).decode('utf-8'))
                seller_id = payload.get('user_id', 1)
            except Exception:
                pass

        # Check limits by querying payment_service for subscription
        from django.core.cache import cache
        
        cache_key = f"seller_sub_{seller_id}"
        sub_tier = cache.get(cache_key)
        
        if not sub_tier:
            try:
                sub_resp = requests.get(f"http://paymentservice:8004/users/{seller_id}/subscription", timeout=3)
                if sub_resp.status_code == 200:
                    sub_tier = sub_resp.json().get('tier', 'free')
                else:
                    sub_tier = "free"
            except Exception:
                sub_tier = "free"
            # Cache the tier for 5 minutes
            cache.set(cache_key, sub_tier, 300)

        # Define limits
        limits = {
            "free": 10,
            "plus": 100,
            "pro": 1000,
            "vip": 1000000 # essentially unlimited
        }
        max_products = limits.get(sub_tier, 10)
        
        current_count = Product.objects.filter(seller_id=seller_id).count()
        if current_count >= max_products:
            raise ValidationError({"detail": f"Product limit reached. Your current tier ({sub_tier.upper()}) allows up to {max_products} products. Please upgrade your subscription."})

        name = serializer.validated_data.get('name', '')
        slug = slugify(name)
        original_slug = slug
        counter = 1
        while Product.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{counter}"
            counter += 1

        is_premium = sub_tier in ['plus', 'pro', 'vip']
        stock = serializer.validated_data.get('stock', 0)
        out_of_stock_at = timezone.now() if stock == 0 else None
        
        serializer.save(
            seller_id=seller_id, 
            slug=slug, 
            is_premium=is_premium, 
            out_of_stock_at=out_of_stock_at
        )

    def perform_update(self, serializer):
        stock = serializer.validated_data.get('stock', serializer.instance.stock)
        
        if stock == 0 and serializer.instance.stock > 0:
            out_of_stock_at = timezone.now()
        elif stock > 0:
            out_of_stock_at = None
        else:
            out_of_stock_at = serializer.instance.out_of_stock_at

        serializer.save(out_of_stock_at=out_of_stock_at, stock=stock)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def update_seller_premium_status(request):
    seller_id = request.data.get('seller_id')
    is_premium = request.data.get('is_premium', False)
    
    if not seller_id:
        return Response({'error': 'seller_id is required'}, status=400)
        
    Product.objects.filter(seller_id=seller_id).update(is_premium=is_premium)
    return Response({'status': 'ok', 'updated_seller_id': seller_id, 'is_premium': is_premium})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def get_bulk_products(request):
    product_ids = request.data.get('product_ids', [])
    if not product_ids:
        return Response({'error': 'product_ids is required'}, status=400)
    
    products = Product.objects.filter(id__in=product_ids)
    data = [
        {
            'id': p.id,
            'price': float(p.price),
            'seller_id': p.seller_id,
            'stock': p.stock
        }
        for p in products
    ]
    return Response(data)
