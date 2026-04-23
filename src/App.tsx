import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './store/store';
import { ShoppingCart, Package, Home as HomeIcon, LogOut } from 'lucide-react';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import { logout, setUser } from './features/auth/authSlice';
import { useGetProfileQuery } from './api/authApiSlice';

import Button from './components/ui/Button';

import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import DashboardPage from './pages/DashboardPage';
import CheckoutPage from './pages/CheckoutPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import { selectCartItemsCount } from './features/cart/cartSlice';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const cartItemsCount = useSelector(selectCartItemsCount);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/catalog" className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 group">
            <div className="bg-brand-600 text-white p-2 rounded-xl group-hover:rotate-6 transition-transform duration-300 shadow-soft">
              <HomeIcon size={22} />
            </div>
            <span className="tracking-tight hidden sm:block">Marketplace</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/catalog" className="text-slate-600 hover:text-brand-600 font-bold transition-colors text-sm">Каталог</Link>
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          {user?.role === 'seller' && (
            <Link to="/seller/dashboard" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-xl font-bold text-sm hover:bg-brand-100 transition-colors border border-brand-100">
              <Package size={16} />
              <span>Панель продавця</span>
            </Link>
          )}

          <Link to="/cart" className="text-slate-600 hover:text-brand-600 flex items-center gap-2 font-bold transition-colors group">
            <div className="relative p-2 bg-slate-50 rounded-xl group-hover:bg-brand-50 transition-colors border border-slate-100 group-hover:border-brand-100">
              <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-soft animate-fade-in border-2 border-white">
                  {cartItemsCount}
                </span>
              )}
            </div>
            <span className="text-sm hidden md:block">Кошик</span>
          </Link>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/dashboard" className="flex items-center gap-2.5 text-slate-700 font-semibold bg-slate-50 px-3 sm:px-4 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shadow-sm">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm hidden sm:block">{user?.username || 'Користувач'}</span>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-slate-400 hover:text-error px-2 sm:px-3"
                title="Вийти"
              >
                <LogOut size={20} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Увійти</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="shadow-soft px-4 sm:px-6">Приєднатися</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const AppContent = () => {
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  // Якщо є токен, але ми ще не завантажили дані користувача
  const { data: profileData, error: profileError } = useGetProfileQuery(undefined, {
    skip: !token || !isAuthenticated,
  });

  React.useEffect(() => {
    if (profileData) {
      dispatch(setUser(profileData));
    }
    if (profileError) {
      // Якщо токен недійсний або сталася помилка - виходимо
      dispatch(logout());
    }
  }, [profileData, profileError, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}
