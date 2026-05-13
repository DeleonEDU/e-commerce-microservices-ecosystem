import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  useGetSellerProductsQuery,
  useGetCategoriesQuery,
} from '../api/productApiSlice';
import { useGetSellerAnalyticsQuery } from '../api/orderApiSlice';
import { useGetSellerProfileQuery } from '../api/authApiSlice';
import ProductCard from '../components/ProductCard';
import { 
  Store, 
  Star, 
  Package, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Award,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import Button from '../components/ui/Button';
import { formatCompactNumber, formatNumber, formatCompactCurrency } from '../utils/format';

const StorePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const id = Number(sellerId);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Fetch seller's products
  const { data: sellerProductsData, isLoading: isProductsLoading, isFetching } = useGetSellerProductsQuery(
    { 
      seller_id: id, 
      page: currentPage, 
      search: debouncedSearch || undefined,
      category_name: selectedCategory !== 'all' ? selectedCategory : undefined
    },
    { skip: !id }
  );

  // Fetch all categories for the sidebar (or we could extract from a non-paginated query if we had one, but global categories are fine)
  const { data: allCategories } = useGetCategoriesQuery();

  // Fetch seller analytics
  const { data: sellerAnalytics, isLoading: isAnalyticsLoading } = useGetSellerAnalyticsQuery(
    id,
    { skip: !id }
  );

  // Fetch seller profile
  const { data: sellerProfile, isLoading: isProfileLoading } = useGetSellerProfileQuery(
    id,
    { skip: !id }
  );

  const products = sellerProductsData?.results || [];
  const totalProducts = sellerProductsData?.count || 0;
  const totalPages = Math.ceil(totalProducts / 10); // assuming 10 per page

  // Calculate store stats (Note: these are based on the current page's products, ideally should come from backend)
  const ratedProducts = products.filter((p) => p.rating != null && p.rating > 0);
  const avgStoreRating = ratedProducts.length > 0
    ? (ratedProducts.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedProducts.length).toFixed(1)
    : 'Новий';
  const totalReviews = products.reduce((sum, p) => sum + (p.review_count || 0), 0);
  const totalSellerProducts = sellerProductsData?.count || 0;
  const totalSellerSales = sellerAnalytics?.total_sales || 0;

  // Find some products with reviews to display as "featured reviews"
  const productsWithReviews = [...products]
    .filter(p => (p.review_count || 0) > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);

  const isLoading = isProductsLoading || isAnalyticsLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-32 bg-slate-50/50">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"></div>
          <Store className="text-brand-600 animate-pulse" size={32} />
        </div>
        <p className="mt-6 text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Завантаження магазину...</p>
      </div>
    );
  }

  if (!products.length && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-32 px-6 text-center bg-slate-50/50">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-soft border border-slate-100">
          <Store size={48} className="text-slate-300" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Магазин порожній або не існує</h1>
        <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg">
          На жаль, ми не змогли знайти товари цього продавця.
        </p>
        <Link to="/catalog">
          <Button size="lg" className="shadow-soft">Повернутися до каталогу</Button>
        </Link>
      </div>
    );
  }

  const sellerName = sellerProfile?.store_name || sellerProfile?.username || products[0]?.seller_name || `Продавець #${id}`;
  const sellerDescription = sellerProfile?.store_description || 'Офіційний магазин на платформі. Ми пропонуємо тільки якісні товари з гарантією та швидкою доставкою.';
  const sellerLogo = sellerProfile?.store_logo;

  return (
    <div className="min-h-screen bg-slate-50/30 pb-32">
      {/* Store Header Banner */}
      <div className="bg-white border-b border-slate-200/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-brand-100/50 opacity-50"></div>
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-brand-100/50 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-5xl shadow-xl shadow-brand-500/20 shrink-0 border-4 border-white overflow-hidden">
              {sellerLogo ? (
                <img src={sellerLogo} alt={sellerName} className="w-full h-full object-cover" />
              ) : (
                sellerName.charAt(0).toUpperCase()
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{sellerName}</h1>
                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                  <Award size={14} />
                  Premium
                </div>
              </div>
              
              <p className="text-slate-500 mb-6 max-w-2xl text-lg">
                {sellerDescription}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-slate-400" />
                  <span>Україна</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-slate-400" />
                  <span>На платформі з 2023 року</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <span className="text-emerald-700">Перевірений продавець</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-row md:flex-col gap-4 w-full md:w-auto">
              <Button className="flex-1 md:w-full shadow-soft gap-2" size="lg">
                <MessageSquare size={20} />
                Написати
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar: Stats & Categories */}
          <div className="lg:col-span-1 space-y-8">
            {/* Stats Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900 mb-6">Статистика магазину</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Star size={24} fill="currentColor" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1 tracking-tight">{avgStoreRating}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Рейтинг</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1 tracking-tight">{formatNumber(totalSellerProducts)}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Товарів</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1 tracking-tight" title={String(totalSellerSales)}>
                      {formatCompactNumber(totalSellerSales)}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Продажів</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1 tracking-tight" title={String(totalReviews)}>
                      {formatCompactNumber(totalReviews)}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Відгуків</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm sticky top-24">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">Категорії</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-sm font-bold ${
                    selectedCategory === 'all' 
                      ? 'bg-brand-50 text-brand-700' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Всі товари</span>
                </button>
                {allCategories?.map(category => {
                  const isSelected = selectedCategory === category.name;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-sm font-bold ${
                        isSelected 
                          ? 'bg-brand-50 text-brand-700' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2 text-left">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content: Products & Reviews */}
          <div className="lg:col-span-3 space-y-12">
            
            {/* Top Products / Reviews Teaser */}
            {productsWithReviews.length > 0 && selectedCategory === 'all' && !searchTerm && (
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                  <Star className="text-amber-400" fill="currentColor" />
                  Популярні товари з відгуками
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {productsWithReviews.map(product => (
                    <div key={product.id} className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                          {(product.image_url || product.images?.[0]) ? (
                            <img src={product.image_url || product.images?.[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-full h-full p-4 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <Link to={`/product/${product.id}`} className="font-bold text-slate-900 line-clamp-2 hover:text-brand-600 transition-colors">
                            {product.name}
                          </Link>
                          <div className="flex items-center gap-1 mt-1 text-amber-400">
                            <Star size={14} fill="currentColor" />
                            <span className="text-xs font-bold text-slate-700">{product.rating}</span>
                            <span className="text-xs text-slate-400 font-medium">({product.review_count})</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto bg-slate-50 p-4 rounded-2xl relative">
                        <div className="absolute -top-2 left-6 text-slate-300">
                          <MessageSquare size={24} fill="currentColor" />
                        </div>
                        <p className="text-sm text-slate-600 italic relative z-10 mt-2 line-clamp-3">
                          "Чудовий товар, дуже задоволений якістю. Продавець швидко відправив замовлення. Рекомендую!"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products List */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {selectedCategory === 'all' ? 'Всі товари' : selectedCategory}
                  <span className="ml-3 text-lg text-slate-400 font-medium">({totalProducts})</span>
                </h2>
                
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Пошук по магазину..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-sm shadow-sm"
                  />
                </div>
              </div>

              {isFetching ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-brand-500 mb-4" size={48} />
                  <p className="text-slate-500 font-bold">Завантаження товарів...</p>
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {products.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isFetching}
                        className="bg-white shadow-sm"
                      >
                        Попередня
                      </Button>
                      <span className="text-sm font-bold text-slate-500">
                        Сторінка {currentPage} з {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || isFetching}
                        className="bg-white shadow-sm"
                      >
                        Наступна
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Нічого не знайдено</h4>
                  <p className="text-slate-500 max-w-sm mx-auto">Спробуйте змінити пошуковий запит або обрати іншу категорію.</p>
                  {(searchTerm || selectedCategory !== 'all') && (
                    <Button 
                      variant="outline" 
                      className="mt-6"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                      }}
                    >
                      Скинути фільтри
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorePage;
