/**
 * src/pages/admin-modules/ContentModule.tsx
 * "Chunk" para la pestaña de Contenido (Información del Negocio).
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-link, .btn-icon
 * FIX (Tracelog v3 - Fase Social Icon):
 * 2. Social icon upload usa hidden input + TouchButton (patrón homologado)
 * 3. Auto-guarda redes sociales antes de subir icono (evita 400 por indice fuera de rango)
 * 4. Validación de tipo y tamaño de archivo en social icons
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import type { BusinessInfo, SocialNetwork } from "../types"; // Fix: ../types instead of ../../types
import type { BusinessInfoUpdate } from "../types";

// Importar componentes reutilizables
import { Input } from "../components/FormControls"; // Select removed
import { TouchButton } from "../components/common/TouchButton";

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = "";

interface ContentModuleProps {
  onUpdate: () => void; // Función para forzar el refresh global
}

import { useToast } from "../components/ui/Toast";

export default function ContentModule({ onUpdate }: ContentModuleProps) {
  const [info, setInfo] = useState<Partial<BusinessInfo>>({
    social_networks: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingSocialIdx, setUploadingSocialIdx] = useState<number | null>(
    null,
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const socialIconRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const { toast } = useToast();

  // Eliminar logo o icono del negocio
  const handleDeleteImage = async (field: "logo_url" | "icon_url") => {
    const label = field === "logo_url" ? "Logo" : "Icono";
    if (!window.confirm(`¿Eliminar el ${label.toLowerCase()} del negocio?`))
      return;

    const setLoading =
      field === "logo_url" ? setUploadingLogo : setUploadingIcon;
    setLoading(true);
    try {
      const deleter =
        field === "logo_url" ? api.deleteBusinessLogo : api.deleteBusinessIcon;
      const res = await deleter();
      setInfo((prev: Partial<BusinessInfo>) => ({
        ...prev,
        [field]: res[field] ?? null,
      }));
      toast(`✓ ${label} eliminado`, "success");
      onUpdate();
    } catch (error: unknown) {
      toast(
        `Error eliminando ${label.toLowerCase()}: ${(error as Error).message}`,
        "error",
      );
    }
    setLoading(false);
  };

  // Cargar datos al montar
  useEffect(() => {
    api
      .getBusinessInfo()
      .then(setInfo)
      .catch((err) => toast("Error cargando info: " + err.message, "error"));
  }, [toast]);

  // Helper: guardar redes sociales en BD (sin toast, retorna info actualizada)
  const saveNetworksToBackend = useCallback(async (): Promise<BusinessInfo> => {
    const updateDto: BusinessInfoUpdate = {
      name: info.name,
      rif: info.rif,
      contact: info.contact,
      social_networks: info.social_networks,
    };
    return await api.updateBusinessInfo(updateDto);
  }, [info]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNetworksToBackend();
      toast("✓ Información actualizada", "success");
      onUpdate();
    } catch (error: unknown) {
      toast("Error guardando: " + (error as Error).message, "error");
    }
    setSaving(false);
  };

  // Manejador genérico para Logo e Icono con loading individual
  const handleUpload = async (
    file: File | null | undefined,
    uploader: (file: File) => Promise<BusinessInfo>,
    field: "logo_url" | "icon_url",
  ) => {
    if (!file) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith("image/")) {
      toast("Solo se permiten archivos de imagen", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("La imagen no debe superar 2MB", "error");
      return;
    }

    const setLoading =
      field === "logo_url" ? setUploadingLogo : setUploadingIcon;
    setLoading(true);
    try {
      const res = await uploader(file);
      setInfo((prevInfo: Partial<BusinessInfo>) => ({
        ...prevInfo,
        [field]: res[field],
      }));
      toast(
        `✓ ${field === "logo_url" ? "Logo" : "Icono"} actualizado`,
        "success",
      );
      onUpdate();
    } catch (error: unknown) {
      toast(`Error subiendo imagen: ${(error as Error).message}`, "error");
    }
    setLoading(false);
  };

  const handleSocialIconUpload = async (
    index: number,
    file: File | null | undefined,
  ) => {
    if (!file) return;

    // Validar tipo y tamaño (homologado con logo/icon)
    if (!file.type.startsWith("image/")) {
      toast("Solo se permiten archivos de imagen", "error");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast("El icono no debe superar 1MB", "error");
      return;
    }

    setUploadingSocialIdx(index);
    try {
      // Paso 1: Auto-guardar redes sociales para que el backend conozca el index
      await saveNetworksToBackend();

      // Paso 2: Subir el icono (ahora el index existe en BD)
      const updatedInfo = await api.uploadSocialNetworkIcon(index, file);
      setInfo(updatedInfo);
      toast("✓ Icono de red social actualizado.", "success");
      onUpdate();
    } catch (error: unknown) {
      toast(`Error subiendo icono: ${(error as Error).message}`, "error");
    }
    setUploadingSocialIdx(null);
  };

  // --- Funciones para la lista dinámica de Redes Sociales ---

  const addNetwork = () => {
    setInfo((prev: Partial<BusinessInfo>) => ({
      ...prev,
      social_networks: [
        ...(prev.social_networks || []),
        { name: "facebook", url: "" },
      ],
    }));
  };

  const updateNetwork = (
    index: number,
    field: "name" | "url" | "icon",
    value: string,
  ) => {
    const networks = [...(info.social_networks || [])];
    networks[index] = { ...networks[index], [field]: value } as SocialNetwork;
    setInfo({ ...info, social_networks: networks });
  };

  const removeNetwork = (index: number) => {
    setInfo((prev: Partial<BusinessInfo>) => ({
      ...prev,
      social_networks: prev.social_networks?.filter(
        (_: SocialNetwork, i: number) => i !== index,
      ),
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          Información del Negocio
        </h2>
        <div className="space-y-4">
          <Input
            label="Nombre del Negocio"
            value={info.name || ""}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
            data-testid="content-name-input"
          />
          <Input
            label="RIF"
            value={info.rif || ""}
            onChange={(e) => setInfo({ ...info, rif: e.target.value })}
          />
          <Input
            label="Contacto (Teléfono/Email)"
            value={info.contact || ""}
            onChange={(e) => setInfo({ ...info, contact: e.target.value })}
          />

          <h3 className="text-lg font-semibold pt-4 border-t mt-6 text-gray-900">
            Redes Sociales
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 items-center font-semibold text-sm text-gray-600 px-1">
              <div className="col-span-3">Nombre</div>
              <div className="col-span-4">URL</div>
              <div className="col-span-4">Icono</div>
              <div className="col-span-1"></div>
            </div>
            {info.social_networks?.map((net: SocialNetwork, index: number) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 items-center"
                data-testid={`social-row-${index}`}
              >
                <div className="col-span-3">
                  <Input
                    placeholder="Ej: Facebook"
                    value={net.name}
                    onChange={(e) =>
                      updateNetwork(index, "name", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="https://facebook.com/usuario"
                    value={net.url}
                    onChange={(e) =>
                      updateNetwork(index, "url", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  {/* Hidden file input + TouchButton (patrón homologado con logo/icon) */}
                  <input
                    ref={(el) => {
                      socialIconRefs.current[index] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleSocialIconUpload(index, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <TouchButton
                    onClick={() => socialIconRefs.current[index]?.click()}
                    variant="secondary"
                    icon={Upload}
                    disabled={uploadingSocialIdx === index}
                    className="flex-1"
                  >
                    {uploadingSocialIdx === index
                      ? "Subiendo..."
                      : "Subir Icono"}
                  </TouchButton>
                  {net.icon && (
                    <img
                      src={
                        net.icon.startsWith("http")
                          ? net.icon
                          : `${SERVER_URL}${net.icon}`
                      }
                      alt={`${net.name} icon`}
                      className="w-8 h-8 object-contain image-preview shrink-0 rounded"
                    />
                  )}
                </div>
                <div className="col-span-1 text-right">
                  <TouchButton
                    onClick={() => removeNetwork(index)}
                    variant="ghost"
                    className="text-red-500"
                    data-testid={`social-delete-${index}`}
                    iconOnly
                  >
                    <Trash2 size={18} />
                  </TouchButton>
                </div>
              </div>
            ))}
          </div>
          <TouchButton
            onClick={addNetwork}
            variant="ghost"
            className="mt-4"
            data-testid="social-add-button"
            icon={Plus}
          >
            Agregar Red Social
          </TouchButton>
        </div>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <ImageIcon size={20} className="text-gray-500" />
            Logo (400x200px)
          </h3>
          {info.logo_url && (
            <div className="relative mb-4 group">
              <img
                src={`${SERVER_URL}${info.logo_url}?t=${info.updated_at}`}
                alt="Logo del negocio"
                className="w-full h-24 object-contain image-preview bg-gray-50 rounded-lg p-2"
              />
              <button
                type="button"
                onClick={() => handleDeleteImage("logo_url")}
                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Eliminar logo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleUpload(
                e.target.files?.[0],
                api.uploadBusinessLogo,
                "logo_url",
              );
              e.target.value = "";
            }}
            data-testid="content-logo-upload"
          />
          <TouchButton
            onClick={() => logoInputRef.current?.click()}
            variant="secondary"
            icon={Upload}
            disabled={uploadingLogo}
            className="w-full"
          >
            {uploadingLogo ? "Subiendo..." : "Subir Logo"}
          </TouchButton>
          <p className="text-xs text-gray-500 mt-2">
            Recomendado: PNG o SVG, 400x200px. Max 2MB.
          </p>
        </div>

        {/* Isotipo / Favicon Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <ImageIcon size={20} className="text-gray-500" />
            Isotipo / Favicon (64x64px)
          </h3>
          {info.icon_url && (
            <div className="relative mb-4 group inline-block">
              <img
                src={`${SERVER_URL}${info.icon_url}?t=${info.updated_at}`}
                alt="Icono del negocio"
                className="w-16 h-16 object-contain image-preview bg-gray-50 rounded-lg p-2"
              />
              <button
                type="button"
                onClick={() => handleDeleteImage("icon_url")}
                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Eliminar icono"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleUpload(
                e.target.files?.[0],
                api.uploadBusinessIcon,
                "icon_url",
              );
              e.target.value = "";
            }}
            data-testid="content-icon-upload"
          />
          <TouchButton
            onClick={() => iconInputRef.current?.click()}
            variant="secondary"
            icon={Upload}
            disabled={uploadingIcon}
            className="w-full"
          >
            {uploadingIcon ? "Subiendo..." : "Subir Icono"}
          </TouchButton>
          <p className="text-xs text-gray-500 mt-2">
            Este icono se usará en la pestaña del navegador y reemplazará el
            texto del título si está presente.
          </p>
        </div>
      </div>

      <div className="md:col-span-3 text-right mt-6">
        {/* REFACTOR FASE 4: Botón Primario */}
        <TouchButton
          onClick={handleSave}
          disabled={saving}
          data-testid="content-save-button"
          variant="primary"
          icon={Save}
          className="ml-auto"
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </TouchButton>
      </div>
    </div>
  );
}
