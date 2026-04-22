import { apiSlice } from '../store/apiSlice';

export interface Subscription {
  id: number;
  user_id: number;
  tier: 'free' | 'pro' | 'vip';
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
      invalidatesTags: ['Subscription', 'Products'], // Invalidate products to refresh premium status
    }),
  }),
});

export const { useGetSubscriptionQuery, useUpgradeSubscriptionMutation } = subscriptionApiSlice;
