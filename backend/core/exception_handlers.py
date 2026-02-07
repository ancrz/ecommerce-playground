"""
Exception Handler Centralizado (RFC 7807 Problem Details + i18n).

Estandariza las respuestas de error en toda la API según RFC 7807.
Todos los errores tienen formato consistente para facilitar el manejo en frontend.
Soporta internacionalización automática (ES/EN).
"""

from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
# Ontological Adaptation: Relative import for ecommerce-playground structure (same directory)
from .i18n import detect_language, translate


class ProblemDetail:
    """
    RFC 7807 Problem Details for HTTP APIs.

    Formato estándar:
    {
        "type": f"https://{settings.API_DOMAIN}/errors/validation-error",
        "title": "Validation Error",
        "status": 400,
        "detail": "Los datos enviados no son válidos",
        "instance": "/api/v1/hrm/employees",
        "errors": {...}  // Opcional: detalles adicionales
    }
    """

    def __init__(
        self, type: str, title: str, status: int, detail: str, instance: str, errors: dict[str, Any] | None = None
    ):
        self.type = type
        self.title = title
        self.status = status
        self.detail = detail
        self.instance = instance
        self.errors = errors or {}

    def to_dict(self) -> dict[str, Any]:
        result = {
            "type": self.type,
            "title": self.title,
            "status": self.status,
            "detail": self.detail,
            "instance": self.instance,
        }
        if self.errors:
            result["errors"] = self.errors
        return result


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handler para HTTPException (incluye FastAPI HTTPException).
    Convierte a formato RFC 7807 con i18n automático.
    """
    # Detectar idioma del usuario
    lang = detect_language(request)

    # Mapeo de status codes a tipos de error
    error_type_keys = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "unprocessable_entity",
        500: "internal_error",
    }

    type_key = error_type_keys.get(exc.status_code, "internal_error")
    title = translate(type_key, lang)

    problem = ProblemDetail(
        type=f"https://{settings.API_DOMAIN}/errors/{type_key.replace('_', '-')}",
        title=title,
        status=exc.status_code,
        detail=str(exc.detail),  # El detail ya viene custom del endpoint
        instance=request.url.path,
    )

    return JSONResponse(
        status_code=exc.status_code, content=problem.to_dict(), headers=exc.headers if hasattr(exc, "headers") else None
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handler para errores de validación de Pydantic.
    Formatea errores de campo de forma user-friendly + i18n.
    """
    lang = detect_language(request)

    # Transformar errores de Pydantic a formato legible
    errors = {}
    for error in exc.errors():
        # Handle 'body' location cases gracefully
        if len(error["loc"]) > 1 and error["loc"][0] == "body":
            field = ".".join(str(loc) for loc in error["loc"][1:])
        else:
            field = ".".join(str(loc) for loc in error["loc"])

        errors[field] = {"message": error["msg"], "type": error["type"], "input": str(error.get("input", ""))}

    problem = ProblemDetail(
        type=f"https://{settings.API_DOMAIN}/errors/validation-error",
        title=translate("validation_error", lang),
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=translate("validation_detail", lang),
        instance=request.url.path,
        errors=errors,
    )

    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=problem.to_dict())


async def integrity_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """
    Handler para errores de integridad de base de datos (FK, unique, etc).
    Traduce errores técnicos de SQL a mensajes user-friendly.
    """
    # Defensive check if exc.orig is None
    error_msg = str(exc.orig).lower() if exc.orig else str(exc).lower()

    # [DEBUG] Log completo del error para diagnóstico
    print(f"❌ [DB IntegrityError] {error_msg}")
    print(f"   Path: {request.url.path}")

    lang = detect_language(request)
    errors = {}

    # Mapeo de errores comunes
    if "foreign key" in error_msg or "violates foreign key constraint" in error_msg:
        detail = translate("foreign_key_error", lang)
        # Intent simple de extraer campo
        errors = {"relation": "Referencia inválida"}
    elif "unique constraint" in error_msg or "duplicate key" in error_msg:
        detail = translate("unique_constraint_error", lang)
        errors = {"unique": "Valor duplicado"}
    elif "not-null constraint" in error_msg or "null value" in error_msg:
        detail = translate("not_null_error", lang)
    else:
        detail = translate("generic_integrity_error", lang)

    problem = ProblemDetail(
        type=f"https://{settings.API_DOMAIN}/errors/database-constraint",
        title=translate("database_constraint", lang),
        status=status.HTTP_409_CONFLICT,
        detail=detail,
        instance=request.url.path,
        errors=errors,
    )

    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content=problem.to_dict())


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler genérico para excepciones no capturadas.
    Evita exponer detalles internos en producción.
    """
    # En desarrollo, mostrar stack trace completo
    # En producción, mensaje genérico
    import os

    # Default to production for safety if not set
    is_dev = os.getenv("ENVIRONMENT", "production") == "development"
    lang = detect_language(request)

    if is_dev:
        detail = f"{type(exc).__name__}: {str(exc)}"
        # Safe string conversion for traceback
        import traceback

        errors = {"stack_trace": traceback.format_exc()}
    else:
        detail = translate("unexpected_error", lang)
        errors = {}

    problem = ProblemDetail(
        type=f"https://{settings.API_DOMAIN}/errors/internal-error",
        title=translate("internal_error", lang),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=detail,
        instance=request.url.path,
        errors=errors,
    )

    # Loguear error completo para debugging
    print(f"❌ [UNHANDLED ERROR] {type(exc).__name__}: {exc}")

    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=problem.to_dict())
