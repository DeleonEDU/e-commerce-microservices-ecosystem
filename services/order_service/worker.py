import pika
import json
import os
import sys
import time
from sqlalchemy.orm import Session
import models, database
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")

def process_payment_message(ch, method, properties, body):
    """
    Обробка повідомлення про оплату.
    """
    data = json.loads(body)
    order_id = data.get("order_id")
    status = data.get("status")
    
    print(f"Received payment update for order {order_id}: {status}")
    
    db = database.SessionLocal()
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        if order and status == "paid":
            order.status = models.OrderStatus.PAID
            db.commit()
            print(f"Order {order_id} status updated to PAID")
    except Exception as e:
        print(f"Error updating order {order_id}: {e}")
    finally:
        db.close()
    
    ch.basic_ack(delivery_tag=method.delivery_tag)

def _connect_with_retry():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    delay_s = 1
    while True:
        try:
            return pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=RABBITMQ_HOST,
                    credentials=credentials,
                    heartbeat=30,
                    blocked_connection_timeout=30,
                    connection_attempts=3,
                    retry_delay=2,
                )
            )
        except pika.exceptions.AMQPConnectionError as e:
            print(
                f"RabbitMQ connection failed ({e}). Retrying in {delay_s}s...",
                flush=True,
            )
            time.sleep(delay_s)
            delay_s = min(delay_s * 2, 30)

def start_consumer():
    """
    Запуск воркера для прослуховування черги.
    """
    connection = _connect_with_retry()
    channel = connection.channel()
    
    channel.queue_declare(queue='order_payments', durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='order_payments', on_message_callback=process_payment_message)
    
    print(' [*] Waiting for payment messages. To exit press CTRL+C', flush=True)
    channel.start_consuming()

if __name__ == "__main__":
    try:
        start_consumer()
    except KeyboardInterrupt:
        print('Interrupted')
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
