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
  const imageUrl = typeof p?.image_url === 'string' ? p.image_url.trim() : '';
  const rawImages = Array.isArray(p?.images) ? p.images : [];
  const normalizedImages = rawImages
    .map((img: unknown) => (typeof img === 'string' ? img.trim() : ''))
    .filter(Boolean);
  const images = imageUrl
    ? [imageUrl, ...normalizedImages.filter((img: string) => img !== imageUrl)]
    : normalizedImages;

  return {
    ...p,
    price: typeof p?.price === 'number' ? p.price : Number(p?.price ?? 0),
    category: typeof p?.category === 'number' ? p.category : Number(p?.category ?? 0),
    category_name: p?.category_name ?? '',
    image_url: imageUrl || undefined,
    images,
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
    getSellerProducts: builder.query<PaginatedResponse<Product>, { page?: number, seller_id?: number, search?: string, ordering?: string, stock_filter?: string, category_name?: string }>({
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
    getBulkProducts: builder.query<Array<Pick<Product, 'id' | 'price' | 'stock' | 'seller_id' | 'name' | 'image_url'>>, number[]>({
      query: (productIds) => ({
        url: '/products/bulk/',
        method: 'POST',
        body: { product_ids: productIds },
      }),
      transformResponse: (response: any) =>
        Array.isArray(response)
          ? response.map((p) => ({
              ...p,
              id: Number(p?.id ?? 0),
              price: Number(p?.price ?? 0),
              stock: Number(p?.stock ?? 0),
              seller_id: Number(p?.seller_id ?? 0),
              name: typeof p?.name === 'string' ? p.name : `Товар #${p?.id ?? ''}`,
              image_url: typeof p?.image_url === 'string' ? p.image_url.trim() : '',
            }))
          : [],
      providesTags: (result) =>
        result?.length
          ? result.map(({ id }) => ({ type: 'Product' as const, id }))
          : [{ type: 'Product' as const, id: 'LIST' }],
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
  useGetBulkProductsQuery,
  useGetCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation
} = productApiSlice;
