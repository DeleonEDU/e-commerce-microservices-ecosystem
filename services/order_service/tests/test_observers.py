from unittest.mock import MagicMock

import pytest

from observers import NotificationObserver, OrderSubject, PaymentObserver


class RecordingObserver:
    def __init__(self) -> None:
        self.calls: list = []

    def update(self, order) -> None:
        self.calls.append(order)


def test_order_subject_attach_detach_notify():
    subject = OrderSubject()
    obs = RecordingObserver()
    subject.attach(obs)
    subject.attach(obs)  # idempotent
    order = MagicMock(id=1, status="PENDING")
    subject.notify(order)
    assert obs.calls == [order]
    subject.detach(obs)
    subject.notify(order)
    assert obs.calls == [order]


@pytest.mark.parametrize("order_id,status", [(1, "PAID"), (99, "SHIPPED"), (0, "DELIVERED")])
def test_notification_observer_update_prints(capsys, order_id, status):
    obs = NotificationObserver()
    order = MagicMock(id=order_id, status=status)
    obs.update(order)
    out = capsys.readouterr().out
    assert str(order_id) in out
    assert str(status) in out


@pytest.mark.parametrize("order_id", range(5))
def test_payment_observer_update_prints(capsys, order_id):
    obs = PaymentObserver()
    order = MagicMock(id=order_id)
    obs.update(order)
    out = capsys.readouterr().out
    assert str(order_id) in out


def test_global_order_subject_has_observers():
    from observers import order_subject

    assert len(order_subject._observers) >= 2
