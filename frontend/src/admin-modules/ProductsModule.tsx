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
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Upload, X, Save, Plus, Trash2, Image, Edit2 } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import type { Product, Currency } from '../../types'; // <-- REFACTOR FASE 3: Importar Currency
// Importar los DTOs de Intención (deben estar en types.ts)
import type { ProductCreate, ProductUpdate } from '../../types'; 

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = '';

// --- Componente Principal del Módulo ---
export default function ProductsModule() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar recarga de lista
  const [isSaving, setIsSaving] = useState(false);
  
  // REFACTOR FASE 3: Consumir la moneda seleccionada
  const { selectedCurrency } = useApp();
  
  const handleSaveProduct = async (formData: Partial<Product>) => {
    setIsSaving(true);
    try {
      const isNew = !formData.id;
      
      // 1. Usar los DTOs de Intención (ProductCreate / ProductUpdate)
      // (formData.price ya está en la MONEDA BASE gracias a la
      // lógica del formulario 'currency-aware')
      const payload: ProductCreate | ProductUpdate = {
        name: formData.name!,
        description: formData.description || "",
        sku: formData.sku || "",
        price: formData.price || 0,
        stock: formData.stock || 0,
        category: formData.category || "",
        image_url: formData.image_url || null,
        is_featured: formData.is_featured || false,
        is_discount: formData.is_discount || false,
        discount_percentage: formData.discount_percentage || 0,
        banner_assignment: formData.banner_assignment || "main",
      };
      
      let savedProduct: Product;
      if (isNew) {
        // (A) Endpoint de Creación (solo datos)
        savedProduct = await api.createProduct(payload as ProductCreate);
      } else {
        // (B) Endpoint de Actualización (solo datos)
        savedProduct = await api.updateProduct(formData.id!, payload as ProductUpdate);
      }
      
      if (savedProduct.id) {
        alert(isNew ? '✓ Producto creado' : '✓ Producto actualizado');
        // REFACTOR (Flujo de Imagen):
        // Mantenemos al usuario en el formulario (en modo edición)
        // para que ahora pueda subir la imagen.
        setEditingProduct(savedProduct);
        setShowForm(true); 
        setRefreshKey(k => k + 1); // Refrescar lista en segundo plano
      }
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };
  
  const handleNewProduct = () => {
    setEditingProduct(null); // Limpiar
    setShowForm(true); // Mostrar formulario vacío
  };
  
  return (
    <>
      {showForm ? (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          isSaving={isSaving}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          // REFACTOR FASE 3: Pasar la moneda al formulario
          selectedCurrency={selectedCurrency}
        />
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Lista de Productos</h2>
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
            refreshKey={refreshKey} // Usar la key para forzar recarga
          />
        </>
      )}
    </>
  );
}

// ============================================================================
// COMPONENTES INTERNOS DEL MÓDULO DE PRODUCTOS
// ============================================================================

