import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Package } from 'lucide-react';
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
    <div className={`group rounded-3xl border overflow-hidden transition-all duration-500 ${product.stock === 0 ? 'opacity-60 grayscale-[50%]' : 'hover:shadow-card hover:-translate-y-2'} ${product.is_premium ? 'bg-amber-50/10 border-amber-200' : 'bg-white border-slate-100'}`}>
      {/* Image Section */}
      <Link to={`/product/${product.id}`} className="block aspect-[4/5] bg-slate-50 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
            <Package size={64} className="text-slate-200" />
          </div>
        )}
        
        {/* Quick Action Overlay */}
        {product.stock > 0 && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full bg-white/90 backdrop-blur-sm shadow-soft"
              onClick={handleAddToCart}
            >
              <ShoppingCart size={18} className="text-slate-700" />
            </Button>
          </div>
        )}

        {/* Premium Badge */}
        {product.is_premium && (
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider shadow-soft flex items-center gap-1">
              <Star size={12} fill="currentColor" />
              Top
            </span>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-soft">
            {product.category_name}
          </span>
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center text-amber-400">
            <Star size={14} fill="currentColor" />
          </div>
          <span className="text-xs font-bold text-slate-400">{product.rating || '4.5'}</span>
          <span className="text-xs text-slate-300">({product.review_count || '12'})</span>
        </div>

        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors line-clamp-1 text-lg">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        
        <div className="flex justify-between items-center pt-5 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Ціна</span>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">${product.price.toFixed(2)}</span>
          </div>
          {product.stock > 0 ? (
            <Button size="sm" className="rounded-xl px-5 shadow-soft" onClick={handleAddToCart}>Додати в кошик</Button>
          ) : (
            <div className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest rounded-xl">Немає в наявності</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
