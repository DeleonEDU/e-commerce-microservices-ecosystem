from abc import ABC, abstractmethod
from django.db.models import QuerySet, Case, When, Value, IntegerField

class RankingStrategy(ABC):
    @abstractmethod
    def rank(self, queryset: QuerySet) -> QuerySet:
        pass

class DefaultRankingStrategy(RankingStrategy):
    def rank(self, queryset: QuerySet) -> QuerySet:
        # Standard: out_of_stock_penalty, then premium, then newest
        qs = queryset.annotate(
            out_of_stock_penalty=Case(
                When(stock=0, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        return qs.order_by('out_of_stock_penalty', '-is_premium', '-created_at')

class RatingRankingStrategy(RankingStrategy):
    def rank(self, queryset: QuerySet) -> QuerySet:
        qs = queryset.annotate(
            out_of_stock_penalty=Case(
                When(stock=0, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        return qs.order_by('out_of_stock_penalty', '-is_premium', 'price')

class RankingContext:
    def __init__(self, strategy: RankingStrategy):
        self._strategy = strategy
        
    def set_strategy(self, strategy: RankingStrategy):
        self._strategy = strategy
        
    def execute_ranking(self, queryset: QuerySet) -> QuerySet:
        return self._strategy.rank(queryset)
