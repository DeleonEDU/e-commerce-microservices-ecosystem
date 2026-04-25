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
    images = serializers.ListField(
        child=serializers.CharField(max_length=2048),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Product
        fields = (
            'id', 'category', 'category_id', 'category_name', 'seller_id',
            'name', 'brand', 'slug', 'description', 'image_url', 'images', 'price', 'discount_price',
            'stock', 'is_active', 'is_premium', 'specifications', 'out_of_stock_at', 'created_at',
        )
        read_only_fields = ('created_at', 'updated_at')
        extra_kwargs = {
            'category': {'read_only': True},
            'seller_id': {'required': False},
            'slug': {'required': False},
            'image_url': {'required': False, 'allow_blank': True},
            'images': {'required': False},
        }

    def _normalize_images(self, image_url, images):
        normalized_primary = str(image_url or '').strip()
        normalized_images = []
        seen = set()

        for img in (images or []):
            value = str(img).strip()
            if value and value not in seen:
                normalized_images.append(value)
                seen.add(value)

        if normalized_primary:
            normalized_images = [img for img in normalized_images if img != normalized_primary]
            normalized_images.insert(0, normalized_primary)
        elif normalized_images:
            normalized_primary = normalized_images[0]

        return normalized_primary, normalized_images

    def validate(self, attrs):
        current_primary = self.instance.image_url if self.instance else ''
        current_images = self.instance.images if self.instance else []

        image_url = attrs.get('image_url', current_primary)
        images = attrs.get('images', current_images)

        normalized_primary, normalized_images = self._normalize_images(image_url, images)
        attrs['image_url'] = normalized_primary
        attrs['images'] = normalized_images

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        normalized_primary, normalized_images = self._normalize_images(
            data.get('image_url'),
            data.get('images'),
        )
        data['image_url'] = normalized_primary
        data['images'] = normalized_images
        return data
