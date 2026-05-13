import pytest
from django.utils import timezone

from catalog.models import Category, Product
from catalog.ranking_strategies import (
    DefaultRankingStrategy,
    RankingContext,
    RatingRankingStrategy,
)


@pytest.fixture
def category(db):
    return Category.objects.create(name="Cat", slug="cat", description="")


@pytest.mark.django_db
@pytest.mark.parametrize("stock,premium", [(0, False), (5, True), (100, False), (1, True)])
def test_default_strategy_orders_by_penalty_then_flags(category, stock, premium):
    Product.objects.create(
        category=category,
        seller_id=1,
        name=f"P-{stock}-{premium}",
        slug=f"p-{stock}-{premium}",
        description="d",
        price=10,
        stock=stock,
        is_premium=premium,
    )
    qs = Product.objects.filter(category=category)
    ranked = DefaultRankingStrategy().rank(qs)
    assert ranked.count() == 1


@pytest.mark.django_db
def test_default_strategy_multiple_products_ordering(category):
    p_out = Product.objects.create(
        category=category,
        seller_id=1,
        name="out",
        slug="out",
        description="d",
        price=20,
        stock=0,
        is_premium=True,
        created_at=timezone.now(),
    )
    p_in = Product.objects.create(
        category=category,
        seller_id=1,
        name="in",
        slug="in",
        description="d",
        price=10,
        stock=5,
        is_premium=False,
        created_at=timezone.now(),
    )
    qs = Product.objects.filter(id__in=[p_out.id, p_in.id])
    ordered = list(DefaultRankingStrategy().rank(qs).values_list("id", flat=True))
    # In-stock (penalty 0) before out-of-stock (penalty 1)
    assert ordered[0] == p_in.id


@pytest.mark.django_db
@pytest.mark.parametrize("price", [9.99, 19.0, 100.0, 0.01])
def test_rating_strategy_applies_price_order(category, price):
    Product.objects.create(
        category=category,
        seller_id=1,
        name=f"r-{price}",
        slug=f"r-{price}",
        description="d",
        price=price,
        stock=3,
        is_premium=False,
    )
    qs = Product.objects.filter(slug=f"r-{price}")
    ranked = RatingRankingStrategy().rank(qs)
    assert ranked.count() == 1


@pytest.mark.django_db
def test_ranking_context_switch_strategy(category):
    Product.objects.create(
        category=category,
        seller_id=1,
        name="ctx",
        slug="ctx",
        description="d",
        price=15,
        stock=1,
        is_premium=False,
    )
    qs = Product.objects.filter(slug="ctx")
    ctx = RankingContext(DefaultRankingStrategy())
    r1 = ctx.execute_ranking(qs)
    ctx.set_strategy(RatingRankingStrategy())
    r2 = ctx.execute_ranking(qs)
    assert r1.count() == r2.count() == 1
