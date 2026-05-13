import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useGetProductQuery, 
  useGetProductsQuery,
  useGetSellerProductsQuery,
} from '../api/productApiSlice';
import { useCreateReviewMutation, useGetReviewsByProductQuery } from '../api/ratingApiSlice';
import { 
  useCheckUserBoughtProductQuery,
  useGetSellerAnalyticsQuery
} from '../api/orderApiSlice';
import { useGetSellerProfileQuery } from '../api/authApiSlice';
import { RootState } from '../store/store';
import Button from '../components/ui/Button';
import ProductCard from '../components/ProductCard';
import { addItem } from '../features/cart/cartSlice';
import { toggleFavorite } from '../features/favorites/favoritesSlice';
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
  Send,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Store,
  Award,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { formatCurrency } from '../utils/format';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { data: product, isLoading, error } = useGetProductQuery(productId);
  const { data: reviews, isLoading: isLoadingReviews } = useGetReviewsByProductQuery(productId);
  const [createReview, { isLoading: isCreatingReview }] = useCreateReviewMutation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const { data: purchaseCheck } = useCheckUserBoughtProductQuery(
    { userId: user?.id || 0, productId },
    { skip: !isAuthenticated || !user }
  );
  const hasBought = purchaseCheck?.has_bought || false;
  
  const favorites = useSelector((state: RootState) => state.favorites.items);
  const isFavorite = product ? favorites.some(item => item.id === product.id) : false;

  const handleToggleFavorite = () => {
    if (product) {
      dispatch(toggleFavorite(product));
    }
  };

  // Fetch similar products in the same category
  const { data: similarProductsData } = useGetProductsQuery(
    { category: String(product?.category), page: 1 },
    { skip: !product }
  );

  // Fetch seller's products to calculate store rating and total products
  const { data: sellerProductsData } = useGetSellerProductsQuery(
    { seller_id: product?.seller_id, page: 1 },
    { skip: !product?.seller_id }
  );

  // Fetch seller analytics for total sales
  const { data: sellerAnalytics } = useGetSellerAnalyticsQuery(
    product?.seller_id || 0,
    { skip: !product?.seller_id }
  );

  // Fetch seller profile
  const { data: sellerProfile } = useGetSellerProfileQuery(
    product?.seller_id || 0,
    { skip: !product?.seller_id }
  );

  const ratedProducts = sellerProductsData?.results?.filter((p) => p.rating != null && p.rating > 0) ?? [];
  const avgStoreRating = ratedProducts.length > 0
    ? (ratedProducts.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedProducts.length).toFixed(1)
    : 'Новий';
  const totalSellerProducts = sellerProductsData?.count || 0;
  const totalSellerSales = sellerAnalytics?.total_sales || 0;

  const [activeImage, setActiveImage] = useState<string | undefined>(undefined);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    // Reset scroll position on mount
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    const primaryImage = product.image_url?.trim();
    const fallbackImage = product.images?.find((img) => img?.trim());
    setActiveImage(primaryImage || fallbackImage);
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
        user_name: user.username,
        product_id: productId,
        rating: reviewRating,
        comment: reviewComment,
      }).unwrap();
      setReviewSuccess(true);
      setReviewComment('');
      setReviewRating(5);
    } catch (err: any) {
      if (err?.status === 429) {
        setReviewError('Ви вже залишали відгук на цей товар протягом останнього тижня.');
      } else {
        setReviewError('Не вдалося надіслати відгук. Спробуйте пізніше.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-32 bg-slate-50/50">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"></div>
          <Package className="text-brand-600 animate-pulse" size={32} />
        </div>
        <p className="mt-6 text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Завантаження...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-32 px-6 text-center bg-slate-50/50">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-soft border border-slate-100">
          <Package size={48} className="text-slate-300" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Товар не знайдено</h1>
        <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg">
          На жаль, ми не змогли знайти товар, який ви шукаєте. Можливо, він був видалений або посилання невірне.
        </p>
        <Link to="/catalog">
          <Button size="lg" className="shadow-soft">Повернутися до каталогу</Button>
        </Link>
      </div>
    );
  }

  const primaryImage = product.image_url?.trim();
  const fallbackImages = (product.images || []).filter((img): img is string => Boolean(img?.trim()));
  const images = primaryImage
    ? [primaryImage, ...fallbackImages.filter((img) => img !== primaryImage)]
    : fallbackImages;
  const similarProducts = similarProductsData?.results?.filter(p => p.id !== product.id).slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-slate-50/30 pb-32">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <nav className="flex items-center text-sm font-medium text-slate-500">
            <Link to="/" className="hover:text-brand-600 transition-colors">Головна</Link>
            <ChevronRight size={16} className="mx-2 text-slate-300" />
            <Link to="/catalog" className="hover:text-brand-600 transition-colors">Каталог</Link>
            <ChevronRight size={16} className="mx-2 text-slate-300" />
            <Link to={`/catalog?category=${product.category}`} className="hover:text-brand-600 transition-colors truncate max-w-[120px] sm:max-w-[200px]">
              {product.category_name}
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <button 
              className={`p-2 rounded-full transition-all flex items-center justify-center ${
                isFavorite 
                  ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' 
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
              onClick={handleToggleFavorite}
              title={isFavorite ? "Видалити з обраного" : "Додати в обране"}
            >
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-scale-in" : ""} />
            </button>
            <button className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          
          {/* Left Column: Image Gallery (Sticky) */}
          <div className="lg:w-1/2">
            <div className="sticky top-24 space-y-6">
              {/* Main Image */}
              <div className="aspect-square rounded-[32px] bg-white overflow-hidden border border-slate-200/60 shadow-sm group relative flex items-center justify-center">
                {activeImage ? (
                  <img 
                    src={activeImage} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package size={120} className="text-slate-200" />
                )}

                {/* Image Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        const currentIndex = images.indexOf(activeImage || '');
                        const prevIndex = currentIndex <= 0 ? images.length - 1 : currentIndex - 1;
                        setActiveImage(images[prevIndex]);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white backdrop-blur-sm text-slate-700 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-110"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        const currentIndex = images.indexOf(activeImage || '');
                        const nextIndex = currentIndex >= images.length - 1 ? 0 : currentIndex + 1;
                        setActiveImage(images[nextIndex]);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white backdrop-blur-sm text-slate-700 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-110"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                  {product.discount_price && (
                    <span className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm">
                      Знижка {Math.round((1 - product.discount_price / product.price) * 100)}%
                    </span>
                  )}
                  {product.is_premium && (
                    <span className="px-3 py-1.5 bg-amber-400 text-amber-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5">
                      <Star size={12} fill="currentColor" />
                      Premium
                    </span>
                  )}
                </div>
              </div>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`
                        relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white transition-all duration-300 snap-center
                        ${activeImage === img 
                          ? 'ring-2 ring-brand-500 ring-offset-2 shadow-md scale-[1.02]' 
                          : 'border border-slate-200 hover:border-brand-300 hover:shadow-sm'}
                      `}
                    >
                      <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Details */}
          <div className="lg:w-1/2 flex flex-col">
            
            {/* Header Info */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Link to={`/catalog?category=${product.category}`} className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">
                  {product.category_name}
                </Link>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 text-sm font-medium flex items-center gap-1">
                  <Clock size={14} />
                  Код: {product.id.toString().padStart(6, '0')}
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-[1.1]">
                {product.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50">
                  <div className="flex items-center text-amber-400">
                    <Star size={16} fill="currentColor" />
                  </div>
                  <span className="text-sm font-bold text-amber-900">{(product.rating ?? 0).toFixed(1)}</span>
                  <span className="text-sm text-amber-700/60 font-medium">({product.review_count ?? 0} відгуків)</span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm ${
                  product.stock > 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' 
                    : 'bg-rose-50 text-rose-700 border-rose-100/50'
                }`}>
                  {product.stock > 0 ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      В наявності ({product.stock} шт)
                    </>
                  ) : (
                    <>
                      <X size={16} className="text-rose-500" />
                      Немає в наявності
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Price & Action Card */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/60 shadow-sm mb-10 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Ціна</p>
                    <div className="flex items-baseline gap-3">
                      {product.discount_price ? (
                        <>
                          <span className="text-4xl sm:text-5xl font-extrabold text-rose-600 tracking-tight">{formatCurrency(product.discount_price)}</span>
                          <span className="text-slate-400 line-through font-medium text-xl">{formatCurrency(product.price)}</span>
                        </>
                      ) : (
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {product.is_active === false || product.stock <= 0 ? (
                    <div className="w-full py-4 text-center rounded-2xl bg-slate-100 text-slate-500 font-bold uppercase tracking-widest text-sm border border-slate-200">
                      Товар недоступний
                    </div>
                  ) : (
                    <>
                      <Button 
                        size="lg" 
                        className="flex-1 shadow-md shadow-brand-500/20 gap-2 text-base h-14 rounded-2xl"
                        onClick={() => product && dispatch(addItem(product))}
                      >
                        <ShoppingCart size={22} />
                        Додати в кошик
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="lg" 
                        className="flex-1 h-14 rounded-2xl text-base bg-slate-900 text-white hover:bg-slate-800 border-transparent"
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
                  )}
                </div>
              </div>
            </div>

            {/* Quick Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Швидка доставка</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Відправка в день замовлення</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Гарантія якості</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Повернення протягом 14 днів</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-12">
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                Опис товару
              </h3>
              <div className="prose prose-slate prose-lg max-w-none">
                <p className="text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Specifications */}
            <div className="mb-12">
              <h3 className="text-xl font-extrabold text-slate-900 mb-6">Характеристики</h3>
              <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {product.specifications ? (
                    Object.entries(product.specifications).map(([key, value], idx) => (
                      <div key={key} className={`flex flex-col sm:flex-row sm:items-center p-4 sm:p-5 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <span className="text-slate-500 font-medium sm:w-1/3 mb-1 sm:mb-0">{key}</span>
                        <span className="text-slate-900 font-bold sm:w-2/3">{value}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center p-4 sm:p-5 bg-slate-50/50">
                        <span className="text-slate-500 font-medium sm:w-1/3 mb-1 sm:mb-0">Матеріал</span>
                        <span className="text-slate-900 font-bold sm:w-2/3">Преміум якість</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center p-4 sm:p-5 bg-white">
                        <span className="text-slate-500 font-medium sm:w-1/3 mb-1 sm:mb-0">Стан</span>
                        <span className="text-slate-900 font-bold sm:w-2/3">Новий</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center p-4 sm:p-5 bg-slate-50/50">
                        <span className="text-slate-500 font-medium sm:w-1/3 mb-1 sm:mb-0">Країна виробник</span>
                        <span className="text-slate-900 font-bold sm:w-2/3">Вказано на упаковці</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-6">Продавець</h3>
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-brand-200 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-brand-500/20 overflow-hidden shrink-0">
                    {sellerProfile?.store_logo ? (
                      <img src={sellerProfile.store_logo} alt={sellerProfile.store_name || sellerProfile.username} className="w-full h-full object-cover" />
                    ) : (
                      (sellerProfile?.store_name || sellerProfile?.username || product.seller_name || 'S').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      {sellerProfile?.store_name || sellerProfile?.username || product.seller_name || 'Premium Seller'}
                      {product.is_premium && <Award size={18} className="text-amber-500" />}
                    </h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        <Star size={14} className="text-amber-400" fill="currentColor" />
                        {avgStoreRating}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-sm font-medium text-slate-500">
                        {totalSellerSales} замовлень
                      </span>
                    </div>
                  </div>
                </div>
                <Link to={`/store/${product.seller_id}`}>
                  <Button variant="outline" className="w-full sm:w-auto rounded-xl group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:border-brand-200 transition-all">
                    <Store size={18} className="mr-2" />
                    Магазин
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-24 pt-16 border-t border-slate-200/60">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            
            {/* Reviews List */}
            <div className="lg:w-2/3">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  Відгуки покупців
                  <span className="bg-slate-100 text-slate-600 text-lg px-3 py-1 rounded-xl font-bold">
                    {reviews?.length || 0}
                  </span>
                </h3>
              </div>

              {isLoadingReviews ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="animate-spin mb-4 text-brand-500" size={32} />
                  <span className="font-medium">Завантаження відгуків...</span>
                </div>
              ) : reviews && reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-6 sm:p-8 rounded-[32px] bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-extrabold text-slate-900">{review.user_name || `Користувач #${review.user_id}`}</h4>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                                <CheckCircle2 size={10} />
                                Покупець
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                              {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: uk })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50 self-start sm:self-auto">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={14} fill={s <= review.rating ? "currentColor" : "none"} className={s <= review.rating ? "text-amber-400" : "text-amber-200"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-lg">
                        {review.comment || ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center bg-white rounded-[32px] border border-dashed border-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Немає відгуків</h4>
                  <p className="text-slate-500 max-w-sm mx-auto">Поділіться своїми враженнями про товар першим. Ваш відгук допоможе іншим зробити правильний вибір.</p>
                </div>
              )}
            </div>

            {/* Add Review Form */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/60 shadow-sm sticky top-24">
                <h4 className="text-xl font-extrabold text-slate-900 mb-2">Написати відгук</h4>
                <p className="text-sm text-slate-500 mb-8">Розкажіть про свій досвід використання товару</p>
                
                {isAuthenticated ? (
                  hasBought ? (
                    <form onSubmit={handleReviewSubmit} className="space-y-6">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-3 block">Оцініть товар</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setReviewRating(s)}
                              className={`p-3 rounded-2xl transition-all ${reviewRating >= s ? 'text-amber-400 bg-amber-50 border border-amber-100/50' : 'text-slate-300 bg-slate-50 hover:bg-slate-100 border border-transparent'}`}
                            >
                              <Star size={24} fill={reviewRating >= s ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">Ваш коментар</label>
                        <textarea
                          rows={4}
                          placeholder="Що вам сподобалось? Що можна покращити?"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium resize-none text-slate-700 placeholder:text-slate-400"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                        />
                      </div>

                      {reviewError && (
                        <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100 flex items-start gap-3">
                          <AlertCircle size={18} className="shrink-0 mt-0.5" />
                          <span>{reviewError}</span>
                        </div>
                      )}

                      {reviewSuccess && (
                        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100 flex items-start gap-3">
                          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                          <span>Дякуємо! Ваш відгук успішно додано.</span>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full shadow-md gap-2 h-14 rounded-2xl text-base" 
                        isLoading={isCreatingReview}
                        disabled={reviewSuccess}
                      >
                        <Send size={20} />
                        Надіслати відгук
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <ShoppingCart size={24} className="text-slate-400" />
                      </div>
                      <h5 className="font-bold text-slate-900 mb-2">Купіть товар</h5>
                      <p className="text-slate-500 text-sm">Тільки покупці, які придбали цей товар, можуть залишати відгуки.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <User size={24} className="text-slate-400" />
                    </div>
                    <h5 className="font-bold text-slate-900 mb-2">Увійдіть в акаунт</h5>
                    <p className="text-slate-500 text-sm mb-6">Авторизуйтесь, щоб мати можливість залишати відгуки.</p>
                    <Link to="/login">
                      <Button className="w-full rounded-xl h-12">Увійти</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-slate-200/60">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Схожі товари</h3>
                <p className="text-slate-500">Вас також можуть зацікавити</p>
              </div>
              <Link to={`/catalog?category=${product.category}`} className="hidden sm:inline-flex items-center gap-1 text-brand-600 font-bold hover:text-brand-700 transition-colors group">
                Дивитися всі
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link to={`/catalog?category=${product.category}`}>
                <Button variant="outline" className="w-full rounded-xl">Дивитися всі товари</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
