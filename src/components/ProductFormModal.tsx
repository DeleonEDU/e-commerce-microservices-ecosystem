import React, { useState, useEffect } from 'react';
import { X, Loader2, Upload, Package, DollarSign, Tag, Info, Layers } from 'lucide-react';
import { Category, Product, CreateProductRequest, UpdateProductRequest } from '../types/product';
import { useGetCategoriesQuery } from '../api/productApiSlice';
import Button from './ui/Button';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  product?: Product;
  isLoading?: boolean;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  product,
  isLoading 
}) => {
  const { data: categories } = useGetCategoriesQuery();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    stock: '',
    specifications: '{}',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand || '',
        description: product.description,
        price: product.price.toString(),
        category_id: product.category != null ? String(product.category) : '',
        image_url: product.image_url || '',
        stock: product.stock.toString(),
        specifications: product.specifications ? JSON.stringify(product.specifications, null, 2) : '{}',
      });
    } else {
      setFormData({
        name: '',
        brand: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        stock: '',
        specifications: '{\n  "Колір": "",\n  "Розмір": ""\n}',
      });
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let specs = {};
    try {
      // Allow empty string to pass validation
      if (formData.specifications.trim() !== '') {
        specs = JSON.parse(formData.specifications);
      }
    } catch (e) {
      alert('Некоректний JSON у специфікаціях. Будь ласка, перевірте синтаксис (повинні бути подвійні лапки).');
      return;
    }
    const data = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      category_id: parseInt(formData.category_id),
      specifications: specs,
    };
    await onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between p-8 border-b border-slate-50">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {product ? 'Редагувати товар' : 'Додати новий товар'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[70vh] space-y-8 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Package size={14} /> Назва товару
              </label>
              <input 
                type="text" 
                required
                placeholder="Наприклад: iPhone 15 Pro"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag size={14} /> Бренд
              </label>
              <input 
                type="text" 
                placeholder="Apple"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers size={14} /> Категорія
              </label>
              <select 
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-600 appearance-none"
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Оберіть категорію</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <DollarSign size={14} /> Ціна ($)
              </label>
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="999.99"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Info size={14} /> Кількість на складі
              </label>
              <input 
                type="number" 
                required
                placeholder="50"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Upload size={14} /> URL зображення
              </label>
              <input 
                type="text" 
                inputMode="url"
                placeholder="https://…"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Info size={14} /> Опис товару
              </label>
              <textarea 
                required
                rows={4}
                placeholder="Детальний опис вашого товару..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium resize-none"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {/* Specifications */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers size={14} /> Характеристики (JSON формат)
              </label>
              <textarea 
                rows={4}
                placeholder={'{\n  "Колір": "Чорний",\n  "Матеріал": "Бавовна"\n}'}
                className="w-full px-6 py-4 bg-slate-900 text-emerald-400 border border-slate-800 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none transition-all font-mono text-sm resize-none shadow-inner"
                value={formData.specifications}
                onChange={(e) => setFormData({...formData, specifications: e.target.value})}
              />
              <p className="text-xs text-slate-400 font-medium px-2">
                Введіть характеристики у форматі JSON. Обов'язково використовуйте подвійні лапки для ключів та значень.
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" type="button" className="flex-1" onClick={onClose}>Скасувати</Button>
            <Button type="submit" className="flex-1 shadow-soft" isLoading={isLoading}>
              {product ? 'Зберегти зміни' : 'Додати товар'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
