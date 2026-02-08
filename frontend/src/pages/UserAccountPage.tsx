/**
 * src/pages/UserAccountPage.tsx
 * Panel de Usuario Premium (Stitch Design v3.0)
 * 
 * REFACTORIZADO v5:
 * - DESIGN 11: Navegación por Pestañas (Tabs)
 * - DESIGN 12: Items de Historial de Pedidos (Cards)
 * - Layout Responsive y Glassmorphism
 */
import React, { useState, useEffect } from 'react';
import { 
    User as UserIcon, 
    Lock, 
    ShoppingBag, 
    Settings, 
    LogOut, 
    ChevronRight, 
    Package, 
    Calendar,
    MapPin,
    CreditCard,
    Loader2
} from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import { useFeedback } from '../components/ui/FeedbackModal';
import { Input } from '../components/FormControls';
import type { User, UserUpdateRequest, PasswordChangeRequest, Sale } from '../types';

// --- SUB-COMPONENTS ---

/* --- TAB 1: PERFIL --- */
const ProfileTab = ({ user, onUpdate }: { user: User, onUpdate: (u: User) => void }) => {
    const { showToast } = useFeedback();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ full_name: user.full_name || "", email: user.email || "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await api.updateMe(formData);
            onUpdate(updated);
            showToast('Perfil actualizado correctamente', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <UserIcon className="text-blue-600" size={24} /> Información Personal
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombre Completo" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary px-8 py-3 rounded-xl">
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                </button>
            </form>
        </div>
    );
};

/* --- TAB 2: SEGURIDAD --- */
const SecurityTab = () => {
    const { showToast } = useFeedback();
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({ old: "", new: "" });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new.length < 8) return showToast('La contraseña debe tener 8+ caracteres', 'warning');
        
        setLoading(true);
        try {
            await api.changeMyPassword({ old_password: passwords.old, new_password: passwords.new });
            showToast('Contraseña actualizada', 'success');
            setPasswords({ old: "", new: "" });
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Lock className="text-blue-600" size={24} /> Seguridad de la Cuenta
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-lg">
                <Input label="Contraseña Actual" type="password" value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} required />
                <Input label="Nueva Contraseña" type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required minLength={8} />
                <button type="submit" disabled={loading} className="btn-secondary px-8 py-3 rounded-xl bg-gray-800 text-white hover:bg-gray-900">
                    {loading ? <Loader2 className="animate-spin" /> : 'Actualizar Contraseña'}
                </button>
            </form>
        </div>
    );
};

/* --- TAB 3: PEDIDOS (DESIGN 12) --- */
const OrdersTab = () => {
    const { formatPrice } = useApp();
    const [orders, setOrders] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getMyOrders()
            .then(setOrders)
            .catch(err => console.error("Error fetching orders", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></div>;

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag size={32} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Aún no tienes pedidos</h3>
                <p className="text-gray-500 mt-2">Explora nuestra tienda y realiza tu primera compra.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {orders.map((order) => (
                // DESIGN 12: Order History Item
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                                <Package size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pedido #{order.id.slice(0,8).toUpperCase()}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                                    <Calendar size={14} />
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-right">
                             <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold inline-flex items-center gap-1 mb-1">
                                Completado
                             </div>
                             <p className="font-bold text-xl text-gray-900">{formatPrice(order.total_with_tax)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm">
                        <div className="flex gap-4 text-gray-500 w-full sm:w-auto">
                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <MapPin size={14} />
                                <span>Sucursal Principal</span>
                            </div>
                             <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <CreditCard size={14} />
                                <span>{order.payment_details?.payment_method === 'cash' ? 'Efectivo' : 'QR / Digital'}</span>
                            </div>
                        </div>
                        
                        {/* Action - Could open detail modal */}
                        <button className="text-blue-600 font-bold flex items-center gap-1 hover:gap-2 transition-all group-hover:text-blue-700">
                            Ver Detalle <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function UserAccountPage() {
    const { user, handleLogout, forceAppUpdate } = useApp();
    const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'security'>('profile');

    if (!user) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    const tabs = [
        { id: 'profile', label: 'Mi Perfil', icon: UserIcon },
        { id: 'orders', label: 'Mis Pedidos', icon: ShoppingBag },
        { id: 'security', label: 'Seguridad', icon: Lock },
    ];

    const handleProfileUpdate = (u: User) => {
        localStorage.setItem('user', JSON.stringify(u));
        forceAppUpdate();
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header / Banner */}
            <div className="bg-white border-b border-gray-100 pt-8 pb-0 px-4 md:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
                            <p className="text-gray-500 mt-1">Gestiona tu información y revisa tus compras.</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition font-medium"
                        >
                            <LogOut size={18} /> <span className="hidden sm:inline">Cerrar Sesión</span>
                        </button>
                    </div>

                    {/* DESIGN 11: Tabs */}
                    <div className="flex gap-6 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`pb-4 px-2 flex items-center gap-2 font-bold text-sm whitespace-nowrap transition-colors relative ${
                                        isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full transition-all animate-scale-in-x" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
                {activeTab === 'profile' && <ProfileTab user={user} onUpdate={handleProfileUpdate} />}
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'security' && <SecurityTab />}
            </div>
        </div>
    );
}