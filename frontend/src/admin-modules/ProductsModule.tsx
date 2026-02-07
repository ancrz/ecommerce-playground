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
import { Upload, X, Save, Plus, Trash2, Image, Edit2, Star, Loader2, Package, Tag, CreditCard } from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import { useApp } from "../App";
import { useFeedback } from "../components/ui/FeedbackModal";
import { useUI } from "../components/UIContext";
import type { Product, Currency } from "../types";
// Importar los DTOs de Intención (deben estar en types.ts)
import type { ProductCreate, ProductUpdate, ProductImage } from "../types";
import { getProductImages, addProductImage, deleteProductImage, setMainImage } from "../api";
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Lista de Productos
        </h2>
        <TouchButton
          onClick={handleNewProduct}
          data-testid="add-product-button"
          icon={Plus}
          variant="primary"
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
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        subtitle={editingProduct ? 'Modificar datos del producto' : 'Agrega un nuevo producto al catálogo'}
        icon={<Package className="w-6 h-6" />}
        size="lg"
      >
          <ProductForm
            key={editingProduct ? editingProduct.id : 'new'}
            product={editingProduct}
            onSave={async (data, file) => {
              try {
                await handleSaveProduct(data, file);
                showToast(editingProduct ? 'Producto actualizado' : 'Producto creado');
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Error al guardar';
                showToast(message, 'error');
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
     // ... (mismo handler)
      const confirmed = await confirm(`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`, 'Eliminar Producto');
    
    if (!confirmed) return;
    
    try {
      await api.deleteProduct(productId);
      showToast('Producto eliminado', 'success');
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      showToast('Error: ' + message, 'error');
    }
  };

  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500 flex flex-col items-center">
        <Loader2 className="animate-spin mb-2" size={32} />
        Cargando productos...
      </div>
    );

  if (products.length === 0) {
    return (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
          No hay productos registrados
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* VISTA DESKTOP (TABLA) - Hidden on Mobile */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Imagen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Precio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    {product.image_url ? (
                      <img
                        src={`${SERVER_URL}${product.image_url.replace('.jpg', '_thumb.jpg')}?t=${product.updated_at}`}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded border dark:border-gray-600"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center border dark:border-gray-600 text-gray-400">
                        <Image size={20} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800 dark:text-gray-100">{product.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{product.category || "Sin categoría"}</div>
                    <div className="flex gap-1 mt-1">
                        {product.is_featured && <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-[10px] rounded">Star</span>}
                        {product.is_discount && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-[10px] rounded">%</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{product.sku || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900 dark:text-white">{formatPrice(product.price)}</div>
                    {product.is_discount && (
                         <div className="text-xs text-red-500 dark:text-red-400 line-through opacity-75">
                             {formatPrice(product.price / ((100 - product.discount_percentage)/100))}
                         </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        product.stock > 10 ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" :
                        product.stock > 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" :
                        "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    }`}>
                        {product.stock} un.
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <TouchButton onClick={() => onEdit(product)} variant="ghost" icon={Edit2} iconOnly className="text-blue-600 dark:text-blue-400" />
                      <TouchButton onClick={() => handleDelete(product.id, product.name)} variant="ghost" icon={Trash2} iconOnly className="text-red-600 dark:text-red-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL (CARDS) - Premium Style with Hover/Shadows */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
            <div 
                key={product.id} 
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 relative animate-in fade-in zoom-in-95 duration-300 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
                {/* Imagen (Aspect Ratio Moderno) */}
                <div className="shrink-0 relative group cursor-pointer" onClick={() => onEdit(product)}>
                    {product.image_url ? (
                      <img
                        src={`${SERVER_URL}${product.image_url.replace('.jpg', '_thumb.jpg')}?t=${product.updated_at}`}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-xl shadow-sm"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500">
                        <Image size={24} />
                      </div>
                    )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white truncate pr-6 leading-tight">{product.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{product.sku}</p>
                    </div>
                    
                    <div className="flex justify-between items-end mt-3">
                        <div className="flex flex-col">
                             {product.is_discount && (
                                <span className="text-[10px] text-red-500 line-through">
                                    {formatPrice(product.price / ((100 - product.discount_percentage)/100))}
                                </span>
                             )}
                             <span className="font-bold text-blue-700 text-lg leading-none">{formatPrice(product.price)}</span>
                        </div>
                        
                        {/* FAB Actions (Edit/Delete) - Absolute or Inline? Inline is safer for touch targets */}
                        <div className="flex gap-2">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(product); }} 
                                className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 active:scale-95 transition"
                             >
                                <Edit2 size={16} />
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name); }} 
                                className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 active:scale-95 transition"
                             >
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </div>
                </div>

                {/* Badges Overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                    {product.stock <= 0 && <span className="px-2 py-0.5 bg-gray-800 text-white text-[10px] font-bold rounded shadow-lg uppercase tracking-wide">Agotado</span>}
                    {product.is_discount && <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded shadow-lg">-{product.discount_percentage}%</span>}
                </div>
            </div>
        ))}
      </div>

import { Pagination } from "../components/ui/Pagination";

// ... inside ProductList component render
      {/* PAGINACIÓN */}
      <Pagination
        currentPage={currentPage}
        hasMore={hasMore}
        onPageChange={handlePageChange}
        className="mt-6 pb-20 md:pb-8"
      />
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
  const { alert } = useUI();
  // Initialize state directly. The 'key' on the component instance handles resets.
  const [formData, setFormData] = useState<Partial<Product>>(product || {
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
  });
  
  const [displayPrice, setDisplayPrice] = useState("0");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [showImageModal, setShowImageModal] = useState(false);
  // State for tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'config'>('details');

  // Update display price when currency changes (or on mount)
  useEffect(() => {
    const basePrice = formData.price || 0;
    if (selectedCurrency && !selectedCurrency.is_base) {
      // eslint-disable-next-line
      setDisplayPrice((basePrice / selectedCurrency.exchange_rate).toFixed(2));
    } else {
      // eslint-disable-next-line
      setDisplayPrice(basePrice.toFixed(2));
    }
  }, [selectedCurrency, formData.price]); // Only depend on currency changes (formData.price updates usually sync displayPrice manually)

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
      <div className="flex border-b mb-6 overflow-x-auto">
         <button
           type="button"
           className={`px-4 py-2 font-medium shrink-0 ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
           onClick={() => setActiveTab('details')}
         >
           1. Detalles
         </button>
         <button
            type="button"
            className={`px-4 py-2 font-medium shrink-0 ${activeTab === 'images' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={async () => {
                if (!formData.id) {
                    await alert("Guarda el producto primero para gestionar imágenes");
                    return;
                }
                setActiveTab('images');
            }}
         >
           2. Imágenes
         </button>
         <button
            type="button"
            className={`px-4 py-2 font-medium shrink-0 ${activeTab === 'config' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('config')}
         >
           3. Configuración
         </button>
      </div>

      <div className={activeTab === 'details' ? 'block' : 'hidden'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Tag size={16} /> Información Básica
          </h3>
          <Input
            label="Nombre *"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ej. Paracetamol 500mg"
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
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2 mb-3">
                 <CreditCard size={16} /> Precios
              </h3>
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
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2 mb-3">
                 <Package size={16} /> Inventario
              </h3>
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
                    : `${SERVER_URL}${currentImageUrl}` // Remove Date.now() to avoid impurities
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
      <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t whitespace-pre-wrap">
        {/* Botones */}
        <div className="flex-1">
            <TouchButton
            type="submit"
            disabled={isSaving || !formData.name || !displayPrice}
            data-testid="product-form-save-button"
            variant="primary"
            icon={Save}
            loading={isSaving}
            >
            {isSaving
                ? "Guardando..."
                : formData.id
                ? "Guardar Cambios"
                : "Crear Producto"}
            </TouchButton>
        </div>
        <TouchButton type="button" onClick={onCancel} variant="secondary">
          Cancelar
        </TouchButton>
      </div>
      )}
    </form>
  );
}

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
    if (!await confirm("¿Eliminar esta imagen?")) return;
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

  if (loading && images.length === 0) return <div className="p-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Cargando imágenes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Galería de Imágenes ({images.length}/5)</h3>
        {images.length < 5 && (
            <TouchButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="primary"
              icon={Upload}
              className="text-sm px-3 py-1 mb-0"
            >
              Subir Imagen
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