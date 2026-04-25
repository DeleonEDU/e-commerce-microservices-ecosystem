import React from 'react';
import { useGetProductQuery } from '../api/productApiSlice';

interface TableRowProductProps {
  productId: number;
}

const TableRowProduct: React.FC<TableRowProductProps> = ({ productId }) => {
  const { data: product, isLoading } = useGetProductQuery(productId, {
    skip: !productId,
  });

  if (isLoading) {
    return <span className="text-slate-400 animate-pulse">Завантаження...</span>;
  }

  return (
    <div className="flex items-center gap-3">
      {product?.image_url ? (
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="w-8 h-8 object-cover rounded-lg shadow-sm border border-slate-200"
        />
      ) : (
        <div className="w-8 h-8 bg-slate-100 rounded-lg border border-slate-200" />
      )}
      <span className="font-medium text-slate-900 line-clamp-1 max-w-[150px]" title={product?.name || `Товар #${productId}`}>
        {product?.name || `Товар #${productId}`}
      </span>
    </div>
  );
};

export default React.memo(TableRowProduct);
