import React, { useState, useEffect } from 'react';
import { useGetProductsQuery, useGetCategoriesQuery } from '../api/productApiSlice';
import { ProductFilters } from '../types/product';
import ProductCard from '../components/ProductCard';
import Button from '../components/ui/Button';
import { Search, Filter, SlidersHorizontal, Package, Loader2, X, Star, CheckCircle2, RotateCcw } from 'lucide-react';

const CatalogPage: React.FC = () => {
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    search: '',
    category: '',
    ordering: '-created_at',
    min_price: undefined,
    max_price: undefined,
    min_rating: undefined,
    in_stock: undefined,
    brand: '',
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: productsData, isLoading, isFetching, error } = useGetProductsQuery(filters);
  const { data: categories } = useGetCategoriesQuery();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCategoryChange = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      category: prev.category === categoryId ? '' : categoryId,
      page: 1,
    }));
  };

  const handleSortChange = (ordering: string) => {
    setFilters((prev) => ({ ...prev, ordering, page: 1 }));
  };

  const applyPriceFilter = () => {
    setFilters(prev => ({
      ...prev,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      page: 1
    }));
  };

  const toggleInStock = () => {
    setFilters(prev => ({
      ...prev,
      in_stock: prev.in_stock ? undefined : true,
      page: 1
    }));
  };

  const setRatingFilter = (rating: number) => {
    setFilters(prev => ({
      ...prev,
      min_rating: prev.min_rating === rating ? undefined : rating,
      page: 1
    }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      search: '',
      category: '',
      ordering: '-created_at',
      min_price: undefined,
      max_price: undefined,
      min_rating: undefined,
      in_stock: undefined,
      brand: '',
    });
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-12 pb-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-widest mb-4">
              Каталог товарів
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Знайдіть найкращі <br />
              <span className="text-brand-600">пропозиції</span> для себе.
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed">
              Тисячі унікальних товарів від перевірених продавців з усього світу.
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-brand-500 transition-colors">
              <Search size={20} />
            </span>
            <input
              type="text"
              placeholder="Пошук товарів..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-3xl shadow-soft focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-300"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className={`
            fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-0 lg:block
            ${isSidebarOpen ? 'block' : 'hidden'}
          `}>
            {/* Mobile Overlay */}
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white lg:bg-transparent lg:w-64 p-8 lg:p-0 shadow-2xl lg:shadow-none overflow-y-auto transition-transform duration-500">
              <div className="flex items-center justify-between mb-8 lg:hidden">
                <h2 className="text-xl font-bold">Фільтри</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-10">
                {/* Categories */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Filter size={14} />
                    Категорії
                  </h3>
                  <div className="space-y-3">
                    {categories?.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id.toString())}
                        className={`
                          w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300
                          ${filters.category === cat.id.toString() 
                            ? 'bg-brand-600 text-white shadow-soft translate-x-2' 
                            : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'}
                        `}
                      >
                        {cat.name}
                        {filters.category === cat.id.toString() && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-soft" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <SlidersHorizontal size={14} />
                    Ціновий діапазон
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        placeholder="Від" 
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-brand-500 transition-colors" 
                      />
                      <input 
                        type="number" 
                        placeholder="До" 
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-brand-500 transition-colors" 
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={applyPriceFilter}>Застосувати</Button>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Наявність
                  </h3>
                  <button
                    onClick={toggleInStock}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all
                      ${filters.in_stock 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'}
                    `}
                  >
                    В наявності
                    {filters.in_stock && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </button>
                </div>

                {/* Reset Filters */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-slate-400 hover:text-rose-500 gap-2"
                  onClick={resetFilters}
                >
                  <RotateCcw size={14} />
                  Скинути фільтри
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-8">
              <div className="text-sm font-bold text-slate-400">
                Показано <span className="text-slate-900">{productsData?.results?.length || 0}</span> з <span className="text-slate-900">{productsData?.count || 0}</span> товарів
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Filter size={18} />
                  Фільтри
                </button>
                
                <select 
                  value={filters.ordering}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-brand-500 transition-all cursor-pointer"
                >
                  <option value="-created_at">Спочатку нові</option>
                  <option value="price">Від дешевих</option>
                  <option value="-price">Від дорогих</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            {isLoading || isFetching ? (
              <div className="flex flex-col items-center justify-center py-32 opacity-50">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Оновлення товарів...</p>
              </div>
            ) : productsData?.results?.length === 0 ? (
              <div className="bg-white rounded-[40px] border border-slate-100 p-24 text-center shadow-soft">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Package size={48} className="text-slate-200" />
                </div>
                <h2 className="text-2xl font-extrabold mb-3">Товарів не знайдено</h2>
                <p className="text-slate-500 mb-10 max-w-sm mx-auto">Спробуйте змінити параметри пошуку або фільтри, щоб знайти те, що шукаєте.</p>
                <Button onClick={resetFilters}>
                  Скинути всі фільтри
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 animate-fade-in">
                {productsData?.results?.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {productsData && productsData.count > 0 && Math.ceil(productsData.count / 10) > 1 && (
              <div className="mt-20 flex items-center justify-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!productsData.previous}
                  onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                >
                  Попередня
                </Button>
                <div className="flex items-center gap-2">
                  {[...Array(Math.ceil(productsData.count / 10))].map((_, i) => (
                    <button 
                      key={i}
                      className={`w-10 h-10 rounded-xl font-bold transition-colors ${
                        (filters.page || 1) === i + 1 
                          ? 'bg-brand-600 text-white shadow-soft' 
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                      onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!productsData.next}
                  onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                >
                  Наступна
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
