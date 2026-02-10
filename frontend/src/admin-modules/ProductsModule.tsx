/**
 * src/pages/admin-modules/ProductsModule.tsx
 * "Chunk" para la pestaña de Gestión de Productos.
 *
 * REFACTORIZADO (FASE 4 - Design 15):
 * - DESIGN 15: Product Form Premium
 * - Drag & Drop Image Upload
 * - Floating Label Inputs
 * - Clean Tabs & Micro-interactions
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Upload,
  Save,
  Plus,
  Trash2,
  Image,
  Edit2,
  Star,
  Loader2,
  Package,
  Tag,
  CreditCard,
  Check,
} from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import { useApp } from "../App";
import { useFeedback } from "../components/ui/FeedbackModal";
import { useUI } from "../components/UIContext";
import type {
  Product,
  Currency,
  ProductCreate,
  ProductUpdate,
  ProductImage,
} from "../types";
import {
  getProductImages,
  addProductImage,
  deleteProductImage,
  setMainImage,
} from "../api";
import { ResponsiveModal } from "../components/common/ResponsiveModal";
import { TouchButton } from "../components/common/TouchButton";
import { Pagination } from "../components/ui/Pagination";

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = "";

// --- Componente Principal del Módulo ---
export default function ProductsModule() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar recarga de lista
  const [isSaving, setIsSaving] = useState(false);

  // REFACTOR FASE 3: Consumir la moneda seleccionada
  const { selectedCurrency } = useApp();

  const handleSaveProduct = async (
    formData: Partial<Product>,
    imageFile?: File,
  ) => {
    setIsSaving(true);
    try {
      const isNew = !formData.id;

      // Construir payload
      const payload: ProductCreate | ProductUpdate = {
        name: formData.name!,
        description: formData.description || "",
        sku: formData.sku || "",
        price: formData.price || 0,
        stock: formData.stock || 0,
        category: formData.category || "",
        image_url: formData.image_url || undefined,
        is_featured: formData.is_featured || false,
        is_discount: formData.is_discount || false,
        discount_percentage: formData.discount_percentage || 0,
        banner_assignment: formData.banner_assignment || "main",
      };

      let savedProduct: Product;
      if (isNew) {
        // NUEVO: Usar endpoint unificado si hay imagen
        if (imageFile) {
          savedProduct = await api.createProductWithImage(
            payload as ProductCreate,
            imageFile,
          );
        } else {
          savedProduct = await api.createProduct(payload as ProductCreate);
        }
      } else {
        // Actualización: Datos primero, luego imagen si hay
        savedProduct = await api.updateProduct(
          formData.id!,
          payload as ProductUpdate,
        );

        // Si hay nueva imagen, subirla después
        if (imageFile) {
          savedProduct = await api.uploadProductImage(formData.id!, imageFile);
        }
      }

      if (savedProduct.id) {
        setShowForm(false);
        setEditingProduct(null);
        setRefreshKey((k) => k + 1);
      }
    } catch (error) {
      console.error(error);
      throw error; // Re-lanzar para que el modal maneje el feedback
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  // Usar sistema de feedback global
  const { showToast } = useFeedback();

  return (
    <>
      {/* Lista de Productos - Siempre visible */}
      <div className="mb-8 flex justify-between items-center animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>
          <p className="text-gray-500 text-sm">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <TouchButton
          onClick={handleNewProduct}
          data-testid="add-product-button"
          icon={Plus}
          variant="primary"
          className="shadow-lg shadow-blue-500/20"
        >
          Nuevo Producto
        </TouchButton>
      </div>

      <ProductList
        onEdit={handleEdit}
        refreshKey={refreshKey}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      {/* Modal Estándar */}
      <ResponsiveModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        subtitle={
          editingProduct
            ? "Modificar datos del producto"
            : "Agrega un nuevo producto al catálogo"
        }
        icon={<Package className="w-6 h-6" />}
        size="lg"
      >
        <ProductForm
          key={editingProduct ? editingProduct.id : "new"}
          product={editingProduct}
          onSave={async (data, file) => {
            try {
              await handleSaveProduct(data, file);
              showToast(
                editingProduct ? "Producto actualizado" : "Producto creado",
                "success",
              );
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Error al guardar";
              showToast(message, "error");
            }
          }}
          isSaving={isSaving}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          selectedCurrency={selectedCurrency}
        />
      </ResponsiveModal>
    </>
  );
}

