import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Loader2,
  Search,
  AlertCircle
} from 'lucide-react';
import { RootState } from '../store/store';
import { 
  useGetSellerProductsQuery, 
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation 
} from '../api/productApiSlice';
import { useGetSellerAnalyticsQuery, useApproveOrderItemMutation } from '../api/orderApiSlice';
import { useGetSubscriptionQuery, useUpgradeSubscriptionMutation } from '../api/subscriptionApiSlice';
import Button from '../components/ui/Button';
import ProductFormModal from '../components/ProductFormModal';
import { Product } from '../types/product';
import PaymentModal from '../components/PaymentModal';
import AlertModal, { AlertType } from '../components/ui/AlertModal';

const SellerDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'plus' | 'pro' | 'vip'>('plus');
  const [selectedAmount, setSelectedAmount] = useState(0);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: AlertType;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => {
    setAlertConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const { data: productsData, isLoading, isFetching } = useGetSellerProductsQuery(
    { page: 1, seller_id: user?.id },
    { skip: !user?.id }
  );
  
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useGetSellerAnalyticsQuery(user?.id ?? 0, {
    skip: !user?.id,
  });
  const [approveOrderItem] = useApproveOrderItemMutation();

  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null);

  const handleApproveSale = async (itemId: number) => {
    if (!user?.id) return;
    try {
      await approveOrderItem({ sellerId: user.id, itemId }).unwrap();
      showAlert('Успіх', 'Продаж успішно підтверджено', 'success');
    } catch (err) {
      showAlert('Помилка', 'Не вдалося підтвердити продаж', 'error');
    }
  };

  const { data: subscription } = useGetSubscriptionQuery(user?.id ?? 0, { skip: !user?.id });
  const [upgradeSubscription, { isLoading: isUpgrading }] = useUpgradeSubscriptionMutation();
  
  const isPremium = subscription?.tier === 'pro' || subscription?.tier === 'vip';
  const isPlusOrBetter = subscription?.tier === 'plus' || isPremium;

  const handleUpgradeClick = (tier: 'plus' | 'pro' | 'vip') => {
    const prices = { plus: 9.99, pro: 29.99, vip: 99.99 };
    setSelectedTier(tier);
    setSelectedAmount(prices[tier]);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      await upgradeSubscription({ userId: user?.id ?? 0, tier: selectedTier }).unwrap();
      setIsPaymentModalOpen(false);
      showAlert('Успіх', `Ви успішно активували ${selectedTier.toUpperCase()} підписку!`, 'success');
    } catch (err) {
      console.error(err);
      showAlert('Помилка', 'Помилка при активації підписки.', 'error');
    }
  };

  const limits = { free: 10, plus: 100, pro: 1000, vip: 1000000 };
  const currentTier = subscription?.tier || 'free';
  const maxProducts = limits[currentTier as keyof typeof limits] || 10;
  const currentProductCount = productsData?.count || 0;

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  if (!isAuthenticated || user?.role !== 'seller') {
    navigate('/');
    return null;
  }

  const handleCreateProduct = async (data: any) => {
    if (currentProductCount >= maxProducts) {
      showAlert('Ліміт вичерпано', `Ліміт товарів вичерпано (${maxProducts}). Оновіть підписку, щоб додавати більше товарів.`, 'error');
      return;
    }
    try {
      await createProduct(data).unwrap();
      setIsModalOpen(false);
      showAlert('Успіх', 'Товар успішно додано', 'success');
    } catch (err) {
      console.error('Failed to create product:', err);
      showAlert('Помилка', 'Не вдалося додати товар', 'error');
    }
  };

  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct) return;
    try {
      await updateProduct({ id: editingProduct.id, ...data }).unwrap();
      setIsModalOpen(false);
      setEditingProduct(undefined);
      showAlert('Успіх', 'Товар успішно оновлено', 'success');
    } catch (err) {
      console.error('Failed to update product:', err);
      showAlert('Помилка', 'Не вдалося оновити товар', 'error');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    showAlert(
      'Видалення товару', 
      'Ви впевнені, що хочете видалити цей товар?', 
      'error',
      async () => {
        try {
          await deleteProduct(id).unwrap();
          showAlert('Успіх', 'Товар успішно видалено', 'success');
        } catch (err) {
          console.error('Failed to delete product:', err);
          showAlert('Помилка', 'Не вдалося видалити товар', 'error');
        }
      }
    );
  };

  const filteredProducts = productsData?.results?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const ratedProducts =
    productsData?.results?.filter((p) => p.rating != null && p.rating > 0) ?? [];
  const avgStoreRating =
    ratedProducts.length > 0
      ? (ratedProducts.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedProducts.length).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-slate-50/50 pt-12 pb-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-widest mb-4">
              Панель продавця
            </div>
            {currentTier !== 'free' && (
               <div className="inline-flex items-center gap-2 px-3 py-1 ml-2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest mb-4">
                 {currentTier.toUpperCase()} SELLER
               </div>
            )}
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Мій магазин</h1>
            <p className="text-slate-500 font-medium">Керуйте своїми товарами та відстежуйте продажі</p>
          </div>
          <Button 
            size="lg" 
            className="shadow-soft gap-2 px-8"
            onClick={() => {
              if (currentProductCount >= maxProducts) {
                showAlert('Ліміт вичерпано', `Ліміт товарів вичерпано (${maxProducts}). Оновіть підписку, щоб додавати більше товарів.`, 'error');
              } else {
                setEditingProduct(undefined);
                setIsModalOpen(true);
              }
            }}
          >
            <Plus size={20} />
            Додати товар ({currentProductCount}/{maxProducts === 1000000 ? '∞' : maxProducts})
          </Button>
        </div>

        {/* Subscription Tiers (if not fully maxed out) */}
        {currentTier !== 'vip' && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-[32px] p-8 text-white shadow-soft mb-12 flex flex-col lg:flex-row items-center justify-between gap-8 border border-slate-800">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest mb-4">
                Підвищення плану
              </div>
              <h3 className="text-3xl font-extrabold mb-3">Розширте можливості магазину</h3>
              <p className="text-slate-300 mb-6 text-sm max-w-xl leading-relaxed">
                Ваш поточний план <span className="text-white font-bold">{currentTier.toUpperCase()}</span> дозволяє додати до <span className="text-white font-bold">{maxProducts}</span> товарів. 
                Оберіть преміум-підписку для збільшення лімітів, розширеної аналітики та пріоритетного розміщення у каталозі.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="font-bold text-white mb-1">Plus (Безкоштовно)</div>
                  <div className="text-slate-400 text-xs">До 100 товарів, базова підтримка</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="font-bold text-amber-400 mb-1">Pro ($29.99/міс)</div>
                  <div className="text-slate-400 text-xs">До 1000 товарів, Premium бейдж, аналітика</div>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="font-bold text-indigo-400 mb-1">VIP ($99.99/міс)</div>
                  <div className="text-slate-400 text-xs">Безліміт товарів, топ-розміщення, менеджер</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0">
              {currentTier === 'free' && (
                <Button onClick={() => handleUpgradeClick('plus')} disabled={isUpgrading} className="w-full bg-white text-slate-900 hover:bg-slate-100">
                  Активувати PLUS (Безкоштовно)
                </Button>
              )}
              {(currentTier === 'free' || currentTier === 'plus') && (
                <Button onClick={() => handleUpgradeClick('pro')} className="w-full bg-amber-500 hover:bg-amber-600 text-white border-none shadow-[0_0_20px_rgba(245,158,11,0.3)]" disabled={isUpgrading}>
                  Оновити до PRO
                </Button>
              )}
              <Button onClick={() => handleUpgradeClick('vip')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-[0_0_20px_rgba(79,70,229,0.3)]" disabled={isUpgrading}>
                 Оновити до VIP
              </Button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative">
          {!isPlusOrBetter && (
             <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm rounded-[32px] flex flex-col items-center justify-center">
               <AlertCircle className="text-slate-400 mb-2" size={32} />
               <p className="font-bold text-slate-800">Статистика доступна від плану PLUS</p>
               <Button size="sm" className="mt-4" onClick={() => handleUpgradeClick('plus')}>Отримати PLUS</Button>
             </div>
          )}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft group hover:border-brand-100 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{productsData?.count || 0}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Товарів в продажу</div>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft group hover:border-emerald-100 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">
              {isLoadingAnalytics ? '...' : (analyticsData?.total_sales || 0)}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Продажів за місяць</div>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft group hover:border-amber-100 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">
              ${isLoadingAnalytics ? '...' : (analyticsData?.total_revenue?.toFixed(2) || '0.00')}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Загальний дохід</div>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft group hover:border-indigo-100 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{avgStoreRating ?? '—'}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Рейтинг магазину</div>
          </div>
        </div>

        {/* Recent Sales Section */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-soft overflow-hidden mb-12">
          <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Необроблені продажі</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Замовлення</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Товару</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">К-сть</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Сума</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Статус</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoadingAnalytics ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      <p className="text-xs font-bold uppercase">Завантаження...</p>
                    </td>
                  </tr>
                ) : !analyticsData?.recent_sales?.length ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                      <p className="font-medium">Немає недавніх продажів</p>
                    </td>
                  </tr>
                ) : (
                  analyticsData.recent_sales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedSaleDetails(sale)}>
                      <td className="px-8 py-5 font-bold text-slate-900">#{sale.id}</td>
                      <td className="px-8 py-5 font-medium text-slate-600">Товар #{sale.product_id}</td>
                      <td className="px-8 py-5 font-bold text-slate-900">{sale.quantity} шт.</td>
                      <td className="px-8 py-5 font-extrabold text-slate-900">${(sale.price * sale.quantity).toFixed(2)}</td>
                      <td className="px-8 py-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${sale.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {sale.is_approved ? 'Підтверджено' : 'Очікує'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {!sale.is_approved && (
                          <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleApproveSale(sale.id);
                          }}>
                            Підтвердити
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Products Table Section */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Мої товари</h3>
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Пошук по товарах..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Товар</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Категорія</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ціна</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Залишок</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Рейтинг</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center justify-center opacity-50">
                        <Loader2 className="animate-spin text-brand-600 mb-4" size={32} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Завантаження...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center justify-center opacity-50">
                        <AlertCircle className="text-slate-200 mb-4" size={48} />
                        <p className="text-lg font-bold text-slate-900 mb-1">Товарів не знайдено</p>
                        <p className="text-sm text-slate-400">Спробуйте змінити пошуковий запит або додайте новий товар.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
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
                      <td className="px-8 py-6">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                          {product.category_name}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-extrabold text-slate-900">${product.price.toFixed(2)}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`text-sm font-bold ${product.stock < 10 ? 'text-rose-500' : 'text-slate-600'}`}>
                          {product.stock} шт.
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <TrendingUp size={14} className="text-emerald-500" />
                          {product.rating || '0.0'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-9 px-3 text-xs font-bold gap-1.5 border-slate-200"
                            onClick={() => {
                              setEditingProduct(product);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit2 size={14} />
                            Редагувати
                          </Button>
                          <Link
                            to={`/product/${product.id}`}
                            target="_blank"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors"
                            title="У новій вкладці"
                          >
                            <ExternalLink size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-colors"
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

      {/* Product Form Modal */}
      <ProductFormModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(undefined);
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        product={editingProduct}
        isLoading={isCreating || isUpdating}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        tier={selectedTier}
        amount={selectedAmount}
      />
      <AlertModal 
        {...alertConfig} 
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} 
      />

      {/* Order Details Modal for Seller */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedSaleDetails(null)} />
          <div className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-fade-in text-left">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Деталі продажу #{selectedSaleDetails.id}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Інформація про товар</h4>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">ID Товару:</span>
                  <span className="font-bold text-slate-900">{selectedSaleDetails.product_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Кількість:</span>
                  <span className="font-bold text-slate-900">{selectedSaleDetails.quantity} шт.</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600">Ціна за одиницю:</span>
                  <span className="font-bold text-slate-900">${selectedSaleDetails.price.toFixed(2)}</span>
                </div>
              </div>

              {selectedSaleDetails.order && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Дані доставки</h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-slate-900">{selectedSaleDetails.order.full_name || 'Не вказано'}</p>
                    <p className="text-slate-600">{selectedSaleDetails.order.address || 'Не вказана адреса'}</p>
                    <p className="text-slate-600">{selectedSaleDetails.order.city || 'Не вказане місто'}, {selectedSaleDetails.order.zip_code || ''}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setSelectedSaleDetails(null)}>Закрити</Button>
              {!selectedSaleDetails.is_approved && (
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    handleApproveSale(selectedSaleDetails.id);
                    setSelectedSaleDetails(null);
                  }}
                >
                  Підтвердити
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboardPage;
