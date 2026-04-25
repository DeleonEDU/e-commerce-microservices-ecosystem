import os
import sys
import django
import random
from datetime import timedelta
from django.utils import timezone

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'product_service.settings')
django.setup()

from catalog.models import Category, Product
from django.utils.text import slugify

# Categories
categories_data = [
    {"name": "Електроніка", "description": "Смартфони, ноутбуки, гаджети"},
    {"name": "Одяг", "description": "Чоловічий та жіночий одяг"},
    {"name": "Дім та сад", "description": "Все для дому"},
    {"name": "Спорт", "description": "Спортивний інвентар"},
    {"name": "Автотовари", "description": "Аксесуари для авто"},
]

categories = []
for c in categories_data:
    cat, _ = Category.objects.get_or_create(name=c["name"], defaults={"slug": slugify(c["name"], allow_unicode=True), "description": c["description"]})
    categories.append(cat)

# Products
products_data = [
    {"name": "IPhone 15 Pro", "cat": "Електроніка", "brand": "Apple", "price": 999.99, "images": ["https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-bluetitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692846360609"]},
    {"name": "MacBook Air M3", "cat": "Електроніка", "brand": "Apple", "price": 1299.00, "images": ["https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1708367688034"]},
    {"name": "Sony PlayStation 5", "cat": "Електроніка", "brand": "Sony", "price": 499.99, "images": ["https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21?$facebook$"]},
    {"name": "Футболка Nike", "cat": "Одяг", "brand": "Nike", "price": 29.99, "images": ["https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/1a84f331-5c31-419b-ab29-4503e91129b0/sportswear-club-mens-t-shirt-ShrJfP.png"]},
    {"name": "Кросівки Adidas Air", "cat": "Одяг", "brand": "Adidas", "price": 89.99, "images": ["https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/09c5ea6df1bd4be6baaaac5e003e7047_9366/Forum_Low_Shoes_White_FY7756_01_standard.jpg"]},
    {"name": "Набір інструментів Bosch", "cat": "Дім та сад", "brand": "Bosch", "price": 149.50, "images": ["https://m.media-amazon.com/images/I/81P2N+z6XhL._AC_SL1500_.jpg"]},
    {"name": "Гантелі 10кг", "cat": "Спорт", "brand": "FitLife", "price": 45.00, "images": ["https://m.media-amazon.com/images/I/71+pOdA7P+L._AC_SL1500_.jpg"]},
    {"name": "Відеореєстратор Xiaomi", "cat": "Автотовари", "brand": "Xiaomi", "price": 75.00, "images": ["https://m.media-amazon.com/images/I/51r2X73+L7L._AC_SL1000_.jpg"]},
    {"name": "Навушники AirPods Pro", "cat": "Електроніка", "brand": "Apple", "price": 249.00, "images": ["https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MTJV3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1694014871985", "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MTJV3_AV2?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1694014873165"]},
    {"name": "Смарт-годинник Samsung Galaxy Watch", "cat": "Електроніка", "brand": "Samsung", "price": 199.99, "images": ["https://images.samsung.com/is/image/samsung/p6pim/uk/2407/gallery/uk-galaxy-watch7-l300-sm-l300nzgaeua-542114751?$650_519_PNG$"]},
    {"name": "Кавоварка DeLonghi", "cat": "Дім та сад", "brand": "DeLonghi", "price": 350.00, "images": ["https://m.media-amazon.com/images/I/61N+V3+2qZL._AC_SL1500_.jpg"]},
    {"name": "Велосипед гірський", "cat": "Спорт", "brand": "Trek", "price": 550.00, "images": ["https://m.media-amazon.com/images/I/81wGn2TQJeL._AC_SL1500_.jpg"]}
]

for p in products_data:
    cat = next(c for c in categories if c.name == p["cat"])
    slug = slugify(p["name"], allow_unicode=True)
    if not Product.objects.filter(slug=slug).exists():
        Product.objects.create(
            category=cat,
            seller_id=1, # Admin or default seller
            name=p["name"],
            slug=slug,
            description=f"Це чудовий товар {p['name']} від бренду {p['brand']}. Найкращий вибір для вас!",
            price=p["price"],
            discount_price=p["price"] * 0.9 if random.random() > 0.5 else None,
            stock=random.randint(5, 50),
            brand=p["brand"],
            image_url=p["images"][0],
            images=p["images"],
            is_premium=random.random() > 0.7
        )
        print(f"Created product {p['name']}")
