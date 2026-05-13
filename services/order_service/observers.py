from abc import ABC, abstractmethod
from typing import List, Any

class OrderObserver(ABC):
    @abstractmethod
    def update(self, order: Any):
        pass

class OrderSubject:
    def __init__(self):
        self._observers: List[OrderObserver] = []

    def attach(self, observer: OrderObserver):
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: OrderObserver):
        self._observers.remove(observer)

    def notify(self, order: Any):
        for observer in self._observers:
            observer.update(order)

class NotificationObserver(OrderObserver):
    def update(self, order: Any):
        print(f"[Notification] Order {order.id} status changed to {order.status}")

class PaymentObserver(OrderObserver):
    def update(self, order: Any):
        print(f"[Payment] Order {order.id} verified.")

order_subject = OrderSubject()
order_subject.attach(NotificationObserver())
order_subject.attach(PaymentObserver())