// ============================================================================
// COMPONENTES INTERNOS DEL MÓDULO DE PRODUCTOS
// ============================================================================

// --- Componente: Lista de Productos (Responsive + Paginación) ---
function ProductList({
  onEdit,
  refreshKey,
  onRefresh,
}: {
  onEdit: (product: Product) => void;
  refreshKey: number;
  onRefresh: () => void;
}) {
  // State for products list
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-Side Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [hasMore, setHasMore] = useState(true); // Para lógica Next/Prev sin count total

  // REFACTOR FASE 3: Consumir el formateador de precios
  const { formatPrice } = useApp();
  const { showToast } = useFeedback();
  const { confirm } = useUI();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const skip = (currentPage - 1) * itemsPerPage;
        // Fetch + 1 to check if there is a next page
        const data = await api.getAllProducts(skip, itemsPerPage + 1);

        if (data.length > itemsPerPage) {
          setHasMore(true);
          setProducts(data.slice(0, itemsPerPage));
        } else {
          setHasMore(false);
          setProducts(data);
        }
      } catch (error) {
        console.error("Error loading products:", error);
        showToast("Error cargando productos", "error");
      } finally {
        setLoading(false);
      }
    };
    void fetchProducts();
  }, [currentPage, itemsPerPage, showToast, refreshKey]); // Reload on page change or refreshKey

  const handleDelete = async (productId: string, productName: string) => {
    const confirmed = await confirm(
      `¿Eliminar "${productName}"? Esta acción no se puede deshacer.`,
      "Eliminar Producto",
    );

    if (!confirmed) return;

    try {
      await api.deleteProduct(productId);
      showToast("Producto eliminado", "success");
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      showToast("Error: " + message, "error");
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading)
    return (
      <div className="text-center py-20 flex flex-col items-center animate-pulse">
        <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
        <span className="text-gray-500 font-medium">
          Sincronizando inventario...
        </span>
      </div>
    );

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 animate-fade-in">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Catálogo vacío</h3>
        <p className="text-gray-500">
          Agrega tu primer producto para comenzar a vender.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* VISTA DESKTOP (TABLA) - Premium Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                        {product.image_url ? (
                          <img
                            src={`${SERVER_URL}${product.image_url.replace(".jpg", "_thumb.jpg")}?t=${product.updated_at}`}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Image size={18} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                          {product.sku || "SIN SKU"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                      {product.category || "General"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </div>
                    {product.is_discount && (
                      <div className="text-xs text-red-500 line-through opacity-75">
                        {formatPrice(
                          product.price /
                            ((100 - product.discount_percentage) / 100),
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${product.stock > 10 ? "bg-green-500" : product.stock > 0 ? "bg-yellow-500" : "bg-red-500"}`}
                      />
                      <span
                        className={`text-sm font-medium ${product.stock === 0 ? "text-red-600" : "text-gray-700"}`}
                      >
                        {product.stock} un.
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL (CARDS) */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group active:scale-[0.98] transition-transform"
            onClick={() => onEdit(product)}
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
                {product.image_url ? (
                  <img
                    src={`${SERVER_URL}${product.image_url.replace(".jpg", "_thumb.jpg")}?t=${product.updated_at}`}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Image size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {product.category}
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-bold text-blue-600">
                    {formatPrice(product.price)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${product.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {product.stock > 0 ? `${product.stock} un.` : "Agotado"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        hasMore={hasMore}
        onPageChange={handlePageChange}
        className="mt-6 pb-20 md:pb-8"
      />
    </div>
  );
}

// --- Componente: Formulario de Producto (Design 15) ---
function ProductForm({
  product,
  onSave,
  onCancel,
  isSaving,
  selectedCurrency,
}: {
  product: Product | null;
  onSave: (data: Partial<Product>, imageFile?: File) => void;
  onCancel: () => void;
  isSaving: boolean;
  selectedCurrency: Currency | null;
}) {
  const { alert } = useUI();
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: "",
      description: "",
      sku: "",
      price: 0,
      stock: 0,
      category: "",
      is_featured: false,
      is_discount: false,
      discount_percentage: 0,
      image_url: "",
    },
  );

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image_url || null,
  );
  const [activeTab, setActiveTab] = useState<"details" | "images" | "config">(
    "details",
  );

  // Price input: estado local para evitar cursor jumping (patrón bancario)
  const [priceInput, setPriceInput] = useState(() => {
    const basePrice = formData.price || 0;
    if (selectedCurrency && !selectedCurrency.is_base) {
      return (basePrice / selectedCurrency.exchange_rate).toFixed(2);
    }
    return basePrice.toFixed(2);
  });
  const [priceInputFocused, setPriceInputFocused] = useState(false);

  // Sincronizar priceInput cuando cambia currency (pero no si el usuario está editando)
  useEffect(() => {
    if (priceInputFocused) return;
    const basePrice = formData.price || 0;
    if (selectedCurrency && !selectedCurrency.is_base) {
      setPriceInput((basePrice / selectedCurrency.exchange_rate).toFixed(2));
    } else {
      setPriceInput(basePrice.toFixed(2));
    }
  }, [formData.price, selectedCurrency, priceInputFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, pendingImageFile || undefined);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permitir solo dígitos y un punto decimal (patrón bancario)
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;

    setPriceInput(raw);

    // Convertir a base price solo si es un número válido
    const priceNum = parseFloat(raw);
    if (!isNaN(priceNum)) {
      let newBasePrice = priceNum;
      if (selectedCurrency && !selectedCurrency.is_base) {
        newBasePrice = priceNum * selectedCurrency.exchange_rate;
      }
      setFormData({ ...formData, price: newBasePrice });
    }
  };

  const handlePriceBlur = () => {
    setPriceInputFocused(false);
    // Formatear al perder foco: asegurar 2 decimales
    const priceNum = parseFloat(priceInput);
    if (!isNaN(priceNum)) {
      setPriceInput(priceNum.toFixed(2));
    } else {
      setPriceInput("0.00");
      setFormData({ ...formData, price: 0 });
    }
  };

  const handleImageSelect = (file: File) => {
    setPendingImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const currentImageUrl = imagePreview || formData.image_url;

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="product-form"
      className="animate-fade-in"
    >
      {/* Premium Tabs */}
      <div className="flex border-b border-gray-100 mb-6 sticky top-0 bg-white z-10 pt-2">
        {["details", "images", "config"].map((tab, idx) => {
          const labels = {
            details: "Detalles",
            images: "Galería",
            config: "Avanzado",
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={async () => {
                if (tab === "images" && !formData.id) {
                  await alert(
                    "Guarda el producto primero para gestionar imágenes",
                  );
                  return;
                }
                setActiveTab(tab as any);
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                isActive
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              <span className="mr-2 opacity-50">{idx + 1}.</span>
              {labels[tab as keyof typeof labels]}
            </button>
          );
        })}
      </div>

      <div
        className={activeTab === "details" ? "block animate-fade-in" : "hidden"}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="md:col-span-2 space-y-5">
            <SectionHeader icon={Tag} title="Información Básica" />
            <FloatingInput
              label="Nombre del Producto"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="Ej. Acetaminofén 500mg"
            />
            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                label="SKU / Código"
                value={formData.sku || ""}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
              />
              <FloatingInput
                label="Categoría"
                value={formData.category || ""}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                list="categories"
              />
              <datalist id="categories">
                <option value="Medicamentos" />
                <option value="Cuidado Personal" />
                <option value="Equipos Médicos" />
              </datalist>
            </div>
            <div className="relative">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Descripción
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
              />
            </div>

            <div className="pt-4 grid grid-cols-2 gap-6">
              <div>
                <SectionHeader icon={CreditCard} title="Precio" small />
                <FloatingInput
                  label={`Precio (${selectedCurrency?.symbol || "..."})`}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={priceInput}
                  onChange={handlePriceChange}
                  onFocus={() => setPriceInputFocused(true)}
                  onBlur={handlePriceBlur}
                  required
                  className="font-mono font-bold text-lg"
                />
              </div>
              <div>
                <SectionHeader icon={Package} title="Inventario" small />
                <FloatingInput
                  label="Stock Disponible"
                  type="number"
                  min="0"
                  value={formData.stock || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-6 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Checkbox
                label="Producto Destacado"
                checked={formData.is_featured || false}
                onChange={(e) =>
                  setFormData({ ...formData, is_featured: e.target.checked })
                }
              />
              <Checkbox
                label="En Oferta"
                checked={formData.is_discount || false}
                onChange={(e) =>
                  setFormData({ ...formData, is_discount: e.target.checked })
                }
              />
            </div>

            {formData.is_discount && (
              <div className="animate-fade-in">
                <FloatingInput
                  label="Porcentaje de Descuento (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Side Column: Image */}
          <div className="space-y-4">
            <SectionHeader icon={Image} title="Imagen Principal" />
            <ImageUploader
              label=""
              currentImageUrl={currentImageUrl}
              onFileSelect={handleImageSelect}
              isUploading={isSaving}
            />

            {pendingImageFile && !formData.id && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <Check size={12} /> Imagen lista para subir
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TAB IMÁGENES */}
      {activeTab === "images" && formData.id && (
        <ProductImageManager productId={formData.id} />
      )}

      {/* TAB CONFIGURACIÓN */}
      {activeTab === "config" && (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <div className="inline-block p-4 bg-white rounded-full shadow-sm mb-4">
            <Package size={32} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900">Configuración Avanzada</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            Próximamente podrás gestionar metadatos SEO, dimensiones de envío y
            códigos de barras adicionales.
          </p>
        </div>
      )}

      {/* Actions Footer */}
      {activeTab !== "images" && (
        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
          <TouchButton
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="flex-1 sm:flex-none justify-center"
          >
            Cancelar
          </TouchButton>
          <TouchButton
            type="submit"
            disabled={isSaving || !formData.name || !displayPrice}
            data-testid="product-form-save-button"
            variant="primary"
            icon={Save}
            loading={isSaving}
            className="flex-1 justify-center"
          >
            {isSaving
              ? "Guardando..."
              : formData.id
                ? "Guardar Cambios"
                : "Crear Producto"}
          </TouchButton>
        </div>
      )}
    </form>
  );
}

// --- Helper Components ---
const SectionHeader = ({
  icon: Icon,
  title,
  small,
}: {
  icon: any;
  title: string;
  small?: boolean;
}) => (
  <h3
    className={`font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2 ${small ? "text-xs mb-2" : "text-sm mb-4"}`}
  >
    <Icon size={small ? 14 : 16} className="text-blue-600" /> {title}
  </h3>
);

// --- Componente: Gestor de Imágenes (Galería) ---
function ProductImageManager({ productId }: { productId: string }) {
  const { confirm } = useUI();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductImages(productId);
      setImages(data);
    } catch (error) {
      console.error("Error loading images:", error);
      showToast("Error al cargar galería", "error");
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 5) {
      showToast("Máximo 5 imágenes permitidas", "warning");
      return;
    }

    try {
      await addProductImage(productId, file);
      showToast("Imagen subida exitosamente", "success");
      loadImages();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      showToast(message || "Error al subir imagen", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!(await confirm("¿Eliminar esta imagen?"))) return;
    try {
      await deleteProductImage(productId, imageId);
      showToast("Imagen eliminada", "success");
      loadImages();
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  const handleSetMain = async (imageId: string) => {
    try {
      await setMainImage(productId, imageId);
      showToast("Imagen principal actualizada", "success");
      loadImages();
    } catch {
      showToast("Error al actualizar principal", "error");
    }
  };

  if (loading && images.length === 0)
    return (
      <div className="p-8 text-center flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" /> Cargando imágenes...
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Galería Multimedia</h3>
        {images.length < 5 && (
          <TouchButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
            icon={Upload}
            className="text-sm px-4 py-2 mb-0"
          >
            Subir Nueva Foto
          </TouchButton>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleUpload}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className={`relative group bg-white border-2 rounded-xl overflow-hidden transition-all ${img.is_main ? "border-blue-500 ring-2 ring-blue-100" : "border-dashed border-gray-200 hover:border-blue-300"}`}
          >
            <div className="w-full h-32 flex items-center justify-center bg-gray-50">
              <img
                src={`${SERVER_URL}${img.image_url}`}
                alt="Product"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleDelete(img.id)}
                className="bg-white text-red-500 hover:text-red-700 p-1.5 rounded-full shadow-sm"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="p-2 bg-white flex justify-between items-center border-t border-gray-100">
              {img.is_main ? (
                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 uppercase tracking-wide">
                  <Star size={10} fill="currentColor" /> Principal
                </span>
              ) : (
                <button
                  onClick={() => handleSetMain(img.id)}
                  className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wide"
                >
                  Establecer Principal
                </button>
              )}
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Image size={32} className="mx-auto mb-2 opacity-50" />
            <p>No hay imágenes adicionales</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Componente: Subidor de Imágenes (Drag & Drop) ---
function ImageUploader({
  label,
  currentImageUrl,
  onFileSelect,
  isUploading,
}: {
  label: string;
  currentImageUrl?: string | null;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}) {
  const [preview, setPreview] = useState(currentImageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useFeedback();

  useEffect(() => {
    setPreview(currentImageUrl);
  }, [currentImageUrl]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Solo se permiten imágenes", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen es muy grande (Máx 5MB)", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    onFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="mb-4">
      <div
        className={`relative border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {preview ? (
          <>
            <img
              src={
                preview.startsWith("data:")
                  ? preview
                  : `${SERVER_URL}${preview}`
              }
              alt="Preview"
              className="max-w-full max-h-full object-contain p-4"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-white font-bold flex items-center gap-2">
                <Upload size={18} /> Cambiar Imagen
              </p>
            </div>
          </>
        ) : (
          <div className="text-center p-6">
            <div
              className={`w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 transition-transform ${isDragging ? "scale-110" : ""}`}
            >
              <Upload size={24} />
            </div>
            <p className="font-bold text-gray-900">
              Haz click o arrastra una imagen
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, WEBP (Máx. 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Floating Input Component (Premium) ---
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const FloatingInput = ({ label, className, ...props }: FloatingInputProps) => (
  <div className="relative">
    <input
      {...props}
      placeholder=" " // Required for :placeholder-shown trick
      className={`peer w-full px-4 pt-5 pb-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder-transparent ${className || ""}`}
    />
    <label
      className="absolute left-4 top-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider transition-all 
      peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case
      peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 peer-focus:uppercase pointer-events-none"
    >
      {label}
    </label>
  </div>
);

const Checkbox = ({ label, ...props }: any) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative flex items-center">
      <input type="checkbox" className="peer sr-only" {...props} />
      <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
      <Check
        size={12}
        className="absolute text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity"
        strokeWidth={3}
      />
    </div>
    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
      {label}
    </span>
  </label>
);
