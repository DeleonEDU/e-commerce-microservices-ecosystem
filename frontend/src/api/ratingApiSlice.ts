import { apiSlice } from '../store/apiSlice';
import { ProductRating, RankedProduct, Review, ReviewCreateRequest } from '../types/rating';

export const ratingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReviewsByProduct: builder.query<Review[], number>({
      query: (productId) => `/ratings/products/${productId}/reviews`,
      providesTags: (_result, _error, productId) => [{ type: 'Review', id: productId }],
    }),
    createReview: builder.mutation<Review, ReviewCreateRequest>({
      query: (body) => ({
        url: `/ratings/reviews`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { product_id }) => [{ type: 'Review', id: product_id }],
    }),
    getProductRating: builder.query<ProductRating, number>({
      query: (productId) => `/ratings/products/${productId}/rating`,
    }),
    getTopRankings: builder.query<RankedProduct[], { limit?: number } | undefined>({
      query: (params) => ({
        url: `/ratings/rankings/top`,
        params: params ?? undefined,
      }),
    }),
  }),
});

export const {
  useGetReviewsByProductQuery,
  useCreateReviewMutation,
  useGetProductRatingQuery,
  useGetTopRankingsQuery,
} = ratingApiSlice;

