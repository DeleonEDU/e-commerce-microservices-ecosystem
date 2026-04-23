import { apiSlice } from '../store/apiSlice';

export const paymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<{ client_secret: string, id: number }, { amount: number, order_id: number, user_id: number }>({
      query: (data) => ({
        url: '/payments/payment-intents',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { useCreatePaymentIntentMutation } = paymentApiSlice;
