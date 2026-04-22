import { apiSlice } from '../store/apiSlice';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth';

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/token/',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<User, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/users/register/',
        method: 'POST',
        body: userData,
      }),
    }),
    // Додатковий ендпоінт для отримання даних профілю, якщо JWT не містить їх
    getProfile: builder.query<User, void>({
      query: () => '/auth/users/profile/', // Припустимо, ми додамо цей ендпоінт пізніше
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetProfileQuery } = authApiSlice;
