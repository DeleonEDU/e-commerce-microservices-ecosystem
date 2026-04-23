import { apiSlice } from '../store/apiSlice';
import { Cart, Order, OrderCartItem, OrderCartItemCreate, OrderCreateRequest } from '../types/order';

export interface SellerAnalytics {
  total_revenue: number;
  total_sales: number;
  recent_sales: Array<{
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    is_approved: boolean;
    date: string | null;
    order?: {
      id: number;
      full_name: string;
      address: string;
      city: string;
      zip_code: string;
      status: string;
    };
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
      providesTags: (_result, _error, sellerId) => [{ type: 'SellerAnalytics', id: sellerId }],
    }),
    approveOrderItem: builder.mutation<{status: string}, {sellerId: number, itemId: number}>({
      query: ({sellerId, itemId}) => ({
        url: `/orders/sellers/${sellerId}/items/${itemId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { sellerId }) => [{ type: 'SellerAnalytics', id: sellerId }],
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
  useApproveOrderItemMutation,
  useCheckUserBoughtProductQuery,
} = orderApiSlice;

