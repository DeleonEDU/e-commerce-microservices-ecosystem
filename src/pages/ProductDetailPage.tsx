import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  useGetProductQuery, 
  useGetProductsQuery,
} from '../api/productApiSlice';
import { useCreateReviewMutation, useGetReviewsByProductQuery } from '../api/ratingApiSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import Button from '../components/ui/Button';
import ProductCard from '../components/ProductCard';
import { addItem } from '../features/cart/cartSlice';
import { 
  ShoppingCart, 
  Star, 
  Package, 
  ShieldCheck, 
  Truck, 
  ArrowLeft, 
  Loader2, 
  Heart,
  Share2,
  CheckCircle2,
  MessageSquare,
  User,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { data: product, isLoading, error } = useGetProductQuery(productId);
  const { data: reviews, isLoading: isLoadingReviews } = useGetReviewsByProductQuery(productId);
  const [createReview, { isLoading: isCreatingReview }] = useCreateReviewMutation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // Fetch similar products in the same category
  const { data: similarProductsData } = useGetProductsQuery(
    { category: String(product?.category), page: 1 },
    { skip: !product }
  );

  const [activeImage, setActiveImage] = useState<string | undefined>(undefined);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (product?.image_url) {
      setActiveImage(product.image_url);
    }
  }, [product]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess(false);

    if (!reviewComment.trim()) {
      setReviewError('Будь ласка, залиште коментар');
      return;
    }

    try {
      if (!user?.id) {
        setReviewError('Не вдалося визначити користувача. Перезайдіть в акаунт і спробуйте ще раз.');
        return;
      }
      await createReview({
        user_id: user.id,
        product_id: productId,
        rating: reviewRating,
        comment: reviewComment,
      }).unwrap();
      setReviewSuccess(true);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError('Не вдалося надіслати відгук. Спробуйте пізніше.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-32 opacity-50">
        <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Завантаження деталей товару...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-8">
          <Package size={48} className="text-rose-200" />
        </div>
        <h1 className="text-3xl font-extrabold mb-4">Товар не знайдено</h1>
        <p className="text-slate-500 mb-10 max-w-md mx-auto">
          На жаль, ми не змогли знайти товар, який ви шукаєте. Можливо, він був видалений або посилання невірне.
        </p>
        <Link to="/catalog">
          <Button size="lg">Повернутися до каталогу</Button>
        </Link>
      </div>
    );
  }

  const images = product.images || [product.image_url].filter(Boolean) as string[];
  const similarProducts = similarProductsData?.results?.filter(p => p.id !== product.id).slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Breadcrumbs & Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-600 font-bold text-sm transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Назад до каталогу
          </Link>
          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
              <Heart size={20} />
            </button>
            <button className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image Gallery */}
          <div className="space-y-6">
            <div className="aspect-square rounded-[40px] bg-slate-50 overflow-hidden border border-slate-100 shadow-soft group">
              {activeImage ? (
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={120} className="text-slate-200" />
                </div>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`
                      relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-300
                      ${activeImage === img ? 'border-brand-500 shadow-soft scale-105' : 'border-transparent hover:border-slate-200'}
                    `}
                  >
                    <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-widest">
                  {product.category_name}
                </div>
                {product.is_premium && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-widest">
                    <Star size={12} fill="currentColor" />
                    Premium Seller
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                {product.name}
              </h1>
              
                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={18} fill={s <= (product.rating || 4.5) ? "currentColor" : "none"} className={s > (product.rating || 4.5) ? "text-slate-200" : ""} />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-slate-900 ml-1">{product.rating || '4.5'}</span>
                    <span className="text-sm text-slate-400">({product.review_count || '12'} відгуків)</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className={`flex items-center gap-2 font-bold text-sm ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {product.stock > 0 ? (
                      <>
                        <CheckCircle2 size={18} />
                        В наявності
                      </>
                    ) : (
                      <>
                        <X size={18} />
                        Немає в наявності
                      </>
                    )}
                  </div>
                </div>

              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-10">
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">${product.price.toFixed(2)}</span>
                  <span className="text-slate-400 line-through font-medium text-lg">${(product.price * 1.2).toFixed(2)}</span>
                  <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-bold rounded-lg">-20%</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {product.stock > 0 ? (
                    <>
                      <Button 
                        size="lg" 
                        className="flex-1 shadow-soft gap-2"
                        onClick={() => product && dispatch(addItem(product))}
                      >
                        <ShoppingCart size={20} />
                        Додати в кошик
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="lg" 
                        className="flex-1"
                        onClick={() => {
                          if (product) {
                            dispatch(addItem(product));
                            navigate('/cart');
                          }
                        }}
                      >
                        Купити зараз
                      </Button>
                    </>
                  ) : (
                    <div className="w-full py-4 text-center rounded-2xl bg-slate-100 text-slate-400 font-bold uppercase tracking-widest text-sm">
                      Немає в наявності
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="flex items-start gap-4 p-4 rounded-2xl border border-slate-50 bg-white shadow-sm">
                  <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">Безкоштовна доставка</h4>
                    <p className="text-xs text-slate-500">Для замовлень від $100</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl border border-slate-50 bg-white shadow-sm">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">Гарантія якості</h4>
                    <p className="text-xs text-slate-500">12 місяців від виробника</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-slate-900">Про товар</h3>
                <p className="text-slate-500 leading-relaxed text-lg">
                  {product.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications & Seller */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-10">
            <h3 className="text-2xl font-extrabold text-slate-900">Характеристики</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {product.specifications ? (
                Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">{key}</span>
                    <span className="text-slate-900 font-bold">{value}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Матеріал</span>
                    <span className="text-slate-900 font-bold">Преміум алюміній</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Вага</span>
                    <span className="text-slate-900 font-bold">1.2 кг</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Розміри</span>
                    <span className="text-slate-900 font-bold">30 x 20 x 5 см</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Колір</span>
                    <span className="text-slate-900 font-bold">Space Gray</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-extrabold text-slate-900">Продавець</h3>
            <div className="p-8 rounded-[32px] border border-slate-100 bg-slate-50/50 shadow-soft">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl shadow-soft">
                  {product.seller_name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">{product.seller_name || 'Premium Seller'}</h4>
                  <p className="text-slate-500 text-sm">На маркетплейсі з 2023</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Рейтинг</span>
                  <span className="text-slate-900 font-bold">4.9 / 5.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Товарів</span>
                  <span className="text-slate-900 font-bold">124</span>
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-2xl">Переглянути магазин</Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-32">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-12">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  <MessageSquare className="text-brand-600" />
                  Відгуки покупців
                  <span className="text-slate-300 text-lg font-bold ml-2">({reviews?.length || 0})</span>
                </h3>
              </div>

              {isLoadingReviews ? (
                <div className="flex items-center gap-3 text-slate-400 py-12">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Завантаження відгуків...</span>
                </div>
              ) : reviews && reviews.length > 0 ? (
                <div className="space-y-8">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-8 rounded-[32px] bg-slate-50/50 border border-slate-100 animate-fade-in">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                            <User size={24} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900">User #{review.user_id}</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                              {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: uk })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={14} fill={s <= review.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium italic">
                        "{review.comment || ''}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                  <MessageSquare size={48} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Поки що немає відгуків. Будьте першим!</p>
                </div>
              )}
            </div>

            {/* Add Review Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-soft sticky top-32">
                <h4 className="text-xl font-extrabold text-slate-900 mb-6 tracking-tight">Залишити відгук</h4>
                
                {isAuthenticated ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Ваша оцінка</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            className={`p-2 rounded-xl transition-all ${reviewRating >= s ? 'text-amber-400 bg-amber-50' : 'text-slate-200 hover:text-amber-200'}`}
                          >
                            <Star size={24} fill={reviewRating >= s ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Ваш коментар</label>
                      <textarea
                        rows={4}
                        placeholder="Поділіться враженнями від товару..."
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium resize-none"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                    </div>

                    {reviewError && (
                      <div className="p-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100 animate-shake">
                        {reviewError}
                      </div>
                    )}

                    {reviewSuccess && (
                      <div className="p-4 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-bold border border-emerald-100 flex items-center gap-2">
                        <CheckCircle2 size={18} />
                        Дякуємо за ваш відгук!
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full shadow-soft gap-2" 
                      isLoading={isCreatingReview}
                      disabled={reviewSuccess}
                    >
                      <Send size={18} />
                      Надіслати відгук
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm mb-6 font-medium">Тільки авторизовані користувачі можуть залишати відгуки.</p>
                    <Link to="/login">
                      <Button variant="outline" className="w-full">Увійти</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-32">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Схожі товари</h3>
              <Link to={`/catalog?category=${product.category}`} className="text-brand-600 font-bold hover:underline decoration-2 underline-offset-4">
                Дивитися всі
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
