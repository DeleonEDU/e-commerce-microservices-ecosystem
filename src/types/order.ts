export interface OrderCartItemCreate {
  product_id: number;
  quantity: number;
}

export interface OrderCartItem {
  id: number;
  product_id: number;
  quantity: number;
}

export interface Cart {
  id: number;
  user_id: number;
  items: OrderCartItem[];
}

export interface OrderCreateRequest {
  user_id: number;
  items?: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

export interface OrderItem {
  product_id: number;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user_id: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

