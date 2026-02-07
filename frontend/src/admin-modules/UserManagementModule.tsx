/**
 * src/pages/admin-modules/UserManagementModule.tsx
 * "Chunk" para la pestaña de Gestión de Usuarios (RBAC).
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-secondary, .btn-icon
 * 2. Corregidas rutas de importación de Fase 2.
 */
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, KeyRound, Save, User as UserIcon, Shield, Loader2 } from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import { useUI } from "../components/UIContext";
import type { User } from "../types";
// Importar los DTOs de Intención (definidos en types.ts)
import type { UserCreateRequest, UserUpdateRequest } from "../types";

// Importar componentes reutilizables
import { ResponsiveModal } from "../components/common/ResponsiveModal";
import { TouchButton } from "../components/common/TouchButton";
import { Input, Checkbox } from "../components/FormControls";

// Definición de los roles disponibles en el sistema (debe coincidir con utils/auth.py)
const AVAILABLE_ROLES = [
  { id: "products_manager", label: "Gestor de Productos" },
  { id: "sales_manager", label: "Gestor de Ventas (POS)" },
  { id: "finance_manager", label: "Gestor de Finanzas (Monedas/Impuestos)" },
  { id: "content_manager", label: "Gestor de Contenido (Marca/Tema)" },
];

// --- Componente Principal del Módulo (Refactorizado con React Query) ---
export default function UserManagementModule() {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries (Paginated)
  const {
    data: users = [],
    isLoading,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["users", currentPage],
    queryFn: () => api.getAllUsers((currentPage - 1) * itemsPerPage, itemsPerPage),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });

  // Prefetch next page (Optional but good for UX)
  useEffect(() => {
    if (!isPlaceholderData && users.length === itemsPerPage) {
      queryClient.prefetchQuery({
        queryKey: ["users", currentPage + 1],
        queryFn: () => api.getAllUsers(currentPage * itemsPerPage, itemsPerPage),
      });
    }
  }, [users, isPlaceholderData, currentPage, queryClient]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async ({
      data,
      isNew,
      id,
    }: {
      data: Partial<UserCreateRequest | UserUpdateRequest>;
      isNew: boolean;
      id?: string;
    }) => {
      if (isNew) {
        return api.createNewUser(data as UserCreateRequest);
      } else {
        if (!id) throw new Error("ID requerido para actualizar");
        return api.updateUser(id, data as UserUpdateRequest);
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      await alert(
        variables.isNew
          ? "✓ Usuario creado exitosamente."
          : "✓ Usuario actualizado exitosamente."
      );
      handleCloseForm();
    },
    onError: async (err: any) => {
      await alert("Error guardando usuario: " + (err.message || err));
    },
  });

  // Estado para los modales
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);

  // Manejadores
  const handleNewUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleSaveUser = (
    data: Partial<UserCreateRequest | UserUpdateRequest>,
    isNew: boolean
  ) => {
    saveMutation.mutate({
      data,
      isNew,
      id: editingUser?.id,
    });
  };

  const handleResetPassword = (user: User) => {
    setUserToReset(user);
    setShowResetModal(true);
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setUserToReset(null);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        Error cargando usuarios: {(error as any).message}
      </div>
    );
  }

  return (
    <>
      {/* Modal para Crear/Editar Usuario */}
      <ResponsiveModal
        title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
        subtitle={editingUser ? "Modifique los datos y roles del usuario" : "Complete el formulario para registrar un usuario"}
        icon={<UserIcon className="w-6 h-6" />}
        isOpen={showUserForm}
        onClose={handleCloseForm}
        size="lg"
      >
        <UserFormModal
          user={editingUser}
          onSave={(data, isNew) => handleSaveUser(data, isNew)}
          onCancel={handleCloseForm}
        />
      </ResponsiveModal>

      {/* Modal para Resetear Contraseña */}
      {userToReset && (
        <ResponsiveModal
          title={`Resetear Contraseña`}
          subtitle={`Usuario: ${userToReset.username}`}
          icon={<KeyRound className="w-6 h-6" />}
          isOpen={showResetModal}
          onClose={handleCloseResetModal}
          size="md"
          headerColor="bg-yellow-600"
        >
          <PasswordResetModal
            user={userToReset}
            onClose={handleCloseResetModal}
          />
        </ResponsiveModal>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Gestión de Usuarios y Roles (RBAC)
        </h2>
        {/* REFACTOR FASE 4: Botón Primario */}
        {/* REFACTOR FASE 4: Botón Primario */}
        <TouchButton
          onClick={handleNewUser}
          variant="primary"
          icon={Plus}
        >
          Nuevo Usuario
        </TouchButton>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden hidden md:block">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">
                Usuario
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">
                Nombre Completo
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">
                Email
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">
                Roles
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase text-gray-600">
                Estado
              </th>
              <th className="p-3 text-center text-xs font-semibold uppercase text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="animate-spin" /> Cargando usuarios...
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50"
                  data-testid={`user-row-${user.id}`}
                >
                  <td className="p-3 font-semibold">{user.username}</td>
                  <td className="p-3">{user.full_name || "-"}</td>
                  <td className="p-3">{user.email || "-"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            role === "admin"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {user.is_active ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    {/* REFACTOR FASE 4: Botones de Icono */}
                    <div className="flex gap-1 justify-center">
                    <TouchButton
                      onClick={() => handleEditUser(user)}
                      variant="ghost"
                      icon={Edit2}
                      iconOnly
                      className="text-blue-600"
                    />
                    <TouchButton
                      onClick={() => handleResetPassword(user)}
                      variant="ghost"
                      icon={KeyRound}
                      iconOnly
                      className="text-yellow-600"
                      disabled={user.roles.includes("admin")}
                    />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL (CARDS) */}
      <div className="md:hidden space-y-4">
        {isLoading && users.length === 0 ? (
          <div className="text-center p-8"><Loader2 className="animate-spin inline" /> Cargando...</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-900">{user.username}</div>
                  <div className="text-sm text-gray-500">{user.full_name || "Sin nombre"}</div>
                  <div className="text-xs text-blue-500 mt-0.5">{user.email}</div>
                </div>
                {user.is_active ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded uppercase">Activo</span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded uppercase">Inactivo</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <span key={role} className={`px-2 py-0.5 text-[10px] rounded border ${role === 'admin' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                    {role}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 border-t pt-3 mt-1">
                 <button
                    onClick={() => handleEditUser(user)}
                    className="flex-1 py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 rounded-lg"
                 >
                    Editar
                 </button>
                 <button
                    onClick={() => handleResetPassword(user)}
                    className="p-2 text-yellow-600 bg-yellow-50 rounded-lg"
                    title="Resetear Clave"
                    disabled={user.roles.includes("admin")}
                 >
                    <KeyRound size={18} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      <div className="flex justify-center items-center gap-4 mt-6 pb-20 md:pb-8">
        <TouchButton
          onClick={() => setCurrentPage((old) => Math.max(old - 1, 1))}
          disabled={currentPage === 1 || isLoading}
          variant="secondary"
        >
          Anterior
        </TouchButton>

        <span className="text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg">
           Página {currentPage}
        </span>

        <TouchButton
          onClick={() => {
            if (!isPlaceholderData && users.length === itemsPerPage) {
               setCurrentPage((old) => old + 1);
            }
          }}
          disabled={isPlaceholderData || users.length < itemsPerPage || isLoading}
          variant="secondary"
        >
          Siguiente
        </TouchButton>
      </div>
    </>
  );
}

// --- Componente: Formulario de Usuario (Interno) ---
const UserFormModal = ({
  user,
  onSave,
  onCancel,
}: {
  user: User | null;
  onSave: (
    data: Partial<UserCreateRequest | UserUpdateRequest>,
    isNew: boolean
  ) => void;
  onCancel: () => void;
}) => {
  const { alert } = useUI();
  const [formData, setFormData] = useState({
    username: user?.username || "",
    full_name: user?.full_name || "",
    email: user?.email || "",
    roles: user?.roles || [],
    is_active: user?.is_active ?? true,
    plain_password: "",
  });

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setFormData((prev) => {
      const rolesSet = new Set(prev.roles);
      if (checked) {
        rolesSet.add(roleId);
      } else {
        rolesSet.delete(roleId);
      }
      return { ...prev, roles: Array.from(rolesSet) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Partial<UserCreateRequest | UserUpdateRequest> = {
      username: formData.username,
      full_name: formData.full_name,
      email: formData.email,
      roles: formData.roles,
      is_active: formData.is_active,
    };

    const isNew = !user;
    if (isNew) {
      if (formData.plain_password.length < 8) {
        await alert("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      (payload as UserCreateRequest).plain_password = formData.plain_password;
    }

    onSave(payload, isNew);
  };

  const isSuperAdmin = user?.roles.includes("admin") || false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Datos Personales */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
           <UserIcon size={16} /> 1. Datos del Usuario
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Nombre de Usuario"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            disabled={!!user || isSuperAdmin}
            placeholder="ej. jperez"
          />
          {!user && (
            <Input
              label="Contraseña (Mín. 8 caracteres)"
              type="password"
              value={formData.plain_password}
              onChange={(e) =>
                setFormData({ ...formData, plain_password: e.target.value })
              }
              required
              minLength={8}
            />
          )}
          <Input
            label="Nombre Completo"
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            placeholder="Juan Perez"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="juan@empresa.com"
          />
        </div>
      </div>

      {/* 2. Roles y Accesos */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
           <Shield size={16} /> 2. Roles y Accesos
        </h3>
        
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          {AVAILABLE_ROLES.map((role) => (
            <Checkbox
              key={role.id}
              label={role.label}
              checked={formData.roles.includes(role.id)}
              onChange={(e) => handleRoleChange(role.id, e.target.checked)}
              disabled={isSuperAdmin}
              data-testid={`role-check-${role.id}`}
            />
          ))}
        </div>

        <div className="pt-2">
            <Checkbox
                label="Usuario Activo (Puede iniciar sesión en el sistema)"
                checked={formData.is_active}
                onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
                }
                disabled={isSuperAdmin}
                data-testid="user-isactive-check"
            />
        </div>
      </div>

      {/* REFACTOR FASE 4: Botón Primario y Secundario */}
      <div className="flex gap-3 pt-6 border-t mt-4">
        <div className="flex-1">
            <TouchButton
            type="submit"
            variant="primary"
            disabled={isSuperAdmin}
            icon={Save}
            >
            {isSuperAdmin ? "No editable (Admin)" : "Guardar Usuario"}
            </TouchButton>
        </div>
        <TouchButton type="button" onClick={onCancel} variant="secondary">
          Cancelar
        </TouchButton>
      </div>
    </form>
  );
};

// --- Componente de Modal para Resetear Contraseña ---
const PasswordResetModal = ({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) => {
  const { alert } = useUI();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      await alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.adminResetPassword(user.id, newPassword);
      await alert("✓ Contraseña reseteada exitosamente.");
      onClose(); // Cierra el modal
    } catch (e: any) {
      await alert("Error reseteando contraseña: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nueva Contraseña (Mín. 8 caracteres)"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={8}
        autoFocus
        data-testid="reset-new-password-input"
      />
      {/* REFACTOR FASE 4: Botón Primario y Secundario */}
      <div className="flex gap-3 pt-4 border-t mt-4">
        <div className="flex-1">
            <TouchButton
            type="submit"
            disabled={loading || newPassword.length < 8}
            variant="primary"
            loading={loading}
            icon={Save}
            >
            Confirmar Reseteo
            </TouchButton>
        </div>
        <TouchButton type="button" onClick={onClose} variant="secondary">
          Cancelar
        </TouchButton>
      </div>
    </form>
  );
};
