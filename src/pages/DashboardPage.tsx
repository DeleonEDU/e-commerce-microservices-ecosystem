import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Package,
  Settings,
  LogOut,
  CreditCard,
  MapPin,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  Loader2,
  Ban,
  Map,
  Store
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { RootState } from '../store/store';
import { logout, setUser } from '../features/auth/authSlice';
import Button from '../components/ui/Button';
import { useGetUserOrdersQuery } from '../api/orderApiSlice';
import { useGetSubscriptionQuery } from '../api/subscriptionApiSlice';
import { useUpdateProfileMutation } from '../api/authApiSlice';
import { useGetUserPaymentsQuery, useConfirmPaymentMutation } from '../api/paymentApiSlice';
import type { OrderStatus } from '../types/order';

import OrderProductItem from '../components/OrderProductItem';

const statusPresentation: Record<
  OrderStatus,
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pending: {
    label: 'Обробляється',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  paid: {
    label: 'Оплачено, обробка',
    icon: CreditCard,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  shipped: {
    label: 'Комплектується',
    icon: Package,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  delivered: {
    label: 'Доставлено',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  cancelled: {
    label: 'Скасовано',
    icon: Ban,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
};

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmPayment] = useConfirmPaymentMutation();

  React.useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    if (paymentIntent && redirectStatus === 'succeeded') {
      confirmPayment({ payment_intent_id: paymentIntent })
        .unwrap()
        .then(() => {
          // Remove query params to clean up URL
          searchParams.delete('payment_intent');
          searchParams.delete('payment_intent_client_secret');
          searchParams.delete('redirect_status');
          setSearchParams(searchParams);
        })
        .catch((err) => console.error('Failed to confirm payment after redirect:', err));
    }
  }, [searchParams, confirmPayment, setSearchParams]);

  const [activeTab, setActiveTab] = React.useState<'profile' | 'orders' | 'payments' | 'settings'>('profile');
  const [selectedOrderDetails, setSelectedOrderDetails] = React.useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  
  const [selectedPaymentDetails, setSelectedPaymentDetails] = React.useState<any>(null);

  // Settings Form State
  const [settingsForm, setSettingsForm] = React.useState({
    username: user?.username || '',
    phone_number: user?.phone_number || '',
    password: '',
    confirmPassword: ''
  });
  const [settingsError, setSettingsError] = React.useState('');
  const [settingsSuccess, setSettingsSuccess] = React.useState('');
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  // Reset settings form when switching to settings tab or user updates
  React.useEffect(() => {
    if (activeTab === 'settings') {
      setSettingsForm({
        username: user?.username || '',
        phone_number: user?.phone_number || '',
        password: '',
        confirmPassword: ''
      });
      setSettingsError('');
      setSettingsSuccess('');
    }
  }, [activeTab, user]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (settingsForm.password && settingsForm.password !== settingsForm.confirmPassword) {
      setSettingsError('Паролі не співпадають');
      return;
    }

    try {
      const updateData: any = { 
        username: settingsForm.username,
        phone_number: settingsForm.phone_number || undefined
      };
      
      if (settingsForm.password) {
        updateData.password = settingsForm.password;
      }

      const updatedUser = await updateProfile(updateData).unwrap();
      dispatch(setUser(updatedUser));
      setSettingsSuccess('Профіль успішно оновлено!');
      setSettingsForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setSettingsError('Не вдалося оновити профіль. Спробуйте пізніше.');
    }
  };

  const [phoneError, setPhoneError] = React.useState('');

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    
    // Basic phone validation (digits and optional plus)
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setPhoneError('Введіть коректний номер телефону');
      return;
    }
    
    try {
      const updatedUser = await updateProfile({ role: 'seller', phone_number: phoneNumber }).unwrap();
      dispatch(setUser(updatedUser));
      setIsUpgradeModalOpen(false);
    } catch (err) {
      setPhoneError('Не вдалося оновити профіль. Спробуйте пізніше.');
    }
  };

  const userId = user?.id ?? 0;
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useGetUserOrdersQuery(userId, {
    skip: !user?.id,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useGetUserPaymentsQuery(userId, {
    skip: !user?.id,
  });

  const { data: subscription } = useGetSubscriptionQuery(userId, { skip: !user?.id });
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const totalOrders = orders.length;
  const deliveredCount = orders.filter((o) => o.status === 'shipped').length;
  const inProgressCount = orders.filter((o) => o.status === 'pending' || o.status === 'paid').length;
  const recentOrders = orders.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50/50 pt-12 pb-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-soft">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-24 h-24 rounded-3xl bg-brand-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-soft mb-4">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">{user?.username || 'Користувач'}</h2>
                <p className="text-slate-400 text-sm font-medium">{user?.email ?? '—'}</p>
              </div>

              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <User size={20} />
                    <span>Профіль</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${activeTab === 'orders' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <Package size={20} />
                    <span>Мої замовлення</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => setActiveTab('payments')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${activeTab === 'payments' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} />
                    <span>Платежі</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <div className="h-px bg-slate-50 my-4" />
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <Settings size={20} />
                    <span>Налаштування</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 rounded-2xl text-rose-500 hover:bg-rose-50 font-bold transition-all"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={20} />
                    <span>Вийти</span>
                  </div>
                </button>
              </nav>
            </div>

            {user?.role !== 'seller' && (
              <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                    <Store size={24} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold mb-3 tracking-tight text-white">
                    Бажаєте продавати?
                  </h3>
                  <p className="text-brand-100 text-sm mb-8 leading-relaxed font-medium">
                    Відкрийте свій магазин на нашому маркетплейсі та отримайте доступ до тисяч покупців вже сьогодні.
                  </p>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-white text-brand-700 hover:bg-brand-50 border-none shadow-lg hover:shadow-xl transition-all"
                    onClick={() => setIsUpgradeModalOpen(true)}
                  >
                    Стати продавцем
                  </Button>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-400 rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
            
            {activeTab === 'profile' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft">
                    <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl w-fit mb-6">
                      <Package size={24} />
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 mb-1">
                      {ordersLoading ? '…' : totalOrders}
                    </div>
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">Всього замовлень</div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 mb-1">
                      {ordersLoading ? '…' : deliveredCount}
                    </div>
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">Доставлено</div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-6">
                      <Clock size={24} />
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 mb-1">
                      {ordersLoading ? '…' : inProgressCount}
                    </div>
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">В обробці</div>
                  </div>
                </div>

                {/* Profile Overview */}
                <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-soft">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Особиста інформація</h3>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setActiveTab('settings')}>
                      Редагувати
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Повне ім&apos;я</label>
                      <div className="text-lg font-bold text-slate-900">{user?.username || '—'}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Email адреса</label>
                      <div className="text-lg font-bold text-slate-900">{user?.email ?? '—'}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Телефон</label>
                      <div className="text-lg font-bold text-slate-900">{user?.phone_number || '—'}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Дата реєстрації</label>
                      <div className="text-lg font-bold text-slate-900">
                        {user?.date_joined ? format(new Date(user.date_joined), 'dd MMMM yyyy', { locale: uk }) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(activeTab === 'profile' || activeTab === 'orders') && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {activeTab === 'orders' ? 'Всі замовлення' : 'Останні замовлення'}
                  </h3>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    {ordersLoading ? (
                      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Loader2 className="animate-spin text-brand-600 mb-4" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">Завантаження замовлень…</p>
                      </div>
                    ) : ordersError ? (
                      <div className="py-24 text-center px-6">
                        <p className="text-slate-600 font-medium">Не вдалося завантажити замовлення. Спробуйте пізніше.</p>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-24 text-center px-6">
                        <Truck className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-lg font-bold text-slate-900 mb-1">Поки немає замовлень</p>
                        <p className="text-sm text-slate-400">Оформіть перше замовлення в каталозі.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                              ID Замовлення
                            </th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Дата</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Сума</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Статус</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">
                              Дія
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(activeTab === 'orders' ? orders : recentOrders).map((order) => {
                            const sp = statusPresentation[order.status];
                            const Icon = sp.icon;
                            const created = new Date(order.created_at);
                            const dateLabel = Number.isNaN(created.getTime())
                              ? '—'
                              : format(created, 'd MMMM yyyy, HH:mm', { locale: uk });
                            return (
                              <tr key={order.id} className="hover:bg-slate-50/30 transition-colors cursor-pointer" onClick={() => setSelectedOrderDetails(order)}>
                                <td className="px-8 py-6 font-bold text-slate-900">#{order.id}</td>
                                <td className="px-8 py-6 text-slate-500 font-medium capitalize">{dateLabel}</td>
                                <td className="px-8 py-6 font-extrabold text-slate-900">
                                  ${order.total_price.toFixed(2)}
                                </td>
                                <td className="px-8 py-6">
                                  <div
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${sp.bg} ${sp.color} text-xs font-bold`}
                                  >
                                    <Icon size={14} />
                                    {sp.label}
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <Button variant="ghost" size="sm" className="text-slate-400" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderDetails(order);
                                  }}>Деталі</Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Історія платежів</h3>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    {paymentsLoading ? (
                      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Loader2 className="animate-spin text-brand-600 mb-4" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">Завантаження платежів…</p>
                      </div>
                    ) : payments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <CreditCard className="mb-4 opacity-50" size={48} />
                        <p className="text-lg font-bold text-slate-900 mb-1">Немає платежів</p>
                        <p className="text-sm">Ви ще не здійснювали жодних оплат.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">ID Платежу</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Дата</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Сума</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Статус</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Дія</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {payments.map((payment) => {
                            const created = new Date(payment.created_at);
                            const dateLabel = Number.isNaN(created.getTime())
                              ? '—'
                              : format(created, 'd MMMM yyyy, HH:mm', { locale: uk });
                            
                            const isCompleted = payment.status === 'completed';
                            const isFailed = payment.status === 'failed';
                            
                            return (
                              <tr key={payment.id} className="hover:bg-slate-50/30 transition-colors cursor-pointer" onClick={() => setSelectedPaymentDetails(payment)}>
                                <td className="px-8 py-6 font-bold text-slate-900">#{payment.id}</td>
                                <td className="px-8 py-6 text-slate-500 font-medium capitalize">{dateLabel}</td>
                                <td className="px-8 py-6 font-extrabold text-slate-900">
                                  ${payment.amount.toFixed(2)}
                                </td>
                                <td className="px-8 py-6">
                                  <div
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                                      isCompleted ? 'bg-emerald-50 text-emerald-600' : 
                                      isFailed ? 'bg-rose-50 text-rose-600' : 
                                      'bg-amber-50 text-amber-500'
                                    }`}
                                  >
                                    {isCompleted ? <CheckCircle2 size={14} /> : isFailed ? <Ban size={14} /> : <Clock size={14} />}
                                    {isCompleted ? 'Успішно' : isFailed ? 'Помилка' : 'В обробці'}
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <Button variant="ghost" size="sm" className="rounded-xl">Деталі</Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-soft animate-fade-in">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-8">Налаштування профілю</h3>
                
                {settingsSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600 text-sm font-bold flex items-center gap-3">
                    <CheckCircle2 size={18} />
                    {settingsSuccess}
                  </div>
                )}
                
                {settingsError && (
                  <div className="mb-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-sm font-bold flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {settingsError}
                  </div>
                )}

                <form onSubmit={handleSettingsSubmit} className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Повне ім'я</label>
                      <input
                        type="text"
                        value={settingsForm.username}
                        onChange={(e) => setSettingsForm({...settingsForm, username: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Номер телефону</label>
                      <input
                        type="tel"
                        value={settingsForm.phone_number}
                        onChange={(e) => setSettingsForm({...settingsForm, phone_number: e.target.value})}
                        placeholder="+380 99 123 45 67"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <h4 className="text-lg font-bold text-slate-900 mb-4">Зміна пароля</h4>
                    <p className="text-sm text-slate-500 mb-6">Залиште ці поля порожніми, якщо не хочете змінювати пароль.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Новий пароль</label>
                        <input
                          type="password"
                          value={settingsForm.password}
                          onChange={(e) => setSettingsForm({...settingsForm, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Підтвердження пароля</label>
                        <input
                          type="password"
                          value={settingsForm.confirmPassword}
                          onChange={(e) => setSettingsForm({...settingsForm, confirmPassword: e.target.value})}
                          placeholder="••••••••"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button type="submit" size="lg" className="px-10 shadow-soft" isLoading={isUpdating}>
                      Зберегти зміни
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Upgrade to Seller Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setIsUpgradeModalOpen(false)} />
          <div className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-fade-in text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-brand-50 to-indigo-50 -z-10" />
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-slate-100 relative z-10">
              <Store size={32} className="text-brand-600" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Стати продавцем</h3>
            <p className="text-slate-500 mb-6 font-medium text-sm">
              Отримайте доступ до мільйонів покупців, зручної аналітики та інструментів для розвитку вашого бізнесу.
            </p>
            
            <form onSubmit={handleUpgradeSubmit} className="space-y-5 text-left relative z-10">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Номер телефону</label>
                <input
                  type="tel"
                  placeholder="+380 99 123 45 67"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                  required
                />
                {phoneError && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-2 animate-shake">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {phoneError}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsUpgradeModalOpen(false)}>Скасувати</Button>
                <Button type="submit" className="flex-1 shadow-soft" isLoading={isUpdating}>
                  Почати продавати
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedOrderDetails(null)} />
          <div className="relative bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl animate-fade-in text-left max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900">Замовлення #{selectedOrderDetails.id}</h3>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusPresentation[selectedOrderDetails.status as OrderStatus].bg} ${statusPresentation[selectedOrderDetails.status as OrderStatus].color} text-xs font-bold`}>
                {statusPresentation[selectedOrderDetails.status as OrderStatus].label}
              </div>
            </div>

            {/* Tracking Mock */}
            <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Map size={18} className="text-brand-600" />
                Статус доставки
              </h4>
              
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-3 w-px bg-slate-200"></div>
                
                <div className="space-y-6">
                  <div className="relative flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center z-10 shadow-sm">
                      <CheckCircle2 size={12} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Замовлення оформлено</p>
                      <p className="text-xs text-slate-500">{format(new Date(selectedOrderDetails.created_at), 'dd MMM yyyy, HH:mm', { locale: uk })}</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm ${
                      ['paid', 'shipped', 'delivered'].includes(selectedOrderDetails.status) 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white border-2 border-slate-200 text-slate-300'
                    }`}>
                      {['paid', 'shipped', 'delivered'].includes(selectedOrderDetails.status) && <CheckCircle2 size={12} />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${['paid', 'shipped', 'delivered'].includes(selectedOrderDetails.status) ? 'text-slate-900' : 'text-slate-400'}`}>
                        Оплачено, обробка
                      </p>
                      {['paid', 'shipped', 'delivered'].includes(selectedOrderDetails.status) && (
                        <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                          <CreditCard size={12} />
                          Оплата підтверджена
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm ${
                      ['shipped', 'delivered'].includes(selectedOrderDetails.status) 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white border-2 border-slate-200 text-slate-300'
                    }`}>
                      {['shipped', 'delivered'].includes(selectedOrderDetails.status) && <CheckCircle2 size={12} />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${['shipped', 'delivered'].includes(selectedOrderDetails.status) ? 'text-slate-900' : 'text-slate-400'}`}>
                        Комплектується
                      </p>
                      {['shipped', 'delivered'].includes(selectedOrderDetails.status) && (
                        <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                          <Package size={12} />
                          Продавець комплектує замовлення
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="relative flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm ${
                      selectedOrderDetails.status === 'delivered' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white border-2 border-slate-200 text-slate-300'
                    }`}>
                      {selectedOrderDetails.status === 'delivered' && <CheckCircle2 size={12} />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${selectedOrderDetails.status === 'delivered' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        Доставлено
                      </p>
                      {selectedOrderDetails.status === 'delivered' && (
                        <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Успішно доставлено
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Адреса доставки</h4>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                  <p className="font-bold text-slate-900">{selectedOrderDetails.full_name || 'Не вказано'}</p>
                  <p className="text-sm text-slate-600 mt-1">{selectedOrderDetails.address || 'Адреса відсутня'}</p>
                  <p className="text-sm text-slate-600">{selectedOrderDetails.city || ''}, {selectedOrderDetails.zip_code || ''}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Товари</h4>
                <div className="space-y-3">
                  {selectedOrderDetails.items?.map((item: any, idx: number) => (
                    <OrderProductItem 
                      key={idx} 
                      productId={item.product_id} 
                      quantity={item.quantity} 
                      price={item.price} 
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-500">Загальна сума</span>
                <span className="text-2xl font-extrabold text-brand-600">${selectedOrderDetails.total_price.toFixed(2)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => setSelectedOrderDetails(null)}>Закрити</Button>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedPaymentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPaymentDetails(null)} />
          <div className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-fade-in text-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900">Деталі платежу</h3>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  selectedPaymentDetails.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                  selectedPaymentDetails.status === 'failed' ? 'bg-rose-50 text-rose-600' : 
                  'bg-amber-50 text-amber-500'
                }`}
              >
                {selectedPaymentDetails.status === 'completed' ? <CheckCircle2 size={14} /> : selectedPaymentDetails.status === 'failed' ? <Ban size={14} /> : <Clock size={14} />}
                {selectedPaymentDetails.status === 'completed' ? 'Успішно' : selectedPaymentDetails.status === 'failed' ? 'Помилка' : 'В обробці'}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-500">ID Платежу</span>
                  <span className="font-bold text-slate-900">#{selectedPaymentDetails.id}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-500">Замовлення</span>
                  <span className="font-bold text-brand-600 cursor-pointer hover:underline" onClick={() => {
                    // Find the order if possible
                    const order = orders.find((o) => o.id === selectedPaymentDetails.order_id);
                    if (order) {
                      setSelectedPaymentDetails(null);
                      setSelectedOrderDetails(order);
                    }
                  }}>#{selectedPaymentDetails.order_id}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-500">Дата та час</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {selectedPaymentDetails.created_at ? format(new Date(selectedPaymentDetails.created_at), 'd MMMM yyyy, HH:mm', { locale: uk }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Stripe ID</span>
                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/50 px-2 py-1 rounded truncate max-w-[150px]" title={selectedPaymentDetails.stripe_payment_intent_id}>
                    {selectedPaymentDetails.stripe_payment_intent_id || '—'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-brand-50 rounded-2xl border border-brand-100">
                <span className="font-bold text-brand-900">Сума платежу</span>
                <span className="text-2xl font-extrabold text-brand-600">${selectedPaymentDetails.amount.toFixed(2)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => setSelectedPaymentDetails(null)}>Закрити</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
