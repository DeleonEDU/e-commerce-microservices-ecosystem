import { apiSlice } from '../store/apiSlice';
import { Cart, Order, OrderCartItem, OrderCartItemCreate, OrderCreateRequest } from '../types/order';

export interface SellerAnalytics {
  total_revenue: number;
  total_sales: number;
  recent_sales: Array<{
    product_id: number;
    quantity: number;
    price: number;
    date: string | null;
  }>;
}

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUserOrders: builder.query<Order[], number>({
      query: (userId) => `/orders/users/${userId}/orders`,
      providesTags: (_result, _error, userId) => [{ type: 'Order', id: `user-${userId}` }],
    }),
    addCartItem: builder.mutation<OrderCartItem, { userId: number; item: OrderCartItemCreate }>({
      query: ({ userId, item }) => ({
        url: `/orders/cart/${userId}/items`,
        method: 'POST',
        body: item,
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'Cart', id: userId }],
    }),
    getCart: builder.query<Cart, number>({
      query: (userId) => `/orders/cart/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'Cart', id: userId }],
    }),
    createOrder: builder.mutation<Order, OrderCreateRequest>({
      query: (body) => ({
        url: `/orders/orders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { user_id }) => [
        { type: 'Cart', id: user_id },
        { type: 'Order', id: `user-${user_id}` },
      ],
    }),
    getSellerAnalytics: builder.query<SellerAnalytics, number>({
      query: (sellerId) => `/orders/sellers/${sellerId}/analytics`,
    }),
    checkUserBoughtProduct: builder.query<{has_bought: boolean}, {userId: number; productId: number}>({
      query: ({userId, productId}) => `/orders/users/${userId}/has_bought/${productId}`,
    }),
  }),
});

export const {
  useGetUserOrdersQuery,
  useAddCartItemMutation,
  useGetCartQuery,
  useCreateOrderMutation,
  useGetSellerAnalyticsQuery,
  useCheckUserBoughtProductQuery,
} = orderApiSlice;

