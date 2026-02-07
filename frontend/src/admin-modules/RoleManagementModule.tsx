
import { useState, useEffect } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  HelpCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { ScrollArea } from "../components/ui/scroll-area";
import { AXIOS_INSTANCE as api } from '../axios-instance';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, number>; // { "sales": 7, "users": 4 }
  is_system: boolean;
  is_active: boolean;
  user_count?: number; // Optional count of users with this role
}

// Module definition for permissions
const MODULES = [
  { key: "sales", label: "Ventas (POS)", description: "Acceso al Punto de Venta y creación de pedidos." },
  { key: "products", label: "Inventario", description: "Gestión de productos, precios y stock." },
  { key: "users", label: "Usuarios", description: "Gestión de cuentas de empleados." },
  { key: "roles", label: "Roles", description: "Gestión de roles y permisos (Solo Admin)." },
  { key: "finance", label: "Finanzas", description: "Reportes de ventas, caja y divisas." },
  { key: "settings", label: "Configuración", description: "Ajustes globales del negocio." },
];

// Unix-style permissions
const PERM_LEVELS = [
  { value: 4, label: "Ver (Lectura)", short: "R" },
  { value: 2, label: "Editar (Escritura)", short: "W" },
  { value: 1, label: "Aprobar/Eliminar (Ejecución)", short: "X" },
];

export default function RoleManagementModule() {
  const [roles, setRoles] = useState<Role[]>([]);
  // const [loading, setLoading] = useState(true); // Unused for now
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Role>>({
    name: "",
    description: "",
    permissions: {},
    is_active: true
  });

  const fetchRoles = async () => {
    // setLoading(true);
    try {
      const data = await api.get('/admin/roles/');
      setRoles(data.data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      // Mock data for fallback/dev
      setRoles([
        { 
          id: "role_admin", 
          name: "Admin", 
          description: "Administrador del Sistema", 
          permissions: { "all": 7 }, 
          is_system: true, 
          is_active: true 
        },
        { 
          id: "role_seller", 
          name: "Vendedor", 
          description: "Ventas y consulta de stock", 
          permissions: { "sales": 7, "products": 4 }, 
          is_system: true, 
          is_active: true 
        }
      ]);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handlePermChange = (moduleKey: string, levelValue: number, checked: boolean) => {
    setFormData(prev => {
      const currentPerm = prev.permissions?.[moduleKey] || 0;
      let newPerm = currentPerm;
      
      if (checked) {
        newPerm |= levelValue; // Add bit
      } else {
        newPerm &= ~levelValue; // Remove bit
      }
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleKey]: newPerm
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      if (editingRole) {
          // Update
          await api.put(`/admin/roles/${editingRole.id}`, formData);
      } else {
          // Create
          await api.post('/admin/roles/', formData);
      }
      setIsCreateOpen(false);
      setEditingRole(null);
      fetchRoles();
    } catch (error) {
        console.error("Error saving role:", error);
        alert("Error al guardar el rol. Verifique que el nombre sea único.");
    }
  };

  const startEdit = (role: Role) => {
      setEditingRole(role);
      setFormData({
          name: role.name,
          description: role.description,
          permissions: { ...role.permissions }, // Clone
          is_active: role.is_active
      });
      setIsCreateOpen(true);
  };

  const startCreate = () => {
      setEditingRole(null);
      setFormData({
          name: "",
          description: "",
          permissions: {},
          is_active: true
      });
      setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Roles y Permisos
          </h2>
          <p className="text-gray-500 mt-1">Gestione el acceso de los empleados mediante roles.</p>
        </div>
        <Button onClick={startCreate} className="shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Rol
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
            {role.is_system && (
                <div className="absolute top-0 right-0 p-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Sistema</Badge>
                            </TooltipTrigger>
                            <TooltipContent>Rol protegido por el sistema. No se puede eliminar.</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{role.name}</span>
              </CardTitle>
              <CardDescription>{role.description || "Sin descripción"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(role.permissions).slice(0, 3).map(([key, val]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {val}
                    </Badge>
                  ))}
                  {Object.keys(role.permissions).length > 3 && (
                    <Badge variant="outline" className="text-xs">+{Object.keys(role.permissions).length - 3} más</Badge>
                  )}
                </div>
                
                <div className="flex justify-end pt-4 border-t gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!role.is_system && (
                         <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => startEdit(role)}>
                        <Edit className="h-4 w-4 mr-1" /> Editar
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{editingRole ? "Editar Rol" : "Crear Nuevo Rol"}</DialogTitle>
                <DialogDescription>
                    Defina el nombre y los permisos granulares para este rol.
                </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nombre del Rol</Label>
                            <Input 
                                value={formData.name} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
                                disabled={editingRole?.is_system}
                                placeholder="Ej: Supervisor de Caja"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Input 
                                value={formData.description || ""} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, description: e.target.value})}
                                placeholder="Breve descripción de responsabilidades"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-lg font-semibold flex items-center gap-2">
                             Permisos del Sistema
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><HelpCircle className="h-4 w-4 text-gray-400"/></TooltipTrigger>
                                    <TooltipContent>
                                        <p>R = Lectura (Ver)</p>
                                        <p>W = Escritura (Crear/Editar)</p>
                                        <p>X = Ejecución (Eliminar/Aprobar)</p>
                                    </TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                        </Label>
                        
                        <div className="border rounded-lg p-4 bg-gray-50/50">
                            {MODULES.map(module => {
                                const currentPerm = formData.permissions?.[module.key] || 0;
                                return (
                                    <div key={module.key} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-gray-100/50 px-2 rounded-md transition-colors">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-gray-900">{module.label}</div>
                                            <div className="text-xs text-gray-500">{module.description}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {PERM_LEVELS.map(level => {
                                                const isChecked = (currentPerm & level.value) === level.value;
                                                 return (
                                                    <div key={level.value} className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{level.short}</span>
                                                        <Switch 
                                                            checked={isChecked}
                                                            onCheckedChange={(checked: boolean) => handlePermChange(module.key, level.value, checked)}
                                                            className={isChecked ? 
                                                                (level.value === 4 ? "bg-blue-500" : level.value === 2 ? "bg-amber-500" : "bg-red-500") 
                                                                : ""}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!formData.name}>
                    <Save className="mr-2 h-4 w-4" /> Guardar Rol
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
