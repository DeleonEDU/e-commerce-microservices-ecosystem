export interface PaymentCreateRequest {
  order_id: number;
  user_id: number;
  amount: number;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface PaymentCreateResponse {
  id: number;
  client_secret: string;
  status: PaymentStatus;
}

export type SubscriptionTier = 'free' | 'pro' | 'vip';

export interface SubscriptionUpgradeRequest {
  user_id: number;
  tier: SubscriptionTier;
}

export interface SubscriptionRead {
  id: number;
  user_id: number;
  tier: SubscriptionTier;
  status: string;
  stripe_subscription_id?: string | null;
  expires_at?: string | null;
}
