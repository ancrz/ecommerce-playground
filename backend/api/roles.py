import logging

from fastapi import APIRouter, Depends, HTTPException

from ..database.manager import DatabaseManager
from ..models.roles import Role, RoleCreate, RoleUpdate
from ..models.users import User
from ..services.role_service import RoleService
from .deps import is_admin

router = APIRouter()
logger = logging.getLogger(__name__)


def get_role_service():
    db = DatabaseManager()
    return RoleService(db)


@router.get("/", response_model=list[Role])
async def list_roles(
    current_user: User = Depends(is_admin),  # Admin only for now
    service: RoleService = Depends(get_role_service),
):
    await service.db.initialize()
    return await service.get_all_roles()


@router.get("/{role_id}", response_model=Role)
async def get_role(
    role_id: str, current_user: User = Depends(is_admin), service: RoleService = Depends(get_role_service)
):
    await service.db.initialize()
    role = await service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.post("/", response_model=Role)
async def create_role(
    role_in: RoleCreate, current_user: User = Depends(is_admin), service: RoleService = Depends(get_role_service)
):
    await service.db.initialize()
    try:
        return await service.create_role(role_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{role_id}", response_model=Role)
async def update_role(
    role_id: str,
    role_in: RoleUpdate,
    current_user: User = Depends(is_admin),
    service: RoleService = Depends(get_role_service),
):
    await service.db.initialize()
    try:
        return await service.update_role(role_id, role_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{role_id}")
async def delete_role(
    role_id: str, current_user: User = Depends(is_admin), service: RoleService = Depends(get_role_service)
):
    await service.db.initialize()
    try:
        await service.delete_role(role_id)
        return {"message": "Role deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
