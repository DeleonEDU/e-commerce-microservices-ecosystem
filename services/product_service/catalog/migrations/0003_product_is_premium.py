from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0002_product_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_premium',
            field=models.BooleanField(default=False),
        ),
    ]
