import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ProductCard from '../components/ProductCard';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const FavoritesPage: React.FC = () => {
  const favorites = useSelector((state: RootState) => state.favorites.items);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center">
            <Heart size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Мої обрані товари</h1>
            <p className="text-slate-500 font-medium mt-1">
              {favorites.length} {favorites.length === 1 ? 'товар' : [2, 3, 4].includes(favorites.length % 10) && ![12, 13, 14].includes(favorites.length % 100) ? 'товари' : 'товарів'}
            </p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-[40px] p-16 border border-slate-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-rose-300" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Список порожній</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              Ви ще не додали жодного товару до обраного. Перейдіть до каталогу, щоб знайти щось цікаве.
            </p>
            <Link to="/catalog">
              <Button size="lg" className="shadow-soft">Перейти до каталогу</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
