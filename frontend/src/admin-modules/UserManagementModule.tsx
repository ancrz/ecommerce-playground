/**
 * src/pages/admin-modules/UserManagementModule.tsx
 * "Chunk" para la pestaña de Gestión de Usuarios (RBAC).
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-secondary, .btn-icon
 * 2. Corregidas rutas de importación de Fase 2.
 */
import React, { useState, useEffect } from "react";
import { Plus, Edit2, KeyRound, Loader2, Save } from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import type { User } from "../types";
// Importar los DTOs de Intención (definidos en types.ts)
import type { UserCreateRequest, UserUpdateRequest } from "../types";

// Importar componentes reutilizables
import { Modal } from "../components/Modal";
import { Input, Checkbox } from "../components/FormControls";

// Definición de los roles disponibles en el sistema (debe coincidir con utils/auth.py)
const AVAILABLE_ROLES = [
  { id: "products_manager", label: "Gestor de Productos" },
  { id: "sales_manager", label: "Gestor de Ventas (POS)" },
  { id: "finance_manager", label: "Gestor de Finanzas (Monedas/Impuestos)" },
  { id: "content_manager", label: "Gestor de Contenido (Marca/Tema)" },
];

// --- Componente Principal del Módulo ---
export default function UserManagementModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para los modales
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await api.getAllUsers();
      setUsers(fetchedUsers);
    } catch (e: any) {
      alert("Error cargando usuarios: " + e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

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

  const handleSaveUser = async (
    data: Partial<UserCreateRequest | UserUpdateRequest>,
    isNew: boolean
  ) => {
    try {
      if (isNew) {
        await api.createNewUser(data as UserCreateRequest);
        alert("✓ Usuario creado exitosamente.");
      } else if (editingUser) {
        await api.updateUser(editingUser.id, data as UserUpdateRequest);
        alert("✓ Usuario actualizado exitosamente.");
      }
      handleCloseForm();
      loadUsers(); // Recargar la lista
    } catch (e: any) {
      alert("Error guardando usuario: " + e.message);
    }
  };

  const handleResetPassword = (user: User) => {
    setUserToReset(user);
    setShowResetModal(true);
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setUserToReset(null);
  };

  return (
    <>
      {/* Modal para Crear/Editar Usuario */}
      {showUserForm && (
        <Modal
          title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
          isOpen={showUserForm}
          onClose={handleCloseForm}
          size="lg"
        >
          <UserFormModal
            user={editingUser}
            onSave={handleSaveUser}
            onCancel={handleCloseForm}
          />
        </Modal>
      )}

      {/* Modal para Resetear Contraseña */}
      {showResetModal && userToReset && (
        <Modal
          title={`Resetear Contraseña para ${userToReset.username}`}
          isOpen={showResetModal}
          onClose={handleCloseResetModal}
          size="md"
        >
          <PasswordResetModal
            user={userToReset}
            onClose={handleCloseResetModal}
          />
        </Modal>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Gestión de Usuarios y Roles (RBAC)
        </h2>
        {/* REFACTOR FASE 4: Botón Primario */}
        <button
          onClick={handleNewUser}
          data-testid="user-create-button"
          className="btn-primary"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  Cargando usuarios...
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
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-icon text-blue-600"
                      title="Editar Roles/Datos"
                      data-testid={`user-edit-btn-${user.id}`}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="btn-icon text-yellow-600"
                      title="Forzar Reseteo de Contraseña"
                      data-testid={`user-resetpass-btn-${user.id}`}
                      disabled={user.roles.includes("admin")} // No se puede resetear al admin
                    >
                      <KeyRound size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

  const handleSubmit = (e: React.FormEvent) => {
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
        alert("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      (payload as UserCreateRequest).plain_password = formData.plain_password;
    }

    onSave(payload, isNew);
  };

  const isSuperAdmin = user?.roles.includes("admin") || false;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre de Usuario"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        disabled={!!user || isSuperAdmin}
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
      />
      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <div className="space-y-2 pt-2">
        <label className="block text-sm font-semibold text-gray-700">
          Roles de Acceso
        </label>
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

      <Checkbox
        label="Usuario Activo (Puede iniciar sesión)"
        checked={formData.is_active}
        onChange={(e) =>
          setFormData({ ...formData, is_active: e.target.checked })
        }
        disabled={isSuperAdmin}
        data-testid="user-isactive-check"
      />

      {/* REFACTOR FASE 4: Botón Primario y Secundario */}
      <div className="flex gap-3 pt-4 border-t mt-4">
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={isSuperAdmin}
          data-testid="user-form-save-button"
        >
          {isSuperAdmin ? "No se puede editar al Admin" : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
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
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.adminResetPassword(user.id, newPassword);
      alert("✓ Contraseña reseteada exitosamente.");
      onClose(); // Cierra el modal
    } catch (e: any) {
      alert("Error reseteando contraseña: " + e.message);
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
        <button
          type="submit"
          disabled={loading || newPassword.length < 8}
          className="btn-primary flex-1"
          data-testid="reset-confirm-button"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          Confirmar Reseteo
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
};
