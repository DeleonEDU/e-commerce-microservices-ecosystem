import { apiSlice } from '../store/apiSlice';
import {
  PaymentCreateRequest,
  PaymentCreateResponse,
  SubscriptionRead,
  SubscriptionUpgradeRequest,
} from '../types/payment';

export const paymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<PaymentCreateResponse, PaymentCreateRequest>({
      query: (body) => ({
        url: `/payments/payment-intents`,
        method: 'POST',
        body,
      }),
    }),
    upgradeSubscription: builder.mutation<SubscriptionRead, SubscriptionUpgradeRequest>({
      query: ({ user_id, tier }) => ({
        url: `/payments/users/${user_id}/subscription`,
        method: 'PUT',
        body: { tier },
      }),
    }),
  }),
});

export const { useCreatePaymentIntentMutation, useUpgradeSubscriptionMutation } = paymentApiSlice;

