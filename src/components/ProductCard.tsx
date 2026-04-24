import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Package, Plus } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { Product } from '../types/product';
import Button from './ui/Button';
import { addItem } from '../features/cart/cartSlice';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addItem(product));
  };

  return (
    <div className={`group rounded-[24px] border overflow-hidden transition-all duration-300 ${product.stock === 0 ? 'opacity-60 grayscale-[50%]' : 'hover:shadow-lg hover:-translate-y-1'} ${product.is_premium ? 'bg-amber-50/10 border-amber-200' : 'bg-white border-slate-100'}`}>
      {/* Image Section */}
      <Link to={`/product/${product.id}`} className="block aspect-square bg-slate-50 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <Package size={48} className="text-slate-200" />
          </div>
        )}
        
        {/* Quick Action Overlay */}
        {product.stock > 0 && (
          <div className="absolute bottom-3 right-3 z-20">
            <button 
              className="h-10 w-10 flex items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors"
              onClick={handleAddToCart}
              title="Додати в кошик"
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        )}

        {/* Premium Badge */}
        {product.is_premium && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Star size={10} fill="currentColor" />
              Top
            </span>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
            {product.category_name}
          </span>
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex items-center text-amber-400">
            <Star size={12} fill="currentColor" />
          </div>
          <span className="text-[11px] font-bold text-slate-500">{product.rating || '4.5'}</span>
          <span className="text-[11px] text-slate-400">({product.review_count || '12'})</span>
        </div>

        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors line-clamp-2 text-sm leading-snug h-10">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex justify-between items-end mt-3">
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-slate-900 tracking-tight">${product.price.toFixed(2)}</span>
          </div>
          {product.stock === 0 && (
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-50 px-2 py-1 rounded-lg">Немає</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
