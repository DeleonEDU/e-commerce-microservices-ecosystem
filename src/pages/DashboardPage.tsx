import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { RootState } from '../store/store';
import { logout } from '../features/auth/authSlice';
import Button from '../components/ui/Button';
import { useGetUserOrdersQuery } from '../api/orderApiSlice';
import { useGetSubscriptionQuery } from '../api/subscriptionApiSlice';
import type { OrderStatus } from '../types/order';

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
    label: 'Оплачено',
    icon: CreditCard,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  shipped: {
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

  const userId = user?.id ?? 0;
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useGetUserOrdersQuery(userId, {
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
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-brand-50 text-brand-700 font-bold transition-all">
                  <div className="flex items-center gap-3">
                    <User size={20} />
                    <span>Профіль</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-bold transition-all">
                  <div className="flex items-center gap-3">
                    <Package size={20} />
                    <span>Мої замовлення</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-bold transition-all">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} />
                    <span>Платежі</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-bold transition-all">
                  <div className="flex items-center gap-3">
                    <MapPin size={20} />
                    <span>Адреси</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                <div className="h-px bg-slate-50 my-4" />
                <button className="w-full flex items-center justify-between p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-bold transition-all">
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
              <div className="bg-brand-600 rounded-[40px] p-8 text-white shadow-soft relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">
                    Бажаєте продавати?
                  </h3>
                  <p className="text-brand-100 text-sm mb-6 leading-relaxed">
                    Станьте продавцем на нашому маркетплейсі та почніть заробляти вже сьогодні.
                  </p>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-white text-brand-600 hover:bg-brand-50 border-none"
                    onClick={() => alert("Тут буде перехід на сторінку реєстрації продавця")}
                  >
                    Дізнатися більше
                  </Button>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-500 rounded-full blur-3xl opacity-50" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
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
                <Button variant="outline" size="sm" className="rounded-xl">
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
                  <div className="text-lg font-bold text-slate-900">—</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Дата реєстрації</label>
                  <div className="text-lg font-bold text-slate-900">—</div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Останні замовлення</h3>
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
                  ) : recentOrders.length === 0 ? (
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
                        {recentOrders.map((order) => {
                          const sp = statusPresentation[order.status];
                          const Icon = sp.icon;
                          const created = new Date(order.created_at);
                          const dateLabel = Number.isNaN(created.getTime())
                            ? '—'
                            : format(created, 'd MMMM yyyy', { locale: uk });
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
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
                                <span className="text-slate-300 font-bold text-sm">—</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
