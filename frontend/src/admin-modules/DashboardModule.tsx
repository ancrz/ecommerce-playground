/**
 * src/admin-modules/DashboardModule.tsx
 * Dashboard de Administración Premium (Stitch Design v3.0)
 * 
 * REFACTORIZADO (Inspirado en app-efiempresa):
 * - Animated Charts (Grafana-style)
 * - Real-time Pulse Indicators
 * - Gradient Stat Cards
 * - Recent Activity Feed
 */
import React, { useEffect, useState } from 'react';
import {
    DollarSign,
    ShoppingBag,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Activity,
    Package,
    Circle
} from 'lucide-react';
import * as api from '../api';
import { useApp } from '../App';
import type { DashboardStats } from '../schemas/dashboard';

// --- SUB-COMPONENTS (Internal) ---

const AnimatedCounter: React.FC<{ value: number; duration?: number; prefix?: string }> = ({
  value,
  duration = 1000,
  prefix = ''
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16); // 60fps
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{prefix}{count.toLocaleString()}</>;
};

const PulseIndicator: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <span className="relative flex h-3 w-3">
    {active && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    )}
    <span
      className={`relative inline-flex rounded-full h-3 w-3 ${
        active ? "bg-green-500" : "bg-gray-300"
      }`}
    />
  </span>
);

