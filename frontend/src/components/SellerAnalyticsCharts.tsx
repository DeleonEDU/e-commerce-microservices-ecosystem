import React, { useEffect, useRef, useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { SellerAnalytics } from '../api/orderApiSlice';
import { AlertCircle, Lock } from 'lucide-react';
import Button from './ui/Button';
import { formatNumber, formatCompactNumber } from '../utils/format';

interface SellerAnalyticsChartsProps {
  data?: SellerAnalytics;
  tier: string;
  onUpgrade: (tier: 'plus' | 'pro' | 'vip') => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
        <p className="font-bold text-slate-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Дохід' ? '$' : ''}{formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface MeasuredChartProps {
  height: number;
  children: (width: number, height: number) => React.ReactNode;
}

const MeasuredChart: React.FC<MeasuredChartProps> = ({ height, children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      if (nextWidth > 0) setWidth(nextWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0" style={{ height }}>
      {width > 0 ? children(width, height) : null}
    </div>
  );
};

const SellerAnalyticsCharts: React.FC<SellerAnalyticsChartsProps> = ({ data, tier, onUpgrade }) => {
  const isFree = tier === 'free';
  const isPlus = tier === 'plus';
  const isPro = tier === 'pro';
  const isVip = tier === 'vip';

  const salesData = data?.sales_by_date || [];
  const topProductsData = data?.top_products?.map((p, i) => ({
    name: `Товар #${p.product_id}`,
    revenue: p.revenue,
    sales: p.sales,
  })) || [];

  // Mock data for locked states
  const mockSalesData = [
    { date: '01.04', sales: 12, revenue: 120 },
    { date: '05.04', sales: 19, revenue: 250 },
    { date: '10.04', sales: 15, revenue: 180 },
    { date: '15.04', sales: 25, revenue: 320 },
    { date: '20.04', sales: 22, revenue: 290 },
    { date: '25.04', sales: 30, revenue: 450 },
  ];

  const mockTopProducts = [
    { name: 'Товар #1', revenue: 400, sales: 40 },
    { name: 'Товар #2', revenue: 300, sales: 30 },
    { name: 'Товар #3', revenue: 200, sales: 20 },
    { name: 'Товар #4', revenue: 100, sales: 10 },
  ];

  return (
    <div className="space-y-6 mb-12">
      {/* Primary Chart: Sales over time */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft relative overflow-hidden min-w-0">
        {isFree && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-slate-100">
              <Lock size={32} className="text-slate-400" />
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 mb-2">Графіки продажів заблоковано</h4>
            <p className="text-slate-500 font-medium mb-6 max-w-md text-center">Оновіть підписку до рівня PLUS або вище, щоб бачити детальну динаміку ваших продажів.</p>
            <Button onClick={() => onUpgrade('plus')}>Отримати PLUS</Button>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Динаміка продажів</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Кількість замовлень за останні 30 днів</p>
          </div>
        </div>

        <MeasuredChart height={300}>
          {(width, height) => (
          <ResponsiveContainer width={width} height={height}>
            {isPro || isVip ? (
              <AreaChart data={isFree ? mockSalesData : salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => formatCompactNumber(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Дохід" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            ) : (
              <LineChart data={isFree ? mockSalesData : salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => formatCompactNumber(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sales" name="Продажі" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
          )}
        </MeasuredChart>
      </div>

      {/* Secondary Charts: Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Sales (Bar Chart) */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft relative overflow-hidden min-w-0">
          {(!isPro && !isVip) && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-slate-100">
                <Lock size={28} className="text-amber-400" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 mb-2">Топ товарів заблоковано</h4>
              <p className="text-slate-500 text-sm font-medium mb-6 max-w-xs text-center">Доступно для планів PRO та VIP.</p>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white border-none" onClick={() => onUpgrade('pro')}>Оновити до PRO</Button>
            </div>
          )}
          
          <div className="mb-8">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Топ товарів за продажами</h3>
          </div>

          <MeasuredChart height={250}>
            {(width, height) => (
            <ResponsiveContainer width={width} height={height}>
              <BarChart data={(!isPro && !isVip) ? mockTopProducts : topProductsData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => formatCompactNumber(value)} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                <Bar dataKey="sales" name="Продажі" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </MeasuredChart>
        </div>

        {/* Top Products by Revenue (Pie Chart) */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-soft relative overflow-hidden min-w-0">
          {!isVip && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-slate-100">
                <Lock size={28} className="text-indigo-400" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 mb-2">Розподіл доходу заблоковано</h4>
              <p className="text-slate-500 text-sm font-medium mb-6 max-w-xs text-center">Ексклюзивна аналітика для VIP продавців.</p>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-none" onClick={() => onUpgrade('vip')}>Оновити до VIP</Button>
            </div>
          )}
          
          <div className="mb-8">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Розподіл доходу</h3>
          </div>

          <MeasuredChart height={250}>
            {(width, height) => (
            <ResponsiveContainer width={width} height={height}>
              <PieChart>
                <Pie
                  data={!isVip ? mockTopProducts : topProductsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {(!isVip ? mockTopProducts : topProductsData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
            )}
          </MeasuredChart>
        </div>
      </div>
    </div>
  );
};

export default SellerAnalyticsCharts;
