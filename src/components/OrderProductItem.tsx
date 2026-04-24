import React from 'react';
import { Package, CheckCircle2, Clock } from 'lucide-react';
import { useGetProductQuery } from '../api/productApiSlice';

interface OrderProductItemProps {
  productId: number;
  quantity: number;
  price: number;
  isApproved?: boolean;
  isDelivered?: boolean;
  orderStatus?: string;
}

const OrderProductItem: React.FC<OrderProductItemProps> = ({ productId, quantity, price, isApproved, isDelivered, orderStatus }) => {
  const { data: product, isLoading } = useGetProductQuery(productId);

  return (
    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="w-12 h-12 bg-slate-200 animate-pulse rounded-xl" />
        ) : product?.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-12 h-12 object-cover rounded-xl shadow-sm border border-slate-200"
          />
        ) : (
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
            <Package size={20} />
          </div>
        )}
        
        <div>
          {isLoading ? (
            <div className="h-4 w-32 bg-slate-200 animate-pulse rounded mb-2" />
          ) : (
            <p className="text-sm font-bold text-slate-900 line-clamp-1">{product?.name || `Товар #${productId}`}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs font-medium text-slate-500">
              {quantity} шт. × ${price.toFixed(2)}
            </p>
            {isDelivered !== undefined && isApproved !== undefined && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                isDelivered ? 'bg-emerald-100 text-emerald-700' : 
                isApproved ? 'bg-indigo-100 text-indigo-700' : 
                orderStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-sky-100 text-sky-700'
              }`}>
                {isDelivered ? <CheckCircle2 size={10} /> : isApproved ? <Package size={10} /> : <Clock size={10} />}
                {isDelivered ? 'Доставлено' : isApproved ? 'Комплектується' : orderStatus === 'pending' ? 'Очікує оплати' : 'Оплачено'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="font-extrabold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
        ${(price * quantity).toFixed(2)}
      </div>
    </div>
  );
};

export default OrderProductItem;