// --- Componente: Lista de Productos ---
function ProductList({ onEdit, refreshKey }: { onEdit: (product: Product) => void, refreshKey: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // REFACTOR FASE 3: Consumir el formateador de precios
  const { formatPrice } = useApp();
  
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getAllProducts(); // Llama a GET /api/products/
      setProducts(data);
    } catch (error) { console.error('Error loading products:', error); }
    setLoading(false);
  };
  
  // Recargar cuando 'refreshKey' cambie
  useEffect(() => { loadProducts(); }, [refreshKey]);
  
  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteProduct(productId);
      alert('✓ Producto eliminado');
      loadProducts(); // Recargar lista
    } catch (error: any) { alert("Error: " + error.message); }
  };
  
  if (loading) return <div className="text-center py-8 text-gray-500">Cargando productos...</div>;
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Imagen</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Precio (Moneda Base)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50" data-testid={`product-row-${product.id}`}>
                <td className="px-4 py-3">
                  {product.image_url ? (
                    <img src={`${SERVER_URL}${product.image_url}?t=${product.updated_at}`} alt={product.name} className="w-16 h-16 object-cover rounded image-preview" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <Image size={24} className="text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.category || 'Sin categoría'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{product.sku || '-'}</td>
                <td className="px-4 py-3">
                  {/* REFACTOR FASE 3: Usar el formateador de precios */}
                  <div className="font-semibold text-blue-600">{formatPrice(product.price)}</div>
                  {product.is_discount && (
                    <div className="text-xs text-red-600">
                      Desc: {formatPrice(product.final_price)} (-{product.discount_percentage}%)
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${product.stock > 10 ? 'text-green-600' : (product.stock > 0 ? 'text-yellow-600' : 'text-red-600')}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {product.is_featured && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full text-center">Destacado</span>}
                    {product.is_discount && <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full text-center">Descuento</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition" title="Editar">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(product.id, product.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && !loading && <div className="text-center py-12 text-gray-500">No hay productos registrados</div>}
    </div>
  );
}


// --- Componente: Formulario de Producto ---
function ProductForm({ product, onSave, onCancel, isSaving, selectedCurrency }: { 
  product: Product | null, 
  onSave: (data: Partial<Product>) => void, 
  onCancel: () => void, 
  isSaving: boolean,
  selectedCurrency: Currency | null
}) {
  const [formData, setFormData] = useState<Partial<Product>>(product || {});
  const [displayPrice, setDisplayPrice] = useState("0");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const basePrice = product?.price || 0;
    setFormData(product || { name: '', description: '', sku: '', price: 0, stock: 0, category: '', is_featured: false, is_discount: false, discount_percentage: 0, image_url: '' });
    
    if (selectedCurrency && !selectedCurrency.is_base) {
      setDisplayPrice((basePrice / selectedCurrency.exchange_rate).toFixed(2));
    } else {
      setDisplayPrice(basePrice.toFixed(2));
    }
  }, [product, selectedCurrency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayPrice = e.target.value;
    setDisplayPrice(newDisplayPrice);
    
    const priceNum = parseFloat(newDisplayPrice) || 0;
    let newBasePrice = priceNum;
    
    if (selectedCurrency && !selectedCurrency.is_base) {
      newBasePrice = priceNum * selectedCurrency.exchange_rate;
    }
    
    setFormData({...formData, price: newBasePrice });
  };

  const handleImageUpload = async (file: File) => {
    if (!formData.id) return;
    setIsUploading(true);
    try {
      const updatedProduct = await api.uploadProductImage(formData.id, file);
      setFormData(prev => ({ ...prev, image_url: updatedProduct.image_url }));
      alert('✓ Imagen subida exitosamente');
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto mb-8" data-testid="product-form">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos */}
        <div className="md:col-span-2 space-y-4">
          <Input label="Nombre *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <TextArea label="Descripción" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
          <Input label="SKU" value={formData.sku || ''} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={`Precio (${selectedCurrency?.symbol || '...'}) *`}
              type="number" 
              step="0.01" 
              min="0" 
              value={displayPrice}
              onChange={handlePriceChange}
              required 
              data-testid="product-price-input"
            />
            <Input label="Stock" type="number" min="0" value={formData.stock || 0} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
          </div>
          <Input label="Categoría" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})} />
          <div className="flex gap-6">
            <Checkbox label="Producto Destacado" checked={formData.is_featured || false} onChange={(e) => setFormData({...formData, is_featured: e.target.checked})} />
            <Checkbox label="En Descuento" checked={formData.is_discount || false} onChange={(e) => setFormData({...formData, is_discount: e.target.checked})} />
          </div>
          {formData.is_discount && (
            <Input label="% Descuento" type="number" min="0" max="100" value={formData.discount_percentage || 0} onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})} />
          )}
        </div>
        
        {/* Columna Derecha: Imagen */}
        <div>
          {formData.id ? (
            <ImageUploader
              label="Imagen del Producto"
              currentImageUrl={formData.image_url}
              onFileSelect={handleImageUpload}
              isUploading={isUploading}
            />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Image size={48} className="mx-auto mb-2" />
                <p className="text-sm font-semibold">Guarde el producto primero</p>
                <p className="text-xs">para poder subir una imagen</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Botones */}
      <div className="flex gap-3 mt-6 pt-6 border-t">
        <button type="submit" disabled={isSaving || isUploading || !formData.name || !displayPrice} data-testid="product-form-save-button" className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2">
          <Save size={20} />
          {isSaving ? 'Guardando...' : (formData.id ? 'Guardar Cambios' : 'Crear Producto')}
        </button>
        <button type="button" onClick={onCancel} disabled={isSaving || isUploading} className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// --- Componente: Subidor de Imágenes de Producto (Simplificado) ---
function ImageUploader({ label, currentImageUrl, onFileSelect, isUploading }: { 
  label: string, 
  currentImageUrl?: string | null, 
  onFileSelect: (file: File) => void,
  isUploading: boolean
}) {
  const [preview, setPreview] = useState(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => { setPreview(currentImageUrl); }, [currentImageUrl]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Por favor selecciona una imagen válida'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen es muy grande. Máximo 5MB.'); return; }
    
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    
    onFileSelect(file);
  };
  
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
        {preview ? (
          <div className="relative group">
            <img src={preview.startsWith('data:') ? preview : `${SERVER_URL}${preview}?t=${new Date().getTime()}`} alt="Preview" className="w-full h-48 object-contain rounded-lg bg-gray-50 image-preview" />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="opacity-0 group-hover:opacity-100 transition bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                {isUploading ? 'Subiendo...' : 'Cambiar Imagen'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full h-48 flex flex-col items-center justify-center bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <Upload size={48} className="text-gray-400 mb-2" />
            <span className="text-gray-600 font-medium">{isUploading ? 'Subiendo...' : 'Click para subir imagen'}</span>
            <span className="text-xs text-gray-500 mt-1">JPG, PNG, GIF (máx. 5MB)</span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- Componentes genéricos de formulario (reutilizados) ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
const Input = ({ label, ...props }: InputProps) => (
  <div>
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <input {...props} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; }
const TextArea = ({ label, ...props }: TextAreaProps) => (
  <div>
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <textarea {...props} className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${props.className || ''}`} />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; children: React.ReactNode; }
const Select = ({ label, children, ...props }: SelectProps) => (
  <div>
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <select {...props} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
      {children}
    </select>
  </div>
);

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
const Checkbox = ({ label, ...props }: CheckboxProps) => (
  <label className="flex items-center">
    <input type="checkbox" {...props} className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </label>
);