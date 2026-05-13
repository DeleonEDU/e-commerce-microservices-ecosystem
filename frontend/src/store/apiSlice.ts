import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// У dev (Vite) запити йдуть на той самий origin → proxy у vite.config.ts на gateway.
// У production / preview — повний URL на шлюз (порт 80 на хості).
// Перевизначення: VITE_API_BASE=https://api.example.com (без завершального слеша)
const rawBase = (import.meta as any).env.VITE_API_BASE?.replace(/\/$/, '');
const API_URL = rawBase ?? ((import.meta as any).env.DEV ? '/api' : 'http://localhost/api');

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Тут ми будемо додавати JWT токен з Redux стану
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Product', 'Order', 'User', 'Cart', 'Review', 'Subscription', 'SellerAnalytics'],
  endpoints: (builder) => ({}),
});
