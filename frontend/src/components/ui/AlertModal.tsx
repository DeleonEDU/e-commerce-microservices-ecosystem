import React from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import Button from './Button';

export type AlertType = 'success' | 'error' | 'info';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void; // If provided, acts as a confirm modal
  confirmText?: string;
  cancelText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  confirmText = 'Підтвердити',
  cancelText = 'Скасувати'
}) => {
  if (!isOpen) return null;

  const isConfirm = !!onConfirm;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-fade-in text-center">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${
          type === 'error' ? 'bg-rose-50 text-rose-600' :
          type === 'success' ? 'bg-emerald-50 text-emerald-600' :
          'bg-brand-50 text-brand-600'
        }`}>
          {type === 'error' && <AlertCircle size={40} />}
          {type === 'success' && <CheckCircle2 size={40} />}
          {type === 'info' && <Info size={40} />}
        </div>
        
        <h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
          {message}
        </p>
        
        {isConfirm ? (
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              {cancelText}
            </Button>
            <Button 
              className={`flex-1 ${type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : ''}`} 
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </Button>
          </div>
        ) : (
          <Button className="w-full" size="lg" onClick={onClose}>
            Зрозуміло
          </Button>
        )}
      </div>
    </div>
  );
};

export default AlertModal;