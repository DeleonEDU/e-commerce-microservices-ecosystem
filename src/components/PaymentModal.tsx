import React, { useState } from 'react';
import { CreditCard, X, ShieldCheck, Loader2 } from 'lucide-react';
import Button from './ui/Button';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tier: 'plus' | 'pro' | 'vip';
  amount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, tier, amount }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate Stripe payment processing delay
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2000);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
    e.target.value = formattedValue;
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      e.target.value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    } else {
      e.target.value = value;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Оплата підписки</h3>
            <p className="text-slate-500 text-sm font-medium">План: <span className="uppercase text-brand-600 font-bold">{tier}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handlePayment} className="p-6 space-y-6">
          <div className="p-4 rounded-2xl bg-brand-50 flex items-center justify-between border border-brand-100 text-brand-900">
            <span className="font-bold">До сплати:</span>
            <span className="text-2xl font-extrabold">${amount.toFixed(2)}<span className="text-sm text-brand-600/70">/міс</span></span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Номер картки</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  required
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  onChange={handleCardNumberChange}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Термін дії</label>
                <input 
                  type="text" 
                  required
                  placeholder="MM/YY"
                  maxLength={5}
                  onChange={handleExpiryChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">CVC</label>
                <input 
                  type="text" 
                  required
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Ім'я на картці</label>
              <input 
                type="text" 
                required
                placeholder="Ivan Ivanov"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium uppercase"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl">
            <ShieldCheck size={16} />
            Платежі надійно захищені (Stripe Mockup)
          </div>

          <Button 
            type="submit" 
            className="w-full shadow-soft" 
            size="lg"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Обробка...
              </span>
            ) : (
              `Оплатити $${amount.toFixed(2)}`
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;