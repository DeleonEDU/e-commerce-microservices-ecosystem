import React, { useState, useMemo } from 'react';
import { X, Search, Filter, ArrowUpDown, Package, CheckCircle2, Clock, Map, TrendingUp } from 'lucide-react';
import Button from './ui/Button';
import TableRowProduct from './TableRowProduct';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface SalesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: any[];
  onApprove: (id: number) => void;
  onDeliver: (id: number) => void;
  onViewDetails: (sale: any) => void;
}

type SortField = 'date' | 'price' | 'status';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'pending' | 'processing' | 'delivered';

const SalesManagementModal: React.FC<SalesManagementModalProps> = ({
  isOpen,
  onClose,
  sales,
  onApprove,
  onDeliver,
  onViewDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedSales = useMemo(() => {
    let result = [...sales];

    // Filter by search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (sale) =>
          sale.id.toString().includes(lowerSearch) ||
          sale.order?.full_name?.toLowerCase().includes(lowerSearch) ||
          sale.order?.city?.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((sale) => {
        if (filterStatus === 'pending') return !sale.is_approved && !sale.is_delivered;
        if (filterStatus === 'processing') return sale.is_approved && !sale.is_delivered;
        if (filterStatus === 'delivered') return sale.is_delivered;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortField === 'price') {
        const priceA = a.price * a.quantity;
        const priceB = b.price * b.quantity;
        comparison = priceA - priceB;
      } else if (sortField === 'status') {
        const statusScore = (sale: any) => {
          if (sale.is_delivered) return 3;
          if (sale.is_approved) return 2;
          return 1;
        };
        comparison = statusScore(a) - statusScore(b);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [sales, searchTerm, filterStatus, sortField, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 bg-white z-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Управління замовленнями</h2>
            <p className="text-slate-500 font-medium mt-1">Переглядайте, сортуйте та керуйте всіма продажами</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters & Controls */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-center z-10">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button 
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              Всі замовлення
            </button>
            <button 
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-100'}`}
            >
              <Clock size={16} /> Нові
            </button>
            <button 
              onClick={() => setFilterStatus('processing')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filterStatus === 'processing' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'}`}
            >
              <Package size={16} /> Комплектуються
            </button>
            <button 
              onClick={() => setFilterStatus('delivered')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${filterStatus === 'delivered' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-100'}`}
            >
              <CheckCircle2 size={16} /> Доставлені
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Пошук (ID, Ім'я, Місто)..."
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
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-2">
                        Дата {sortField === 'date' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Товар</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Покупець</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('price')}>
                      <div className="flex items-center gap-2 justify-end">
                        Сума {sortField === 'price' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-2 justify-center">
                        Статус {sortField === 'status' && <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAndSortedSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Search className="mb-4 opacity-30" size={48} />
                          <p className="text-lg font-bold text-slate-900 mb-1">Нічого не знайдено</p>
                          <p className="text-sm">Спробуйте змінити фільтри або пошуковий запит.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-slate-900">
                            {sale.date ? format(new Date(sale.date), 'dd MMM yyyy', { locale: uk }) : '—'}
                          </div>
                          <div className="text-xs font-medium text-slate-400">
                            {sale.date ? format(new Date(sale.date), 'HH:mm', { locale: uk }) : '—'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-300 mt-1 uppercase">#{sale.id}</div>
                        </td>
                        <td className="px-6 py-5">
                          <TableRowProduct productId={sale.product_id} />
                          <div className="text-xs font-bold text-slate-500 mt-2">{sale.quantity} шт. × ${sale.price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-slate-900">{sale.order?.full_name || 'Не вказано'}</div>
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                            <Map size={12} /> {sale.order?.city || 'Місто не вказане'}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-base font-extrabold text-brand-600">${(sale.price * sale.quantity).toFixed(2)}</div>
                          {sale.order?.status === 'paid' || sale.order?.status === 'shipped' || sale.order?.status === 'delivered' ? (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                              <CheckCircle2 size={10} /> Оплачено
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
                              <Clock size={10} /> Очікує оплати
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                            sale.is_delivered ? 'bg-emerald-50 text-emerald-600' : 
                            sale.is_approved ? 'bg-indigo-50 text-indigo-600' : 
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {sale.is_delivered ? <CheckCircle2 size={14} /> : sale.is_approved ? <Package size={14} /> : <Clock size={14} />}
                            {sale.is_delivered ? 'Доставлено' : sale.is_approved ? 'Комплектується' : 'Нове'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-center justify-center gap-2">
                            {!sale.is_approved ? (
                              <Button size="sm" className="w-full text-xs shadow-sm" onClick={() => onApprove(sale.id)}>
                                Підтвердити
                              </Button>
                            ) : !sale.is_delivered ? (
                              <Button size="sm" variant="outline" className="w-full text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => onDeliver(sale.id)}>
                                Доставити
                              </Button>
                            ) : (
                              <div className="w-full text-center text-xs font-bold text-slate-400 py-2">
                                Завершено
                              </div>
                            )}
                            <button 
                              onClick={() => onViewDetails(sale)}
                              className="text-xs font-bold text-slate-400 hover:text-brand-600 underline underline-offset-4 transition-colors"
                            >
                              Деталі
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

export default SalesManagementModal;
