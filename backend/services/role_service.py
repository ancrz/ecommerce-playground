import json
import logging
import uuid

from ..database.manager import DatabaseManager
from ..models.roles import Role, RoleCreate, RoleUpdate

logger = logging.getLogger(__name__)


class RoleService:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    async def get_all_roles(self) -> list[Role]:

        # In postgres format adaptation: BOOLEAN is kept. In sqlite it might be 0/1.
        # Check manager.py adaptation: _SCHEMAS_SQLITE keeps BOOLEAN? No, it replaces NUMERIC etc but BOOLEAN mapping depends on aiosqlite/driver.
        # Usually SQLITE doesn't have native BOOLEAN, uses 0/1.

        # Let's try simple select, filtering later if needed or assuming 0 is false.

        # Safe filter: is_deleted IS NOT TRUE (works in logic if mapped) or just simple query and map.
        rows = await self.db.fetchall("roles", "SELECT * FROM roles WHERE is_deleted = 0 OR is_deleted IS NULL")
        return [Role(**row) for row in rows]

    async def get_role_by_id(self, role_id: str) -> Role | None:
        row = await self.db.fetchone("roles", "SELECT * FROM roles WHERE id = ?", (role_id,))
        if row:
            return Role(**row)
        return None

    async def get_role_by_name(self, name: str) -> Role | None:
        row = await self.db.fetchone("roles", "SELECT * FROM roles WHERE name = ?", (name,))
        if row:
            return Role(**row)
        return None

    async def create_role(self, role_in: RoleCreate) -> Role:
        existing = await self.get_role_by_name(role_in.name)
        if existing:
            raise ValueError(f"El rol '{role_in.name}' ya existe.")

        new_role = Role(
            id=str(uuid.uuid4()),
            name=role_in.name,
            description=role_in.description,
            permissions=role_in.permissions,
            is_system=False,
            is_active=True,
            is_deleted=False,
        )

        # Permissions dict to JSON string for storage
        perms_json = json.dumps(new_role.permissions)

        query = """
            INSERT INTO roles (id, name, description, permissions, is_system, is_active, is_deleted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            new_role.id,
            new_role.name,
            new_role.description,
            perms_json,
            1 if new_role.is_system else 0,  # Sqlite compat just in case
            1 if new_role.is_active else 0,
            0,  # is_deleted
            new_role.created_at.isoformat(),
            new_role.updated_at.isoformat(),
        )
        await self.db.execute("roles", query, params)
        return new_role

    async def update_role(self, role_id: str, role_in: RoleUpdate) -> Role:
        current = await self.get_role_by_id(role_id)
        if not current:
            raise ValueError("Rol no encontrado")

        # System roles limitations?
        if current.is_system:
            # Prevent name change for system roles
            if role_in.name and role_in.name != current.name:
                raise ValueError("No se puede cambiar el nombre de un rol de sistema.")

        data = role_in.model_dump(exclude_unset=True)
        # Update fields
        if "name" in data:
            current.name = data["name"]
        if "description" in data:
            current.description = data["description"]
        if "permissions" in data:
            current.permissions = data["permissions"]
        if "is_active" in data:
            current.is_active = data["is_active"]

        current.update_timestamp()

        query = """
            UPDATE roles SET name=?, description=?, permissions=?, is_active=?, updated_at=?
            WHERE id=?
        """
        params = (
            current.name,
            current.description,
            json.dumps(current.permissions),
            1 if current.is_active else 0,
            current.updated_at.isoformat(),
            current.id,
        )
        await self.db.execute("roles", query, params)
        return current

    async def delete_role(self, role_id: str):
        current = await self.get_role_by_id(role_id)
        if not current:
            raise ValueError("Rol no encontrado")

        if current.is_system:
            raise ValueError("No se puede eliminar un rol de sistema.")

        # Soft Delete
        current.is_deleted = True
        current.update_timestamp()

        query = "UPDATE roles SET is_deleted = 1, updated_at = ? WHERE id = ?"
        await self.db.execute("roles", query, (current.updated_at.isoformat(), role_id))
