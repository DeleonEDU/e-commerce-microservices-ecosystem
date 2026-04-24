import { apiSlice } from '../store/apiSlice';

export interface Payment {
  id: number;
  order_id: number;
  user_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export const paymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<{ client_secret: string, id: number }, { amount: number, order_id: number, user_id: number }>({
      query: (data) => ({
        url: '/payments/payment-intents',
        method: 'POST',
        body: data,
      }),
    }),
    getUserPayments: builder.query<Payment[], number>({
      query: (userId) => `/payments/users/${userId}/payments`,
      providesTags: (_result, _error, userId) => [{ type: 'User' as const, id: `payments-${userId}` }],
    }),
    confirmPayment: builder.mutation<{ status: string }, { payment_intent_id: string }>({
      query: (data) => ({
        url: '/payments/payments/confirm',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Order'],
    }),
  }),
});

export const { useCreatePaymentIntentMutation, useGetUserPaymentsQuery, useConfirmPaymentMutation } = paymentApiSlice;