const AnimatedChart: React.FC<{ data: { month: string; revenue: number; orders: number }[] }> = ({ data }) => {
  const [animatedHeights, setAnimatedHeights] = useState<number[]>(data.map(() => 0));
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHeights(data.map(() => 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const maxValue = Math.max(
    ...data.map((m) => Math.max(m.revenue / 100, m.orders * 10)), // Normalize scales
    1
  );

  return (
    <div className="relative h-64 mt-8">
      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full border-t border-gray-100" />
        ))}
      </div>

      {/* Bars */}
      <div className="absolute inset-0 flex items-end justify-between gap-2 px-4">
        {data.map((month, index) => {
          const revenueHeight = Math.min(((month.revenue / 100) / maxValue) * 100, 100);
          const ordersHeight = Math.min(((month.orders * 10) / maxValue) * 100, 100);
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col justify-end items-center gap-1 group relative h-full"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
               {/* Tooltip */}
               {isHovered && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-20 whitespace-nowrap animate-fade-in min-w-[120px]">
                  <p className="font-bold mb-1 border-b border-gray-700 pb-1">{month.month}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1 text-blue-300"><DollarSign size={10} /> Ventas</span>
                    <span className="font-mono">${month.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1 text-purple-300"><ShoppingBag size={10} /> Pedidos</span>
                    <span className="font-mono">{month.orders}</span>
                  </div>
                </div>
              )}

              {/* Bars Container */}
              <div className="w-full flex gap-1 items-end justify-center px-1">
                  {/* Revenue Bar */}
                  <div 
                    className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 ease-out ${isHovered ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-blue-500/80'}`}
                    style={{ 
                        height: `${(revenueHeight * animatedHeights[index]) / 100}%`,
                        transitionDelay: `${index * 50}ms`
                    }}
                  />
                  {/* Orders Bar */}
                  <div 
                    className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 ease-out ${isHovered ? 'bg-purple-600 shadow-lg shadow-purple-500/30' : 'bg-purple-500/80'}`}
                    style={{ 
                        height: `${(ordersHeight * animatedHeights[index]) / 100}%`,
                        transitionDelay: `${index * 50 + 50}ms`
                    }}
                  />
              </div>

              {/* Label */}
              <span className={`text-xs font-medium mt-2 transition-colors ${isHovered ? 'text-blue-600' : 'text-gray-400'}`}>
                {month.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function DashboardModule() {
    const { formatPrice } = useApp();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.getDashboardStats();
                setStats(data);
            } catch (e) {
                console.error("Dashboard error", e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading || !stats) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    const mainStats = [
        {
          label: "Ingresos Totales",
          value: formatPrice(stats.total_revenue),
          change: `${stats.revenue_change > 0 ? "+" : ""}${stats.revenue_change}%`,
          trend: stats.revenue_change >= 0 ? "up" : "down",
          icon: DollarSign,
          color: "bg-linear-to-br from-green-50 to-emerald-100 text-green-600",
          iconBg: "bg-green-500",
          description: "Ventas procesadas completadas",
        },
        {
          label: "Nuevos Pedidos",
          value: stats.new_orders,
          change: `${stats.total_orders} históricos`,
          trend: "up",
          icon: ShoppingBag,
          color: "bg-linear-to-br from-blue-50 to-indigo-100 text-blue-600",
          iconBg: "bg-blue-500",
          description: "Pedidos pendientes de despacho",
        },
        {
            label: "Productos Activos",
            value: stats.active_products,
            change: `${stats.low_stock_products} bajo stock`,
            trend: stats.low_stock_products > 5 ? "down" : "neutral",
            icon: Package,
            color: "bg-linear-to-br from-purple-50 to-violet-100 text-purple-600",
            iconBg: "bg-purple-500",
            description: "Catálogo disponible",
        },
        {
            label: "Total Clientes",
            value: stats.total_users,
            change: `+${stats.online_users} online`,
            trend: "up",
            icon: Users,
            color: "bg-linear-to-br from-orange-50 to-amber-100 text-orange-600",
            iconBg: "bg-orange-500",
            description: "Usuarios registrados",
        }
    ];

    const getActivityIcon = (_type: string, iconName: string) => {
        switch (iconName) {
            case 'shopping-bag': return <ShoppingBag size={16} />;
            case 'user': return <Users size={16} />;
            case 'package': return <Package size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const getActivityColor = (color: string) => {
        switch (color) {
            case 'green': return 'bg-green-100 text-green-600';
            case 'blue': return 'bg-blue-100 text-blue-600';
            case 'purple': return 'bg-purple-100 text-purple-600';
            case 'orange': return 'bg-orange-100 text-orange-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Resumen Ejecutivo
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Bienvenido de nuevo, aquí tienes lo que sucede hoy.
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Indicador de sistema activo */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200 shadow-sm">
                        <PulseIndicator active />
                        <span className="text-sm font-medium text-green-700">
                            {stats.online_users} usuarios online
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Métricas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mainStats.map((stat, index) => (
                <div
                    key={index}
                    className={`${stat.color} p-6 rounded-2xl shadow-sm border border-white/50 hover:shadow-lg transition-all duration-300 group cursor-pointer relative overflow-hidden`}
                    title={stat.description}
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                        <stat.icon size={100} />
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className={`p-3 rounded-xl ${stat.iconBg} text-white shadow-lg shadow-black/5`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-white/60 backdrop-blur-sm ${
                            stat.trend === "up" ? "text-green-700" : stat.trend === "down" ? "text-red-700" : "text-gray-600"
                        }`}>
                            {stat.change}
                            {stat.trend === "up" ? <ArrowUpRight size={12} /> : stat.trend === "down" ? <ArrowDownRight size={12} /> : null}
                        </div>
                    </div>
                    
                    <div className="mt-4 relative z-10">
                        <h3 className="text-sm font-medium opacity-75 uppercase tracking-wide">{stat.label}</h3>
                        <p className="text-3xl font-bold mt-1 group-hover:translate-x-1 transition-transform">
                            {stat.value}
                        </p>
                    </div>
                </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gráfico de Ventas */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Monthly Performance */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Rendimiento Mensual</h3>
                                <p className="text-sm text-gray-500">Ingresos vs Pedidos (Últimos 6 meses)</p>
                            </div>
                            <div className="flex gap-4 text-xs font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span>Ingresos</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                    <span>Pedidos</span>
                                </div>
                            </div>
                        </div>

                        <AnimatedChart data={stats.monthly_performance} />

                         <div className="grid grid-cols-3 gap-4 pt-6 mt-4 border-t border-gray-100">
                            <div className="text-center p-3 bg-blue-50 rounded-xl">
                                <p className="text-2xl font-bold text-blue-600">
                                    <AnimatedCounter value={stats.monthly_performance.reduce((acc, curr) => acc + curr.revenue, 0)} prefix="$" />
                                </p>
                                <p className="text-xs text-gray-500 uppercase font-bold">Total Ingresos</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-xl">
                                <p className="text-2xl font-bold text-purple-600">
                                    <AnimatedCounter value={stats.monthly_performance.reduce((acc, curr) => acc + curr.orders, 0)} />
                                </p>
                                <p className="text-xs text-gray-500 uppercase font-bold">Total Pedidos</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-xl">
                                 <p className="text-2xl font-bold text-green-600">
                                    <AnimatedCounter value={stats.monthly_performance.reduce((acc, curr) => acc + (curr.orders * 150), 0) / (stats.monthly_performance.length || 1)} prefix="$" />
                                </p>
                                <p className="text-xs text-gray-500 uppercase font-bold">Ticket Promedio</p>
                            </div>
                        </div>
                    </div>

                    {/* Sales by Category (New) */}
                    {stats.sales_by_category && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Ventas por Categoría</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats.sales_by_category.map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                            {cat.percentage}%
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{cat.category}</p>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${cat.percentage}%` }} />
                                            </div>
                                        </div>
                                        <p className="font-mono text-sm font-bold text-gray-600">{formatPrice(cat.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Users & Activity */}
                <div className="space-y-6">
                    {/* Active Users Card (New) */}
                    {stats.user_breakdown && (
                        <div className="bg-linear-to-br from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users size={120} />
                            </div>
                            <h3 className="text-lg font-bold mb-1 relative z-10">Usuarios Activos</h3>
                            <p className="text-gray-400 text-xs mb-6 relative z-10">En tiempo real</p>
                            
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                                    <p className="text-2xl font-bold">{stats.user_breakdown.guests}</p>
                                    <p className="text-xs text-gray-300 uppercase font-bold mt-1">Guests</p>
                                    <div className="flex items-center gap-1 text-[10px] text-green-400 mt-2">
                                        <PulseIndicator active /> Online
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                                    <p className="text-2xl font-bold">{stats.user_breakdown.staff}</p>
                                    <p className="text-xs text-gray-300 uppercase font-bold mt-1">Staff</p>
                                    <p className="text-[10px] text-gray-400 mt-2">Registrados</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actividad Reciente */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
                            <div className="bg-gray-100 p-1 rounded-lg">
                                <Activity size={16} className="text-gray-500" />
                            </div>
                        </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[400px] scrollbar-thin scrollbar-thumb-gray-200">
                        {stats.recent_activities.length > 0 ? (
                            stats.recent_activities.map((activity, i) => (
                                <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className={`p-2.5 rounded-xl ${getActivityColor(activity.color || 'gray')} group-hover:scale-110 transition-transform`}>
                                        {getActivityIcon(activity.type, activity.icon)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {activity.action}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {activity.target}
                                        </p>
                                        {activity.amount && (
                                            <p className="text-xs font-bold text-green-600 mt-0.5">
                                                {formatPrice(activity.amount)}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-full">
                                        {activity.time}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 opacity-50">
                                <Circle size={40} className="mx-auto mb-2 text-gray-300" />
                                <p>No hay actividad</p>
                            </div>
                        )}
                    </div>
                    
                    <button className="w-full mt-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all border border-gray-100">
                        Ver Todo el Historial
                    </button>
                </div>

            </div>
            </div>
        </div>
    );
}
