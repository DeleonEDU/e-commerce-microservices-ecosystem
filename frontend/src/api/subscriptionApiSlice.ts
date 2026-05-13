import { apiSlice } from '../store/apiSlice';

export interface Subscription {
  id: number;
  user_id: number;
  tier: 'free' | 'plus' | 'pro' | 'vip';
  status: string;
}

export const subscriptionApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSubscription: builder.query<Subscription, number>({
      query: (userId) => `/payments/users/${userId}/subscription`,
      providesTags: ['Subscription'],
    }),
    upgradeSubscription: builder.mutation<Subscription, { userId: number; tier: string }>({
      query: ({ userId, tier }) => ({
        url: `/payments/users/${userId}/subscription`,
        method: 'PUT',
        body: { tier },
      }),
      invalidatesTags: ['Subscription', 'Product'], // Invalidate products to refresh premium status
    }),
    createSubscriptionIntent: builder.mutation<{ client_secret: string, id: number }, { amount: number, user_id: number, tier: string }>({
      query: (data) => ({
        url: '/payments/subscription-intents',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { useGetSubscriptionQuery, useUpgradeSubscriptionMutation, useCreateSubscriptionIntentMutation } = subscriptionApiSlice;
