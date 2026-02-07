"""
Sistema de Internacionalización (i18n) para Backend.

Detecta idioma del usuario desde header Accept-Language y
retorna mensajes de error en el idioma correspondiente.

Soporta: Español (es), Inglés (en)
"""

from fastapi import Request

# ==============================================================================
# DICCIONARIO DE TRADUCCIONES
# ==============================================================================

TRANSLATIONS: dict[str, dict[str, str]] = {
    # --- TÍTULOS DE ERROR (RFC 7807) ---
    "bad_request": {"es": "Solicitud Inválida", "en": "Bad Request"},
    "unauthorized": {"es": "No Autorizado", "en": "Unauthorized"},
    "forbidden": {"es": "Acceso Denegado", "en": "Forbidden"},
    "not_found": {"es": "Recurso No Encontrado", "en": "Not Found"},
    "conflict": {"es": "Conflicto de Recursos", "en": "Conflict"},
    "unprocessable_entity": {"es": "Entidad No Procesable", "en": "Unprocessable Entity"},
    "internal_error": {"es": "Error Interno del Servidor", "en": "Internal Server Error"},
    "validation_error": {"es": "Error de Validación", "en": "Validation Error"},
    "database_constraint": {"es": "Error de Integridad de Datos", "en": "Data Integrity Error"},
    # --- MENSAJES COMUNES ---
    "validation_detail": {
        "es": "Los datos enviados contienen errores de validación",
        "en": "The submitted data contains validation errors",
    },
    "foreign_key_error": {
        "es": "El recurso referenciado no existe o ha sido eliminado",
        "en": "The referenced resource does not exist or has been deleted",
    },
    "unique_constraint_error": {
        "es": "Ya existe un registro con estos datos únicos",
        "en": "A record with this unique data already exists",
    },
    "not_null_error": {"es": "Falta un campo obligatorio", "en": "A required field is missing"},
    "generic_integrity_error": {"es": "Error de integridad de datos", "en": "Data integrity error"},
    "unexpected_error": {
        "es": "Ha ocurrido un error inesperado. Contacte al soporte técnico.",
        "en": "An unexpected error occurred. Please contact technical support.",
    },
}


def detect_language(request: Request) -> str:
    """
    Detecta el idioma preferido del usuario desde el header Accept-Language.
    Default: 'es' (Español) para este mercado.
    """
    accept_language = request.headers.get("Accept-Language", "es")

    # Parsear el header (formato: "es-AR,es;q=0.9,en;q=0.8")
    languages = accept_language.split(",")

    for lang in languages:
        # Extraer código primario (antes de '-' o ';')
        code = lang.split(";")[0].split("-")[0].strip().lower()

        if code in ["es", "español", "spa"]:
            return "es"
        if code in ["en", "english", "eng"]:
            return "en"

    return "es"


def translate(key: str, lang: str = "es") -> str:
    """
    Traduce una clave a un idioma específico.
    """
    if key not in TRANSLATIONS:
        return key

    if lang not in TRANSLATIONS[key]:
        lang = "es"  # Fallback a español

    return TRANSLATIONS[key][lang]
