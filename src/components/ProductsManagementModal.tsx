import React, { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown, Package, Edit2, Trash2, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import { Product } from '../types/product';
import { Link } from 'react-router-dom';

interface ProductsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onAddNew: () => void;
}

type SortField = 'name' | 'price' | 'stock' | 'rating';
type SortOrder = 'asc' | 'desc';
type FilterStock = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const ProductsManagementModal: React.FC<ProductsManagementModalProps> = ({
  isOpen,
  onClose,
  products,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState<FilterStock>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Filter by search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          (p.brand && p.brand.toLowerCase().includes(lowerSearch)) ||
          p.category_name?.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter by stock
    if (filterStock !== 'all') {
      result = result.filter((p) => {
        if (filterStock === 'in_stock') return p.stock > 10;
        if (filterStock === 'low_stock') return p.stock > 0 && p.stock <= 10;
        if (filterStock === 'out_of_stock') return p.stock === 0;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'stock') {
        comparison = a.stock - b.stock;
      } else if (sortField === 'rating') {
        comparison = (a.rating || 0) - (b.rating || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, searchTerm, filterStock, sortField, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-white z-10 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Мої товари</h2>
            <p className="text-slate-500 font-medium mt-1">Керуйте асортиментом, цінами та залишками</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onAddNew} className="shadow-soft whitespace-nowrap">
              Додати товар
            </Button>
            <button 
              onClick={onClose}
              className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-center z-10">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button 
              onClick={() => setFilterStock('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterStock === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              Всі товари
            </button>
            <button 
              onClick={() => setFilterStock('in_stock')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filterStock === 'in_stock' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-100'}`}
            >
              В наявності
            </button>
            <button 
              onClick={() => setFilterStock('low_stock')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filterStock === 'low_stock' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-100'}`}
            >
              Закінчується
            </button>
            <button 
              onClick={() => setFilterStock('out_of_stock')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filterStock === 'out_of_stock' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-white text-rose-600 hover:bg-rose-50 border border-rose-100'}`}
            >
              Немає в наявності
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Пошук (назва, бренд, категорія)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-sm shadow-sm hover:border-slate-300"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 sm:p-8 no-scrollbar">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-2">
                        Товар {sortField === 'name' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Категорія</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('price')}>
                      <div className="flex items-center gap-2">
                        Ціна {sortField === 'price' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('stock')}>
                      <div className="flex items-center gap-2">
                        Залишок {sortField === 'stock' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('rating')}>
                      <div className="flex items-center gap-2">
                        Рейтинг {sortField === 'rating' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAndSortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <AlertCircle className="mb-4 opacity-30" size={48} />
                          <p className="text-lg font-bold text-slate-900 mb-1">Товарів не знайдено</p>
                          <p className="text-sm">Спробуйте змінити фільтри або додайте новий товар.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 flex-shrink-0">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{product.name}</div>
                              <div className="text-xs text-slate-400 font-medium">{product.brand || 'Без бренду'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                            {product.category_name || 'Без категорії'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-extrabold text-slate-900">${product.price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            product.stock === 0 ? 'bg-rose-50 text-rose-600' : 
                            product.stock <= 10 ? 'bg-amber-50 text-amber-600' : 
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {product.stock} шт.
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <TrendingUp size={14} className={product.rating && product.rating >= 4 ? 'text-emerald-500' : 'text-amber-500'} />
                            {product.rating || '0.0'}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-9 px-3 text-xs font-bold gap-1.5 border-slate-200 shadow-sm"
                              onClick={() => onEdit(product)}
                            >
                              <Edit2 size={14} />
                              Редагувати
                            </Button>
                            <Link
                              to={`/product/${product.id}`}
                              target="_blank"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors shadow-sm bg-white"
                              title="У новій вкладці"
                            >
                              <ExternalLink size={16} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => onDelete(product.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors shadow-sm bg-white"
                              title="Видалити"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsManagementModal;
