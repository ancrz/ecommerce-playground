/**
 * src/admin-modules/DashboardModule.tsx
 * Dashboard de Administración Premium (Stitch Design v3.0)
 * 
 * DESIGN 13: Quick Stats Cards
 * DESIGN 14: Report Chart (Visual Sales Data)
 */
import React, { useEffect, useState } from 'react';
import { 
    DollarSign, 
    ShoppingBag, 
    AlertTriangle, 
    TrendingUp, 
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import * as api from '../api';
import { useApp } from '../App';
import type { DailyReport, Cart, Product } from '../types';

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, subtext, icon: Icon, trend, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between mb-4">
            <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
            {trend === 'up' && <span className="flex items-center text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-lg"><ArrowUpRight size={14} /> +12.5%</span>}
            {trend === 'down' && <span className="flex items-center text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-lg"><ArrowDownRight size={14} /> -2.4%</span>}
            <span className="text-gray-400">{subtext}</span>
        </div>
    </div>
);

// CSS-only Bar Chart for Design 14
const SalesChart = () => {
    // Mock Data for "Last 7 Days"
    const data = [45, 60, 35, 70, 55, 80, 65];
    const max = Math.max(...data);
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div>
                     <h3 className="text-lg font-bold text-gray-900">Reporte de Ventas</h3>
                     <p className="text-sm text-gray-500">Últimos 7 días</p>
                </div>
                <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                    Ver Reporte Completo
                </button>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-4">
                {data.map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="relative w-full flex items-end justify-center h-full bg-gray-50 rounded-xl overflow-hidden">
                            <div 
                                className="w-full mx-2 bg-blue-500 rounded-t-lg group-hover:bg-blue-600 transition-all relative"
                                style={{ height: `${(value / max) * 100}%` }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    ${value}00
                                </div>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600 transition-colors">{days[i]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function DashboardModule() {
    const { formatPrice } = useApp();
    const [stats, setStats] = useState<{
        daily: DailyReport | null,
        pending: number,
        lowStock: number
    }>({ daily: null, pending: 0, lowStock: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Parallel fetch
                const [dailyData, cartsData, productsData] = await Promise.all([
                    api.getDailySales().catch(() => null),
                    api.getPendingCarts().catch(() => []),
                    api.getAllProducts().catch(() => [])
                ]);

                // Process data
                const lowStockCount = (productsData as Product[]).filter(p => p.stock < 10).length;

                setStats({
                    daily: dailyData,
                    pending: (cartsData as Cart[]).length,
                    lowStock: lowStockCount
                });
            } catch (e) {
                console.error("Dashboard error", e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Resumen Ejecutivo</h2>
                <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-lg border">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* DESIGN 13: Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Ventas Hoy" 
                    value={stats.daily ? formatPrice(stats.daily.total) : '$0.00'} 
                    subtext="vs ayer"
                    icon={DollarSign}
                    trend="up"
                    color="bg-green-500 text-green-600"
                />
                <StatCard 
                    title="Pedidos Pendientes" 
                    value={stats.pending} 
                    subtext="Por procesar"
                    icon={ShoppingBag}
                    trend="neutral"
                    color="bg-blue-500 text-blue-600"
                />
                <StatCard 
                    title="Bajo Stock" 
                    value={stats.lowStock} 
                    subtext="Productos < 10 u"
                    icon={AlertTriangle}
                    trend={stats.lowStock > 0 ? 'down' : 'neutral'}
                    color="bg-orange-500 text-orange-600"
                />
                <StatCard 
                    title="Nuevos Clientes" 
                    value="12" 
                    subtext="Esta semana"
                    icon={Users}
                    trend="up"
                    color="bg-purple-500 text-purple-600"
                />
            </div>

            {/* DESIGN 14: Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesChart />
                </div>
                
                {/* Recent Activity / Mini List */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente</h3>
                    <div className="space-y-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                    {String.fromCharCode(64 + i)}B
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Nueva venta registrada</p>
                                    <p className="text-xs text-gray-500">Hace {i * 15} minutos</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
