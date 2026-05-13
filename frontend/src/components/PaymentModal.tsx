import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCreateSubscriptionIntentMutation } from '../api/subscriptionApiSlice';
import { useConfirmPaymentMutation } from '../api/paymentApiSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { formatCurrency } from '../utils/format';

// TODO: Replace with env variable if needed
const stripePromise = loadStripe('pk_test_51TPMQsH8SpgjaGIVWO9vvxqj1HdDi3ZgVpzUQpj0r9EAr6hAbEKjwAPoxS9Cl6xTYBl7BqC4smgyffEHuIv8PmXd00mN5NUNfe');

const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#4f46e5',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorDanger: '#e11d48',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '16px',
  },
  rules: {
    '.Input': {
      padding: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #4f46e5',
      boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.1)',
    },
    '.Label': {
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '0.75rem',
      marginBottom: '8px',
    }
  }
};

interface StripeSubscriptionFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  amount: number;
}

const StripeSubscriptionForm: React.FC<StripeSubscriptionFormProps> = ({ clientSecret, onSuccess, onCancel, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard',
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Виникла помилка під час оплати.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setErrorMessage('Статус платежу: ' + (paymentIntent?.status || 'невідомо'));
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="p-4 rounded-2xl bg-brand-50 flex items-center justify-between border border-brand-100 text-brand-900">
        <span className="font-bold">До сплати:</span>
        <span className="text-2xl font-extrabold">{formatCurrency(amount)}<span className="text-sm text-brand-600/70">/міс</span></span>
      </div>

      <PaymentElement />
      
      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl">
        <ShieldCheck size={16} />
        Безпечна оплата через Stripe
      </div>

      <Button 
        type="submit" 
        className="w-full shadow-soft" 
        size="lg"
        disabled={!stripe || isProcessing}
        isLoading={isProcessing}
      >
        {`Оплатити ${formatCurrency(amount)}`}
      </Button>
    </form>
  );
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tier: 'plus' | 'pro' | 'vip';
  amount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, tier, amount }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [createSubscriptionIntent] = useCreateSubscriptionIntentMutation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user?.id && amount > 0) {
      setClientSecret(null);
      setError(null);
      createSubscriptionIntent({
        amount,
        user_id: user.id,
        tier
      })
        .unwrap()
        .then((res) => {
          setClientSecret(res.client_secret);
        })
        .catch((err) => {
          setError('Не вдалося ініціалізувати оплату. Спробуйте пізніше.');
          console.error(err);
        });
    }
  }, [isOpen, amount, user?.id, tier, createSubscriptionIntent]);

  if (!isOpen) return null;

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

        {error ? (
          <div className="p-6 text-center">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium mb-4">
              {error}
            </div>
            <Button onClick={onClose} variant="outline">Закрити</Button>
          </div>
        ) : !clientSecret ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm font-bold uppercase tracking-widest">Підготовка платежу...</p>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
            <StripeSubscriptionForm 
              clientSecret={clientSecret} 
              onSuccess={onSuccess}
              onCancel={onClose}
              amount={amount}
            />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;