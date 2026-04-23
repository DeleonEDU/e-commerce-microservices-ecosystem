export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  brand?: string;
  description: string;
  price: number;
  category: number;
  category_name: string;
  image_url?: string;
  images?: string[];
  specifications?: Record<string, string>;
  stock: number;
  rating?: number;
  review_count?: number;
  seller_id: number;
  seller_name?: string;
  is_premium?: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface ProductFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  in_stock?: boolean;
  brand?: string;
  search?: string;
  ordering?: string;
  page?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface CreateReviewRequest {
  user_id: number;
  product_id: number;
  rating: number;
  comment?: string;
}

export interface CreateProductRequest {
  name: string;
  brand?: string;
  description: string;
  price: number;
  category_id: number;
  image_url?: string;
  stock: number;
  specifications?: Record<string, string>;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}
