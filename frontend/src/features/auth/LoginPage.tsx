import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLazyGetProfileQuery, useLoginMutation } from '../../api/authApiSlice';
import { logout, setCredentials, setUser } from './authSlice';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';
import { RootState } from '../../store/store';

import Button from '../../components/ui/Button';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();
  const [loadProfile] = useLazyGetProfileQuery();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/catalog" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials({ user: null, token: result.access }));
      try {
        const profile = await loadProfile().unwrap();
        dispatch(setUser(profile));
      } catch {
        dispatch(logout());
        setError('Не вдалося завантажити профіль після входу. Спробуйте ще раз.');
        return;
      }
      navigate('/catalog');
    } catch (err: any) {
      setError(err.data?.detail || 'Невірний email або пароль');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-card border border-slate-100 p-10 md:p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl mb-6 shadow-soft rotate-3 hover:rotate-0 transition-transform duration-500">
            <LogIn size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">З поверненням</h1>
          <p className="text-slate-500 mt-3 text-sm font-medium">Увійдіть у свій акаунт, щоб продовжити покупки</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-xs font-bold animate-shake flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email адреса</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-300 shadow-sm hover:border-slate-300"
                placeholder="alex@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Пароль</label>
              <Link to="#" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">Забули?</Link>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-300 shadow-sm hover:border-slate-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full py-4 text-base"
          >
            Увійти в систему
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Ще не маєте акаунту?{' '}
            <Link to="/register" className="text-brand-600 font-bold hover:underline decoration-2 underline-offset-4">
              Створити безкоштовно
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
