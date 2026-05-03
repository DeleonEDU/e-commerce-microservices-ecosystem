from django.db import migrations

def populate_categories(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    categories = [
        {"name": "Електроніка", "slug": "electronics", "description": "Смартфони, ноутбуки, аксесуари та інша електроніка."},
        {"name": "Одяг", "slug": "clothing", "description": "Чоловічий, жіночий та дитячий одяг."},
        {"name": "Дім і Сад", "slug": "home-and-garden", "description": "Товари для дому, меблі, декор, садівництво."},
        {"name": "Спорт", "slug": "sports", "description": "Спортивний інвентар, одяг та харчування."},
        {"name": "Краса та Здоров'я", "slug": "beauty-health", "description": "Косметика, парфумерія, товари для догляду."},
        {"name": "Автотовари", "slug": "auto", "description": "Автозапчастини, аксесуари, шини."},
        {"name": "Дитячі товари", "slug": "kids", "description": "Іграшки, одяг для дітей, товари для немовлят."},
        {"name": "Книги", "slug": "books", "description": "Художня література, підручники, комікси."},
    ]
    for cat_data in categories:
        Category.objects.get_or_create(
            slug=cat_data['slug'],
            defaults={
                'name': cat_data['name'],
                'description': cat_data['description']
            }
        )

def reverse_populate(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    slugs = ["electronics", "clothing", "home-and-garden", "sports", "beauty-health", "auto", "kids", "books"]
    Category.objects.filter(slug__in=slugs).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0005_product_discount_price_product_images'),
    ]

    operations = [
        migrations.RunPython(populate_categories, reverse_populate),
    ]
