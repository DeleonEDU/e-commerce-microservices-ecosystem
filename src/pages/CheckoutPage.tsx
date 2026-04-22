import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CreditCard, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  Package,
  Wallet,
} from 'lucide-react';
import { RootState } from '../store/store';
import { selectCartTotal, clearCart } from '../features/cart/cartSlice';
import Button from '../components/ui/Button';
import { useCreateOrderMutation } from '../api/orderApiSlice';

type CheckoutStep = 'shipping' | 'payment' | 'confirmation' | 'success';

const CheckoutPage: React.FC = () => {
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const totalAmount = useSelector(selectCartTotal);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [createOrder, { isLoading: isPlacingOrder }] = useCreateOrderMutation();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'card',
  });

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (cartItems.length === 0 && step !== 'success') {
    navigate('/catalog');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!user?.id) return;
    try {
      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));
      
      const order = await createOrder({ 
        user_id: user.id,
        items: orderItems
      }).unwrap();
      
      setPlacedOrderId(order.id);
      setStep('success');
      dispatch(clearCart());
    } catch {
      // keep user on page; UI-level error handling can be added later
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-soft border border-emerald-100 animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Замовлення оформлено!</h1>
        <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
          Дякуємо за покупку. Ваше замовлення{' '}
          <span className="text-slate-900 font-bold">#{placedOrderId ?? '—'}</span> успішно прийнято в обробку.
          Деталі можна переглянути в особистому кабінеті.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/dashboard">
            <Button variant="outline" size="lg" className="px-10">Переглянути замовлення</Button>
          </Link>
          <Link to="/catalog">
            <Button size="lg" className="px-10 shadow-soft">Продовжити покупки</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pt-12 pb-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-16">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'shipping' ? 'text-brand-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'shipping' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
              <span className="font-bold hidden sm:inline">Доставка</span>
            </div>
            <div className="w-12 h-px bg-slate-200" />
            <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-brand-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'payment' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
              <span className="font-bold hidden sm:inline">Оплата</span>
            </div>
            <div className="w-12 h-px bg-slate-200" />
            <div className={`flex items-center gap-2 ${step === 'confirmation' ? 'text-brand-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'confirmation' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
              <span className="font-bold hidden sm:inline">Підтвердження</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            
            {step === 'shipping' && (
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-soft animate-fade-in">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-3">
                  <MapPin className="text-brand-600" />
                  Адреса доставки
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Повне ім'я отримувача</label>
                    <input 
                      type="text" 
                      placeholder="Олександр Петренко"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Вулиця, будинок, квартира</label>
                    <input 
                      type="text" 
                      placeholder="вул. Хрещатик, 1, кв. 10"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Місто</label>
                    <input 
                      type="text" 
                      placeholder="Київ"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Поштовий індекс</label>
                    <input 
                      type="text" 
                      placeholder="01001"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    />
                  </div>
                </div>
                <div className="mt-10 flex justify-end">
                  <Button size="lg" className="px-10 gap-2" onClick={() => setStep('payment')}>
                    Далі до оплати
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-soft animate-fade-in">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-3">
                  <CreditCard className="text-brand-600" />
                  Спосіб оплати
                </h2>
                <div className="space-y-4">
                  <button 
                    onClick={() => setFormData({...formData, paymentMethod: 'card'})}
                    className={`w-full flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${formData.paymentMethod === 'card' ? 'border-brand-600 bg-brand-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${formData.paymentMethod === 'card' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <CreditCard size={24} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900">Кредитна або дебетова картка</div>
                        <div className="text-xs text-slate-400 font-medium">Visa, Mastercard, Apple Pay</div>
                      </div>
                    </div>
                    {formData.paymentMethod === 'card' && <CheckCircle2 className="text-brand-600" />}
                  </button>

                  <button 
                    onClick={() => setFormData({...formData, paymentMethod: 'cash'})}
                    className={`w-full flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${formData.paymentMethod === 'cash' ? 'border-brand-600 bg-brand-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${formData.paymentMethod === 'cash' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Wallet size={24} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900">Оплата при отриманні</div>
                        <div className="text-xs text-slate-400 font-medium">Готівкою або карткою кур'єру</div>
                      </div>
                    </div>
                    {formData.paymentMethod === 'cash' && <CheckCircle2 className="text-brand-600" />}
                  </button>
                </div>
                <div className="mt-10 flex justify-between">
                  <Button variant="ghost" size="lg" className="gap-2 text-slate-400" onClick={() => setStep('shipping')}>
                    <ArrowLeft size={18} />
                    Назад
                  </Button>
                  <Button size="lg" className="px-10 gap-2" onClick={() => setStep('confirmation')}>
                    Далі до підтвердження
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {step === 'confirmation' && (
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-soft animate-fade-in">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-3">
                  <ShieldCheck className="text-brand-600" />
                  Перевірка даних
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                      <MapPin size={14} />
                      Доставка
                    </div>
                    <div className="font-bold text-slate-900 mb-1">{formData.fullName}</div>
                    <div className="text-sm text-slate-500 leading-relaxed">
                      {formData.address}, {formData.city}, {formData.zipCode}
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                      <CreditCard size={14} />
                      Оплата
                    </div>
                    <div className="font-bold text-slate-900 mb-1">
                      {formData.paymentMethod === 'card' ? 'Банківська картка' : 'При отриманні'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {formData.paymentMethod === 'card' ? 'Онлайн-оплата карткою' : 'Готівка або POS-термінал'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Товари</h3>
                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                            {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Package size={16} />}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{item.name} <span className="text-slate-400 font-medium">x{item.quantity}</span></span>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" size="lg" className="gap-2 text-slate-400" onClick={() => setStep('payment')}>
                    <ArrowLeft size={18} />
                    Назад
                  </Button>
                  <Button size="lg" className="px-12 shadow-soft" onClick={handlePlaceOrder} isLoading={isPlacingOrder}>
                    Підтвердити та оплатити
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-soft sticky top-32">
              <h3 className="text-xl font-extrabold text-slate-900 mb-6 tracking-tight">Ваше замовлення</h3>
              
              <div className="space-y-4 mb-6 pb-6 border-b border-slate-50">
                <div className="flex justify-between text-slate-500 text-sm font-medium">
                  <span>Сума ({cartItems.length} тов.)</span>
                  <span className="text-slate-900 font-bold">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-sm font-medium">
                  <span>Доставка</span>
                  <span className="text-emerald-600 font-bold">Безкоштовно</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Разом до оплати</span>
                  <span className="text-3xl font-extrabold text-brand-600 tracking-tighter">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Truck size={18} className="text-brand-500" />
                  <div className="text-xs font-bold text-slate-600">Очікувана доставка: 2-3 дні</div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <div className="text-xs font-bold text-emerald-700">Захищена транзакція</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
