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
  AlertCircle,
  Star,
  CheckCircle2,
  Clock,
  Map,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { RootState } from '../store/store';
import { 
  useGetSellerProductsQuery, 
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation 
} from '../api/productApiSlice';
import { useGetSellerAnalyticsQuery, useApproveOrderItemMutation, useDeliverOrderItemMutation } from '../api/orderApiSlice';
import { useGetSubscriptionQuery, useUpgradeSubscriptionMutation } from '../api/subscriptionApiSlice';
import { useConfirmPaymentMutation } from '../api/paymentApiSlice';
import Button from '../components/ui/Button';
import ProductFormModal from '../components/ProductFormModal';
import { Product } from '../types/product';
import PaymentModal from '../components/PaymentModal';
import AlertModal, { AlertType } from '../components/ui/AlertModal';

import TableRowProduct from '../components/TableRowProduct';
import SellerAnalyticsCharts from '../components/SellerAnalyticsCharts';
import SalesManagementModal from '../components/SalesManagementModal';
import ProductsManagementModal from '../components/ProductsManagementModal';

const SellerDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
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
  const [deliverOrderItem] = useDeliverOrderItemMutation();

  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null);

  const handleApproveSale = async (itemId: number) => {
    if (!user?.id) return;
    try {
      await approveOrderItem({ sellerId: user.id, itemId }).unwrap();
      showAlert('Успіх', 'Продаж успішно підтверджено (комплектується)', 'success');
    } catch (err) {
      showAlert('Помилка', 'Не вдалося підтвердити продаж', 'error');
    }
  };

  const handleDeliverSale = async (itemId: number) => {
    if (!user?.id) return;
    try {
      await deliverOrderItem({ sellerId: user.id, itemId }).unwrap();
      showAlert('Успіх', 'Товар успішно відмічено як доставлений', 'success');
    } catch (err) {
      showAlert('Помилка', 'Не вдалося відмітити як доставлений', 'error');
    }
  };

  const { data: subscription } = useGetSubscriptionQuery(user?.id ?? 0, { skip: !user?.id });
  const [upgradeSubscription, { isLoading: isUpgrading }] = useUpgradeSubscriptionMutation();
  const [confirmPayment] = useConfirmPaymentMutation();
  
  const isPremium = subscription?.tier === 'pro' || subscription?.tier === 'vip';
  const isPlusOrBetter = subscription?.tier === 'plus' || isPremium;

  const handleUpgradeClick = (tier: 'plus' | 'pro' | 'vip') => {
    const prices = { plus: 0, pro: 29.99, vip: 99.99 };
    
    if (tier === 'plus') {
      // Plus is free, upgrade directly
      upgradeSubscription({ userId: user?.id ?? 0, tier: 'plus' })
        .unwrap()
        .then(() => showAlert('Успіх', 'Ви успішно активували план PLUS!', 'success'))
        .catch(() => showAlert('Помилка', 'Помилка при активації підписки.', 'error'));
      return;
    }

    setSelectedTier(tier);
    setSelectedAmount(prices[tier]);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      await confirmPayment({ payment_intent_id: paymentIntentId }).unwrap();
      setIsPaymentModalOpen(false);
      showAlert('Успіх', `Оплату підписки ${selectedTier.toUpperCase()} прийнято! Вона активована.`, 'success');
    } catch (e) {
      console.error('Failed to confirm payment:', e);
      setIsPaymentModalOpen(false);
      showAlert('Увага', `Оплату прийнято, але виникла помилка при активації. Будь ласка, зачекайте.`, 'warning');
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
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Оберіть свій план</h3>
                <p className="text-slate-500 font-medium mt-1">
                  Ваш поточний план: <span className="font-bold text-brand-600 uppercase">{currentTier}</span> ({maxProducts} товарів)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plus Plan */}
              <div 
                className={`relative bg-white rounded-[32px] p-8 border-2 transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${currentTier === 'free' ? 'border-slate-200 hover:border-brand-300 hover:shadow-xl' : 'border-slate-100 opacity-60 pointer-events-none'}`}
                onClick={() => currentTier === 'free' && handleUpgradeClick('plus')}
              >
                <div className="mb-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package size={24} className="text-slate-600" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900">Plus</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-slate-900">Безкоштовно</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 text-sm font-medium text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> До 100 товарів</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Базова підтримка</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Стандартна аналітика</li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={currentTier !== 'free' || isUpgrading}
                >
                  {currentTier === 'free' ? 'Активувати Plus' : 'Поточний або нижчий план'}
                </Button>
              </div>

              {/* Pro Plan */}
              <div 
                className={`relative bg-gradient-to-b from-amber-50 to-white rounded-[32px] p-8 border-2 transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${(currentTier === 'free' || currentTier === 'plus') ? 'border-amber-200 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10' : 'border-slate-100 opacity-60 pointer-events-none'}`}
                onClick={() => (currentTier === 'free' || currentTier === 'plus') && handleUpgradeClick('pro')}
              >
                <div className="absolute top-0 right-8 -translate-y-1/2">
                  <span className="bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">Популярний</span>
                </div>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Star size={24} className="text-amber-600" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900">Pro</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-slate-900">$29.99</span>
                    <span className="text-slate-500 font-medium">/міс</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 text-sm font-medium text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-500" /> До 1000 товарів</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-500" /> Premium бейдж</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-500" /> Розширена аналітика</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-500" /> Пріоритетна підтримка</li>
                </ul>
                <Button 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white border-none shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                  disabled={!(currentTier === 'free' || currentTier === 'plus') || isUpgrading}
                >
                  {(currentTier === 'free' || currentTier === 'plus') ? 'Оновити до Pro' : 'Поточний або нижчий план'}
                </Button>
              </div>

              {/* VIP Plan */}
              <div 
                className="relative bg-gradient-to-b from-indigo-900 to-slate-900 rounded-[32px] p-8 border-2 border-indigo-500/30 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20"
                onClick={() => handleUpgradeClick('vip')}
              >
                <div className="mb-6">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-indigo-500/30">
                    <TrendingUp size={24} className="text-indigo-400" />
                  </div>
                  <h4 className="text-xl font-extrabold text-white">VIP</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-white">$99.99</span>
                    <span className="text-indigo-200 font-medium">/міс</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 text-sm font-medium text-indigo-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400" /> Безліміт товарів</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400" /> Топ-розміщення в каталозі</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400" /> Персональний менеджер</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400" /> API доступ</li>
                </ul>
                <Button 
                  className="w-full bg-indigo-500 hover:bg-indigo-400 text-white border-none shadow-[0_0_20px_rgba(99,102,241,0.4)]" 
                  disabled={isUpgrading}
                >
                  Оновити до VIP
                </Button>
              </div>
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

        {/* Analytics Charts */}
        <SellerAnalyticsCharts 
          data={analyticsData} 
          tier={currentTier} 
          onUpgrade={handleUpgradeClick} 
        />

        {/* Recent Sales Section */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-soft overflow-hidden mb-12">
          <div className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Управління замовленнями</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Опрацьовуйте нові продажі та відстежуйте доставку</p>
            </div>
            <Button 
              className="shadow-soft"
              onClick={() => setIsSalesModalOpen(true)}
            >
              Відкрити всі замовлення
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-100 border-t border-slate-100">
            <div className="bg-white p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsSalesModalOpen(true)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <span className="font-bold text-slate-900">Нові</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {analyticsData?.recent_sales?.filter((s: any) => !s.is_approved && !s.is_delivered).length || 0}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Очікують підтвердження</div>
            </div>
            
            <div className="bg-white p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsSalesModalOpen(true)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Package size={16} />
                </div>
                <span className="font-bold text-slate-900">В процесі</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {analyticsData?.recent_sales?.filter((s: any) => s.is_approved && !s.is_delivered).length || 0}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Комплектуються</div>
            </div>
            
            <div className="bg-white p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsSalesModalOpen(true)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <span className="font-bold text-slate-900">Завершені</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {analyticsData?.recent_sales?.filter((s: any) => s.is_delivered).length || 0}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Успішно доставлені</div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-soft overflow-hidden">
          <div className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Мої товари</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Керуйте асортиментом та залишками на складі</p>
            </div>
            <Button 
              className="shadow-soft"
              onClick={() => setIsProductsModalOpen(true)}
            >
              Управління товарами
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-100 border-t border-slate-100">
            <div className="bg-white p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsProductsModalOpen(true)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Package size={16} />
                </div>
                <span className="font-bold text-slate-900">Всього товарів</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {productsData?.count || 0}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">В каталозі</div>
            </div>
            
            <div className="bg-white p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsProductsModalOpen(true)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
                <span className="font-bold text-slate-900">Закінчуються</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {products.filter(p => p.stock > 0 && p.stock <= 10).length}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Залишок менше 10 шт.</div>
            </div>
            
            <div className="bg-white p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsProductsModalOpen(true)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <X size={16} />
                </div>
                <span className="font-bold text-slate-900">Немає в наявності</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {products.filter(p => p.stock === 0).length}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Потребують поповнення</div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Management Modal */}
      <ProductsManagementModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
        products={products}
        onEdit={(product) => {
          setEditingProduct(product);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteProduct}
        onAddNew={() => {
          if (currentProductCount >= maxProducts) {
            showAlert('Ліміт вичерпано', `Ліміт товарів вичерпано (${maxProducts}). Оновіть підписку, щоб додавати більше товарів.`, 'error');
          } else {
            setEditingProduct(undefined);
            setIsModalOpen(true);
          }
        }}
      />

      {/* Sales Management Modal */}
      <SalesManagementModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        sales={analyticsData?.recent_sales || []}
        onApprove={handleApproveSale}
        onDeliver={handleDeliverSale}
        onViewDetails={setSelectedSaleDetails}
      />

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedSaleDetails(null)} />
          <div className="relative bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl animate-fade-in text-left border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Замовлення #{selectedSaleDetails?.id}</h3>
                <p className="text-slate-500 font-medium mt-1">
                  {selectedSaleDetails?.date && !Number.isNaN(new Date(selectedSaleDetails.date).getTime()) 
                    ? format(new Date(selectedSaleDetails.date), 'dd MMMM yyyy, HH:mm', { locale: uk }) 
                    : '—'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSaleDetails(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6 mb-8 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
              {/* Product Info */}
              <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100/60 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Package size={14} /> Товар
                </h4>
                <div className="mb-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <TableRowProduct productId={selectedSaleDetails?.product_id} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="block text-xs font-bold text-slate-400 mb-1">Кількість</span>
                    <span className="font-extrabold text-slate-900">{selectedSaleDetails?.quantity} шт.</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="block text-xs font-bold text-slate-400 mb-1">Сума</span>
                    <span className="font-extrabold text-brand-600">${((selectedSaleDetails?.price || 0) * (selectedSaleDetails?.quantity || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100/60 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Clock size={14} /> Статус обробки
                </h4>
                
                <div className="relative pl-3">
                  <div className="absolute top-2 bottom-2 left-4 w-0.5 bg-slate-200 rounded-full"></div>
                  <div className={`absolute top-2 left-4 w-0.5 bg-emerald-500 rounded-full transition-all duration-500 ${
                    selectedSaleDetails?.is_delivered ? 'h-[calc(100%-16px)]' :
                    selectedSaleDetails?.is_approved ? 'h-[50%]' :
                    ['paid', 'shipped', 'delivered'].includes(selectedSaleDetails?.order?.status) ? 'h-0' : 'h-0'
                  }`}></div>
                  
                  <div className="space-y-5">
                    {/* Step 1: Paid */}
                    <div className="relative flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full z-10 ring-4 ring-slate-50 ${['paid', 'shipped', 'delivered'].includes(selectedSaleDetails?.order?.status) ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div>
                        <p className={`text-sm font-bold ${['paid', 'shipped', 'delivered'].includes(selectedSaleDetails?.order?.status) ? 'text-slate-900' : 'text-slate-400'}`}>Оплачено покупцем</p>
                      </div>
                    </div>
                    
                    {/* Step 2: Approved/Shipped */}
                    <div className="relative flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full z-10 ring-4 ring-slate-50 ${selectedSaleDetails?.is_approved ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div>
                        <p className={`text-sm font-bold ${selectedSaleDetails?.is_approved ? 'text-slate-900' : 'text-slate-400'}`}>Підтверджено (Комплектується)</p>
                      </div>
                    </div>
                    
                    {/* Step 3: Delivered */}
                    <div className="relative flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full z-10 ring-4 ring-slate-50 ${selectedSaleDetails?.is_delivered ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div>
                        <p className={`text-sm font-bold ${selectedSaleDetails?.is_delivered ? 'text-emerald-600' : 'text-slate-400'}`}>Доставлено</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              {selectedSaleDetails.order && (
                <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100/60 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Map size={14} /> Дані для відправки
                  </h4>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <p className="font-extrabold text-slate-900 text-lg">{selectedSaleDetails?.order?.full_name || 'Не вказано ім\'я'}</p>
                    <p className="text-slate-600 font-medium">{selectedSaleDetails?.order?.address || 'Не вказана адреса'}</p>
                    <p className="text-slate-500 text-sm">{selectedSaleDetails?.order?.city || 'Не вказане місто'}, {selectedSaleDetails?.order?.zip_code || ''}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 pt-2 border-t border-slate-100">
              <Button variant="outline" className="flex-1 shadow-sm" onClick={() => setSelectedSaleDetails(null)}>Закрити</Button>
              {!selectedSaleDetails?.is_approved ? (
                <Button 
                  className="flex-1 shadow-soft" 
                  onClick={() => {
                    handleApproveSale(selectedSaleDetails?.id);
                    setSelectedSaleDetails(null);
                  }}
                >
                  Підтвердити
                </Button>
              ) : !selectedSaleDetails?.is_delivered ? (
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft shadow-emerald-500/20" 
                  onClick={() => {
                    handleDeliverSale(selectedSaleDetails?.id);
                    setSelectedSaleDetails(null);
                  }}
                >
                  Відмітити як доставлено
                </Button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 font-bold rounded-2xl border border-emerald-100">
                  <CheckCircle2 size={18} />
                  Успішно завершено
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboardPage;
