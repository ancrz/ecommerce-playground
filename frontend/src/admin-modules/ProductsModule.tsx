/**
 * src/pages/admin-modules/ProductsModule.tsx
 * "Chunk" para la pestaña de Gestión de Productos.
 *
 * REFACTORIZADO (FASE 3):
 * 1. Consume 'selectedCurrency' del contexto.
 * 2. El formulario de "Precio" ahora es "currency-aware".
 * 3. Muestra el precio convertido a la moneda seleccionada (ej. $).
 * 4. Guarda el precio convirtiéndolo de vuelta a la moneda base (ej. Bs.).
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Upload, X, Save, Plus, Trash2, Image, Edit2, Star } from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import { useApp } from "../App";
import { useFeedback } from "../components/ui/FeedbackModal";
import type { Product, Currency } from "../types";
// Importar los DTOs de Intención (deben estar en types.ts)
import type { ProductCreate, ProductUpdate, ProductImage } from "../types";
import { getProductImages, addProductImage, deleteProductImage, setMainImage } from "../api";

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

  const handleSaveProduct = async (formData: Partial<Product>, imageFile?: File) => {
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
          savedProduct = await api.createProductWithImage(payload as ProductCreate, imageFile);
        } else {
          savedProduct = await api.createProduct(payload as ProductCreate);
        }
      } else {
        // Actualización: Datos primero, luego imagen si hay
        savedProduct = await api.updateProduct(
          formData.id!,
          payload as ProductUpdate
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
    } catch (error: any) {
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Lista de Productos
        </h2>
        <button
          onClick={handleNewProduct}
          data-testid="add-product-button"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>
      <ProductList
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      {/* Modal de Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-slideUp">
            {/* Header del Modal con color del tema */}
            <div 
              className="sticky top-0 px-6 py-4 flex justify-between items-center z-10 rounded-t-2xl text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Contenido del Modal */}
            <div className="p-6">
              <ProductForm
                product={editingProduct}
                onSave={async (data, file) => {
                  try {
                    await handleSaveProduct(data, file);
                    showToast(editingProduct ? 'Producto actualizado' : 'Producto creado');
                  } catch (err: any) {
                    showToast(err.message || 'Error al guardar', 'error');
                  }
                }}
                isSaving={isSaving}
                onCancel={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
                selectedCurrency={selectedCurrency}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// COMPONENTES INTERNOS DEL MÓDULO DE PRODUCTOS
// ============================================================================

// --- Componente: Lista de Productos ---
function ProductList({
  onEdit,
  refreshKey,
}: {
  onEdit: (product: Product) => void;
  refreshKey: number;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // REFACTOR FASE 3: Consumir el formateador de precios
  const { formatPrice } = useApp();
  const { showToast, confirm } = useFeedback();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getAllProducts(); // Llama a GET /api/products/
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
    setLoading(false);
  };

  // Recargar cuando 'refreshKey' cambie
  useEffect(() => {
    loadProducts();
  }, [refreshKey]);

  const handleDelete = async (productId: string, productName: string) => {
    const confirmed = await confirm({
      title: 'Eliminar Producto',
      message: `¿Eliminar "${productName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    
    if (!confirmed) return;
    
    try {
      await api.deleteProduct(productId);
      showToast('Producto eliminado', 'success');
      loadProducts(); // Recargar lista
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  if (loading)
    return (
      <div className="text-center py-8 text-gray-500">
        Cargando productos...
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Imagen
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Precio (Moneda Base)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Estado
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-gray-50"
                data-testid={`product-row-${product.id}`}
              >
                <td className="px-4 py-3">
                  {product.image_url ? (
                    <img
                      src={`${SERVER_URL}${product.image_url.replace('.jpg', '_thumb.jpg')}?t=${product.updated_at}`}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded image-preview"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <Image size={24} className="text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">
                    {product.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {product.category || "Sin categoría"}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {product.sku || "-"}
                </td>
                <td className="px-4 py-3">
                  {/* REFACTOR FASE 3: Usar el formateador de precios */}
                  <div className="font-semibold text-blue-600">
                    {formatPrice(product.price)}
                  </div>
                  {product.is_discount && (
                    <div className="text-xs text-red-600">
                      Desc: {formatPrice(product.final_price ?? product.price)} (-
                      {product.discount_percentage}%)
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-semibold ${
                      product.stock > 10
                        ? "text-green-600"
                        : product.stock > 0
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {product.is_featured && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full text-center">
                        Destacado
                      </span>
                    )}
                    {product.is_discount && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full text-center">
                        Descuento
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No hay productos registrados
        </div>
      )}
    </div>
  );
}

// --- Componente: Formulario de Producto ---
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
  const [formData, setFormData] = useState<Partial<Product>>(product || {});
  const [displayPrice, setDisplayPrice] = useState("0");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  // State for tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'config'>('details');

  useEffect(() => {
    const basePrice = product?.price || 0;
    setFormData(
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
      }
    );
    // Reset image state when product changes
    setPendingImageFile(null);
    setImagePreview(product?.image_url || null);

    if (selectedCurrency && !selectedCurrency.is_base) {
      setDisplayPrice((basePrice / selectedCurrency.exchange_rate).toFixed(2));
    } else {
      setDisplayPrice(basePrice.toFixed(2));
    }
  }, [product, selectedCurrency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, pendingImageFile || undefined);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayPrice = e.target.value;
    setDisplayPrice(newDisplayPrice);

    const priceNum = parseFloat(newDisplayPrice) || 0;
    let newBasePrice = priceNum;

    if (selectedCurrency && !selectedCurrency.is_base) {
      newBasePrice = priceNum * selectedCurrency.exchange_rate;
    }

    setFormData({ ...formData, price: newBasePrice });
  };

  const handleImageSelect = (file: File) => {
    setPendingImageFile(file);
    // Create local preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const currentImageUrl = imagePreview || formData.image_url;

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="product-form"
    >
      {/* Tab Nav */}
      <div className="flex border-b mb-6">
         <button
           type="button"
           className={`px-4 py-2 font-medium ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setActiveTab('details')}
         >
           Detalles
         </button>
         <button
            type="button"
            className={`px-4 py-2 font-medium ${activeTab === 'images' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => {
                if (!formData.id) {
                    alert("Guarda el producto primero para gestionar imágenes");
                    return;
                }
                setActiveTab('images');
            }}
         >
           Imágenes
         </button>
         <button
            type="button"
            className={`px-4 py-2 font-medium ${activeTab === 'config' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('config')}
         >
           Configuración
         </button>
      </div>

      <div className={activeTab === 'details' ? 'block' : 'hidden'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos */}
        <div className="md:col-span-2 space-y-4">
          <Input
            label="Nombre *"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextArea
            label="Descripción"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
          <Input
            label="SKU"
            value={formData.sku || ""}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Precio (${selectedCurrency?.symbol || "..."}) *`}
              type="number"
              step="0.01"
              min="0"
              value={displayPrice}
              onChange={handlePriceChange}
              required
              data-testid="product-price-input"
            />
            <Input
              label="Stock"
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
          <Input
            label="Categoría"
            value={formData.category || ""}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          />
          <div className="flex gap-6">
            <Checkbox
              label="Producto Destacado"
              checked={formData.is_featured || false}
              onChange={(e) =>
                setFormData({ ...formData, is_featured: e.target.checked })
              }
            />
            <Checkbox
              label="En Descuento"
              checked={formData.is_discount || false}
              onChange={(e) =>
                setFormData({ ...formData, is_discount: e.target.checked })
              }
            />
          </div>
          {formData.is_discount && (
            <Input
              label="% Descuento"
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
          )}
        </div>

        {/* Columna Derecha: Imagen */}
        <div>
          <ImageUploader
            label="Imagen del Producto"
            currentImageUrl={currentImageUrl}
            onFileSelect={handleImageSelect}
            isUploading={isSaving}
          />
          {pendingImageFile && !formData.id && (
            <p className="text-xs text-blue-600 mt-2">
              ✓ Imagen seleccionada. Se subirá al guardar el producto.
            </p>
          )}
          
          {/* Modal de preview */}
          {showImageModal && currentImageUrl && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
              onClick={() => setShowImageModal(false)}
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <button 
                  onClick={() => setShowImageModal(false)}
                  className="absolute -top-10 right-0 text-white hover:text-gray-300"
                >
                  <X size={32} />
                </button>
                <img 
                  src={currentImageUrl.startsWith('data:') 
                    ? currentImageUrl 
                    : `${SERVER_URL}${currentImageUrl}?t=${Date.now()}`
                  }
                  alt="Preview"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      {/* Fin Tab Detalles */}

      {/* TAB IMÁGENES */}
      {activeTab === 'images' && formData.id && (
        <ProductImageManager productId={formData.id} />
      )}

      {/* TAB CONFIGURACIÓN */}
      {activeTab === 'config' && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-lg mb-4">Configuración Avanzada</h3>
          <p className="text-gray-500 mb-4">Opciones de SKU, SEO y Logística (Próximamente)</p>
          <div className="grid grid-cols-1 gap-4 opacity-50 pointer-events-none">
             <Input label="SKU (Stock Keeping Unit)" value={formData.sku || ''} disabled />
             <Input label="Meta Title (SEO)" disabled />
             <Input label="Meta Description (SEO)" disabled />
          </div>
        </div>
      )}

      {/* Botones (Solo en tab detalles o global? Dejémoslo global pero oculto en images si se desea) */}
      {activeTab !== 'images' && (
      <div className="flex gap-3 mt-6 pt-6 border-t whitespace-pre-wrap">
        {/* Botones */}
        <button
          type="submit"
          disabled={isSaving || !formData.name || !displayPrice}
          data-testid="product-form-save-button"
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {isSaving
            ? "Guardando..."
            : formData.id
            ? "Guardar Cambios"
            : "Crear Producto"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
        >
          Cancelar
        </button>
      </div>
      )}
    </form>
  );
}

// --- Componente: Gestor de Imágenes (Galería) ---
function ProductImageManager({ productId }: { productId: string }) {
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
    } catch (error: any) {
      showToast(error.message || "Error al subir imagen", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    try {
      await deleteProductImage(productId, imageId);
      showToast("Imagen eliminada", "success");
      loadImages();
    } catch (error) {
      showToast("Error al eliminar", "error");
    }
  };

  const handleSetMain = async (imageId: string) => {
    try {
      await setMainImage(productId, imageId);
      showToast("Imagen principal actualizada", "success");
      loadImages();
    } catch (error) {
      showToast("Error al actualizar principal", "error");
    }
  };

  if (loading && images.length === 0) return <div className="p-8 text-center">Cargando imágenes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Galería de Imágenes ({images.length}/5)</h3>
        {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload size={18} /> Subir Imagen
            </button>
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
          <div key={img.id} className={`relative group border rounded-lg p-2 ${img.is_main ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <div className="w-full h-32 bg-gray-50 rounded flex items-center justify-center overflow-hidden mb-2">
              <img 
                src={`${SERVER_URL}${img.image_url}`} 
                alt="Product" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            <div className="flex justify-between items-center px-1">
                {img.is_main ? (
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <Star size={12} fill="currentColor" /> Principal
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetMain(img.id)}
                    className="text-xs text-gray-500 hover:text-blue-600 underline"
                  >
                    Hacer Principal
                  </button>
                )}
                
                <button 
                  onClick={() => handleDelete(img.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// --- Componente: Subidor de Imágenes de Producto (Simplificado) ---
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useFeedback();

  useEffect(() => {
    setPreview(currentImageUrl);
  }, [currentImageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Por favor selecciona una imagen válida", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen es muy grande. Máximo 5MB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    onFileSelect(file);
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            {preview ? (
              <div className="relative group w-full h-48 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    preview.startsWith("data:")
                      ? preview
                      : `${SERVER_URL}${preview}?t=${new Date().getTime()}`
                  }
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="opacity-0 group-hover:opacity-100 transition bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {isUploading ? "Subiendo..." : "Cambiar Imagen"}
                  </button>
                </div>
              </div>
            ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-48 flex flex-col items-center justify-center bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <Upload size={48} className="text-gray-400 mb-2" />
            <span className="text-gray-600 font-medium">
              {isUploading ? "Subiendo..." : "Click para subir imagen"}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              JPG, PNG, GIF (máx. 5MB)
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- Componentes genéricos de formulario (reutilizados) ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
const Input = ({ label, ...props }: InputProps) => (
  <div>
    {label && (
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
    )}
    <input
      {...props}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
const TextArea = ({ label, ...props }: TextAreaProps) => (
  <div>
    {label && (
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
    )}
    <textarea
      {...props}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        props.className || ""
      }`}
    />
  </div>
);



interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const Checkbox = ({ label, ...props }: CheckboxProps) => (
  <label className="flex items-center">
    <input
      type="checkbox"
      {...props}
      className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </label>
);
