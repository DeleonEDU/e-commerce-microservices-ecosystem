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
  full_name?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  items?: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  price: number;
  is_approved?: boolean;
  is_delivered?: boolean;
}

export interface Order {
  id: number;
  user_id: number;
  total_price: number;
  status: OrderStatus;
  full_name?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  created_at: string;
  items: OrderItem[];
}

