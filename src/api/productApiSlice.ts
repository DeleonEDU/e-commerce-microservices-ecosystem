import { apiSlice } from '../store/apiSlice';
import { 
  Product, 
  Category, 
  ProductFilters, 
  PaginatedResponse, 
  CreateProductRequest,
  UpdateProductRequest
} from '../types/product';

function normalizeProduct(p: any): Product {
  return {
    ...p,
    price: typeof p?.price === 'number' ? p.price : Number(p?.price ?? 0),
    category: typeof p?.category === 'number' ? p.category : Number(p?.category ?? 0),
    category_name: p?.category_name ?? '',
  };
}

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<PaginatedResponse<Product>, ProductFilters>({
      query: (params) => ({
        url: '/products/',
        params,
      }),
      transformResponse: (response: any) => ({
        ...response,
        results: Array.isArray(response?.results) ? response.results.map(normalizeProduct) : [],
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    getSellerProducts: builder.query<PaginatedResponse<Product>, { page?: number, seller_id?: number }>({
      query: (params) => ({
        url: '/products/',
        params,
      }),
      transformResponse: (response: any) => ({
        ...response,
        results: Array.isArray(response?.results) ? response.results.map(normalizeProduct) : [],
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'SELLER_LIST' },
            ]
          : [{ type: 'Product', id: 'SELLER_LIST' }],
    }),
    getProduct: builder.query<Product, number>({
      query: (id) => `/products/${id}/`,
      transformResponse: (response: any) => normalizeProduct(response),
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    getCategories: builder.query<Category[], void>({
      query: () => '/categories/',
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (newProduct) => ({
        url: '/products/',
        method: 'POST',
        body: newProduct,
      }),
      transformResponse: (response: any) => normalizeProduct(response),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Product', id: 'SELLER_LIST' }],
    }),
    updateProduct: builder.mutation<Product, UpdateProductRequest>({
      query: ({ id, ...patch }) => ({
        url: `/products/${id}/`,
        method: 'PATCH',
        body: patch,
      }),
      transformResponse: (response: any) => normalizeProduct(response),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
        { type: 'Product', id: 'SELLER_LIST' },
      ],
    }),
    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({
        url: `/products/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Product', id: 'SELLER_LIST' }],
    }),
  }),
});

export const { 
  useGetProductsQuery, 
  useGetSellerProductsQuery,
  useGetProductQuery, 
  useGetCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation
} = productApiSlice;
