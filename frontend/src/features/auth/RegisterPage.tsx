import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useRegisterMutation, useLoginMutation } from '../../api/authApiSlice';
import { UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { UserRole } from '../../types/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from './authSlice';
import { RootState } from '../../store/store';

import Button from '../../components/ui/Button';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'buyer' as UserRole,
  });
  const [error, setError] = useState<string | null>(null);

  const [register, { isLoading }] = useRegisterMutation();
  const [loginMutation] = useLoginMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await register(formData).unwrap();
      // Auto-login after successful registration
      const loginResult = await loginMutation({ email: formData.email, password: formData.password }).unwrap();
      dispatch(setCredentials({ user: null, token: loginResult.access }));
      navigate('/');
    } catch (err: any) {
      setError(err.data?.email?.[0] || err.data?.username?.[0] || 'Помилка при реєстрації');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[480px] bg-white rounded-[32px] shadow-card border border-slate-100 p-10 md:p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mb-6 shadow-soft -rotate-3 hover:rotate-0 transition-transform duration-500">
            <UserPlus size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Створити акаунт</h1>
          <p className="text-slate-500 mt-3 text-sm font-medium">Приєднуйтесь до нашої преміальної спільноти</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                  placeholder="alex_smith"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Роль</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
                  <ShieldCheck size={18} />
                </span>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 appearance-none shadow-sm hover:border-slate-300"
                >
                  <option value="buyer">Покупець</option>
                  <option value="seller">Продавець</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email адреса</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                placeholder="alex@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Пароль</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 shadow-sm hover:border-slate-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full py-4 text-base mt-4"
          >
            Зареєструватися
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Вже маєте акаунт?{' '}
            <Link to="/login" className="text-brand-600 font-bold hover:underline decoration-2 underline-offset-4">
              Увійти в систему
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
