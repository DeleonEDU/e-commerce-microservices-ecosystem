export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface ReviewCreateRequest {
  user_id: number;
  product_id: number;
  rating: number;
  comment?: string;
}

export interface ProductRating {
  product_id: number;
  average_rating: number;
  review_count: number;
}

export interface RankedProduct {
  product_id: number;
  score: number;
}

