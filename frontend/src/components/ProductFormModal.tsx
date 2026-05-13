import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload, Package, DollarSign, Tag, Info, Layers, Plus, Trash2 } from 'lucide-react';
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
  const [specs, setSpecs] = useState<Array<{key: string, value: string}>>([]);
  const [images, setImages] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    price: '',
    discount_price: '',
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
        discount_price: product.discount_price ? product.discount_price.toString() : '',
        category_id: product.category != null ? String(product.category) : '',
        image_url: product.image_url || '',
        stock: product.stock.toString(),
      });
      const existingImages = (product.images && product.images.length > 0)
        ? product.images
        : [product.image_url || ''].filter(Boolean);
      const normalized = existingImages
        .map((img) => img.trim())
        .filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx);
      setImages(normalized.length > 0 ? normalized : ['']);
      
      if (product.specifications && typeof product.specifications === 'object') {
        const specArr = Object.entries(product.specifications).map(([key, value]) => ({
          key, 
          value: String(value)
        }));
        setSpecs(specArr.length > 0 ? specArr : [{key: '', value: ''}]);
      } else {
        setSpecs([{key: '', value: ''}]);
      }
    } else {
      setFormData({
        name: '',
        brand: '',
        description: '',
        price: '',
        discount_price: '',
        category_id: '',
        image_url: '',
        stock: '',
      });
      setSpecs([{key: '', value: ''}]);
      setImages(['']);
    }
  }, [product, isOpen]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    setFormData({...formData, category_id: newCatId});
    
    // Apply presets if creating new product and specs are empty
    if (!product && specs.every(s => !s.key && !s.value)) {
      const cat = categories?.find(c => c.id.toString() === newCatId);
      if (cat) {
        const name = cat.name.toLowerCase();
        let presetKeys: string[] = [];
        if (name.includes('електроніка')) presetKeys = ['Модель', 'Колір', 'Пам\'ять', 'Процесор'];
        else if (name.includes('одяг') || name.includes('взуття')) presetKeys = ['Розмір', 'Колір', 'Матеріал', 'Сезон'];
        else if (name.includes('дім') || name.includes('меблі')) presetKeys = ['Матеріал', 'Габарити (ВxШxГ)', 'Колір'];
        else if (name.includes('спорт')) presetKeys = ['Тип', 'Вага', 'Матеріал'];
        
        if (presetKeys.length > 0) {
          setSpecs(presetKeys.map(key => ({key, value: ''})));
        }
      }
    }
  };

  const addSpec = () => setSpecs([...specs, {key: '', value: ''}]);
  
  const removeSpec = (index: number) => {
    const newSpecs = [...specs];
    newSpecs.splice(index, 1);
    setSpecs(newSpecs.length > 0 ? newSpecs : [{key: '', value: ''}]);
  };
  
  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = val;
    setSpecs(newSpecs);
  };

  const addImage = () => setImages((prev) => [...prev, '']);

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const updateImage = (index: number, val: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? val : img)));
  };

  const normalizedImages = useMemo(
    () => images.map((img) => img.trim()).filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx),
    [images]
  );

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
    let specsObj: Record<string, string> = {};
    
    specs.forEach(spec => {
      if (spec.key.trim() && spec.value.trim()) {
        specsObj[spec.key.trim()] = spec.value.trim();
      }
    });

    const data = {
      ...formData,
      image_url: normalizedImages[0] || '',
      images: normalizedImages,
      price: parseFloat(formData.price),
      discount_price: formData.discount_price ? parseFloat(formData.discount_price) : undefined,
      stock: parseInt(formData.stock),
      category_id: parseInt(formData.category_id),
      specifications: specsObj,
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
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium shadow-sm hover:border-slate-300"
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
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium shadow-sm hover:border-slate-300"
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
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-bold text-slate-600 appearance-none shadow-sm hover:border-slate-300"
                value={formData.category_id}
                onChange={handleCategoryChange}
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
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium shadow-sm hover:border-slate-300"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            {/* Discount Price */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag size={14} /> Акційна ціна ($)
              </label>
              <input 
                type="number" 
                step="0.01"
                placeholder="799.99 (опціонально)"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium shadow-sm hover:border-slate-300"
                value={formData.discount_price}
                onChange={(e) => setFormData({...formData, discount_price: e.target.value})}
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
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium shadow-sm hover:border-slate-300"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Upload size={14} /> Фото товару (перше = головне в каталозі)
              </label>
              <div className="space-y-3">
                {images.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="url"
                      placeholder={idx === 0 ? 'https://... (головне фото)' : 'https://... (додаткове фото)'}
                      className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium shadow-sm hover:border-slate-300"
                      value={img}
                      onChange={(e) => updateImage(idx, e.target.value)}
                    />
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Видалити фото"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addImage}
                >
                  <Plus size={16} />
                  Додати фото
                </Button>
                <span className="text-xs text-slate-500 self-center">
                  Перше фото завжди використовується як головне в каталозі.
                </span>
              </div>
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
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium resize-none shadow-sm hover:border-slate-300"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {/* Specifications */}
            <div className="md:col-span-2 space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Layers size={14} /> Характеристики
              </label>
              
              <div className="space-y-3">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Назва (напр. Колір)"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium shadow-sm hover:border-slate-300"
                      value={spec.key}
                      onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Значення (напр. Чорний)"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium shadow-sm hover:border-slate-300"
                      value={spec.value}
                      onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => removeSpec(idx)}
                      className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 border-dashed border-2 hover:border-brand-300 hover:bg-brand-50/50"
                onClick={addSpec}
              >
                <Plus size={16} />
                Додати характеристику
              </Button>
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
