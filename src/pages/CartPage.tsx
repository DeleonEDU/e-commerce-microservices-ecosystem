import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  Truck,
  Package,
  UserCircle2,
  X
} from 'lucide-react';
import { RootState } from '../store/store';
import { removeItem, updateQuantity, clearCart, selectCartTotal, selectCartItemsCount } from '../features/cart/cartSlice';
import Button from '../components/ui/Button';
import { formatCurrency } from '../utils/format';

const CartPage: React.FC = () => {
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const totalAmount = useSelector(selectCartTotal);
  const itemsCount = useSelector(selectCartItemsCount);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      navigate('/checkout');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-soft border border-slate-100">
          <ShoppingCart size={40} className="text-slate-200" />
        </div>
        <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Ваш кошик порожній</h1>
        <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
          Схоже, ви ще нічого не додали. Час відкрити для себе наші найкращі пропозиції та почати покупки!
        </p>
        <Link to="/catalog">
          <Button size="lg" className="px-10 shadow-soft">
            Перейти до каталогу
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pt-12 pb-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Ваш кошик</h1>
            <p className="text-slate-500 font-medium">У вас {itemsCount} товарів у кошику</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => dispatch(clearCart())}
            className="text-slate-400 hover:text-rose-500 font-bold"
          >
            Очистити кошик
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-soft flex flex-col sm:flex-row items-center gap-8 group transition-all hover:border-brand-100"
              >
                {/* Product Image */}
                <Link to={`/product/${item.id}`} className="w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-50 border border-slate-50">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} className="text-slate-200" />
                    </div>
                  )}
                </Link>

                {/* Product Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex px-2 py-0.5 rounded-lg bg-brand-50 text-brand-600 text-[10px] font-bold uppercase tracking-wider mb-2">
                    {item.category_name}
                  </div>
                  <Link to={`/product/${item.id}`}>
                    <h3 className="text-lg font-extrabold text-slate-900 mb-1 hover:text-brand-600 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-slate-400 text-sm font-medium mb-4">Код товару: #{item.id}</p>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-4">
                    <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 p-1">
                      <button 
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-bold text-slate-900">{item.quantity}</span>
                      <button 
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => dispatch(removeItem(item.id))}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Видалити"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="text-center sm:text-right sm:min-w-[120px]">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Ціна</div>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                  {item.quantity > 1 && (
                    <div className="text-xs text-slate-400 font-medium">{formatCurrency(item.price)} за шт.</div>
                  )}
                </div>
              </div>
            ))}

            <Link to="/catalog" className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-600 font-bold text-sm transition-colors group mt-8">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Продовжити покупки
            </Link>
          </div>

          {/* Order Summary */}
          <div className="space-y-8">
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-soft sticky top-32">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-8 tracking-tight">Підсумок замовлення</h3>
              
              <div className="space-y-4 mb-8 pb-8 border-b border-slate-50">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Сума товарів</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Доставка</span>
                  <span className="text-emerald-600 font-bold">Безкоштовно</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Податки</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(0)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-10">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Загальна сума</span>
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <Button size="lg" className="w-full shadow-soft gap-2 mb-6" onClick={handleCheckoutClick}>
                <CreditCard size={20} />
                Оформити замовлення
              </Button>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Безпечна оплата
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <Truck size={16} className="text-brand-500" />
                  Швидка доставка
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-fade-in text-center">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <UserCircle2 size={40} />
            </div>
            
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Потрібна авторизація</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
              Щоб оформити замовлення, будь ласка, увійдіть у свій акаунт або створіть новий.
            </p>
            
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
                Увійти
              </Button>
              <Button variant="outline" className="w-full" size="lg" onClick={() => navigate('/register')}>
                Зареєструватися
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
