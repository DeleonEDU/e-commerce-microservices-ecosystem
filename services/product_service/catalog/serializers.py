from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    images = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'category', 'category_id', 'category_name', 'seller_id',
            'name', 'brand', 'slug', 'description', 'image_url', 'images', 'price',
            'stock', 'is_active', 'is_premium', 'specifications', 'out_of_stock_at', 'created_at',
        )
        read_only_fields = ('created_at', 'updated_at')
        extra_kwargs = {
            'category': {'read_only': True},
            'seller_id': {'required': False},
            'slug': {'required': False},
            'image_url': {'required': False, 'allow_blank': True},
        }

    def get_images(self, obj):
        if obj.image_url and str(obj.image_url).strip():
            return [obj.image_url.strip()]
        return []
