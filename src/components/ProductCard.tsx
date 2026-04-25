import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Package, Heart } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Product } from '../types/product';
import { formatCurrency } from '../utils/format';
import { addItem } from '../features/cart/cartSlice';
import { toggleFavorite } from '../features/favorites/favoritesSlice';
import { RootState } from '../store/store';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const dispatch = useDispatch();
  const favorites = useSelector((state: RootState) => state.favorites.items);
  const isFavorite = favorites.some(item => item.id === product.id);
  const productRating = product.rating ?? 0;
  const productReviewCount = product.review_count ?? 0;
  
  const primaryImage = product.image_url?.trim();
  const fallbackImages = (product.images || []).filter((img): img is string => Boolean(img?.trim()));
  const catalogImage = primaryImage || fallbackImages[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addItem(product));
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleFavorite(product));
  };

  return (
    <div className={`group rounded-[24px] border overflow-hidden transition-all duration-300 flex flex-col h-full ${product.stock === 0 ? 'opacity-60 grayscale-[50%]' : 'hover:shadow-lg hover:-translate-y-1'} ${product.is_premium ? 'bg-amber-50/10 border-amber-200' : 'bg-white border-slate-100'}`}>
      {/* Image Section */}
      <Link to={`/product/${product.id}`} className="block aspect-square bg-slate-50 relative overflow-hidden">
        {catalogImage ? (
          <img
            src={catalogImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <Package size={48} className="text-slate-200" />
          </div>
        )}
        {/* Premium Badge */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
          {product.is_premium && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Star size={10} fill="currentColor" />
              Top
            </span>
          )}
          <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
            {product.category_name}
          </span>
        </div>

        {/* Favorite Button */}
        <button 
          className={`absolute top-3 right-3 z-10 p-2 rounded-xl backdrop-blur-md shadow-sm transition-all ${isFavorite ? 'bg-rose-50 text-rose-500' : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
          onClick={handleToggleFavorite}
          title={isFavorite ? "Видалити з обраного" : "Додати в обране"}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </Link>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex items-center text-amber-400">
            <Star size={12} fill="currentColor" />
          </div>
          <span className="text-[11px] font-bold text-slate-500">{productRating.toFixed(1)}</span>
          <span className="text-[11px] text-slate-400">({productReviewCount})</span>
        </div>

        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors line-clamp-2 text-sm leading-snug h-10">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex justify-between items-end mt-auto pt-3">
          <div className="flex flex-col">
            {product.discount_price ? (
              <>
                <span className="text-xs text-slate-400 line-through font-medium">{formatCurrency(product.price)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-rose-600 tracking-tight">{formatCurrency(product.discount_price)}</span>
                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-extrabold rounded-md">
                    -{Math.round((1 - product.discount_price / product.price) * 100)}%
                  </span>
                </div>
              </>
            ) : (
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">{formatCurrency(product.price)}</span>
            )}
          </div>
          {product.stock === 0 ? (
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-50 px-2 py-1 rounded-lg">Немає</span>
          ) : (
            <button 
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white transition-colors"
              onClick={handleAddToCart}
              title="Додати в кошик"
            >
              <ShoppingCart size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
