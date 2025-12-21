/**
 * src/api.ts
 * "El Motor de Red"
 * REFACTORIZADO:
 * 1. Importa 'zod' y todos los esquemas de 'schemas.ts'.
 * 2. 'authFetch' y 'authFetchForm' ahora aceptan un 'schema' de Zod.
 * 3. CADA respuesta JSON del backend es validada (parseada) por Zod
 * antes de ser devuelta. Si la validación falla (el "contrato"
 * está roto), se lanza un error.
 * 4. Usa variables de entorno a través de config.ts
 */
import { z, ZodType } from 'zod';
import type { 
  Product, ProductCard, ProductCreate, ProductUpdate,
  Currency, Region, TaxRate, RegionUpdate, TaxRateUpdate,
  Cart, PaymentDetails, DailyReport, Sale,
  BusinessInfo, BusinessInfoUpdate, Customization,
  User, TokenResponse, 
  UserCreateRequest, UserUpdateRequest, 
  PasswordChangeRequest, PasswordResetRequest, PasswordResetValidate
} from './types';

// Importar los esquemas (la nueva "fuente de verdad")
import {
  ProductSchema, ProductCardSchema, ProductCreateSchema, ProductUpdateSchema,
  CurrencySchema, RegionSchema, TaxRateSchema, RegionUpdateSchema, TaxRateUpdateSchema,
  CartItemSchema, CartSchema, PaymentDetailsSchema, SaleSchema, DailyReportSchema,
  BusinessInfoSchema, BusinessInfoUpdateSchema, CustomizationSchema,
  UserPublicSchema, TokenResponseSchema,
  UserCreateRequestSchema, UserUpdateRequestSchema,
  PasswordChangeRequestSchema, PasswordResetRequestSchema, PasswordResetValidateSchema,
  MessageResponseSchema // Un esquema genérico para { message: "..." }
} from './schemas';

// Importar configuración centralizada
import { config } from './config';

// URL base del API desde configuración (variable de entorno VITE_API_URL)
const API_URL = config.apiUrl;

// --- Wrapper de Fetch (Manejo de Errores y Token) ---

const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Wrapper de 'fetch' para peticiones JSON autenticadas.
 * REFACTORIZADO: Acepta un 'schema' de Zod para validar la respuesta.
 */
const authFetch = async <T>(
  endpoint: string, 
  options: RequestInit = {},
  schema: ZodType<T> // Argumento de esquema Zod
): Promise<T> => {
  const token = getAuthToken();
  
  // Build headers safely
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Copy existing headers if present
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.keys(existingHeaders).forEach(key => {
      headers[key] = existingHeaders[key];
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "Error desconocido.";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || JSON.stringify(errorJson);
    } catch (e) {
      errorDetail = response.statusText;
    }
    throw new Error(`Error ${response.status}: ${errorDetail}`);
  }

  if (response.status === 204) {
    return true as T; 
  }

  const data = await response.json();
  (window as any).lastApiData = data; // DEBUG: Make last API response available globally

  try {
    // Intenta parsear los datos con el esquema.
    // Si falla, lanza un error que será capturado abajo.
    return schema.parse(data);
  } catch (validationError: any) {
    // El "contrato" está roto. El backend envió datos inesperados.
    console.error(`Error de Validación Zod para ${endpoint}:`, validationError);
    throw new Error(`Error de Contrato: Datos inválidos recibidos del servidor.`);
  }
};

/**
 * Wrapper de 'fetch' para subida de archivos (FormData)
 * REFACTORIZADO: Acepta un 'schema' de Zod.
 */
const authFetchForm = async <T>(
  endpoint: string, 
  formData: FormData,
  schema: ZodType<T> // Argumento de esquema Zod
): Promise<T> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers, 
  });

  if (!response.ok) {
    const errorJson = await response.json();
    throw new Error(errorJson.detail || 'Error al subir el archivo');
  }
  
  const data = await response.json();

  try {
    return schema.parse(data);
  } catch (validationError: any) {
    console.error(`Error de Validación Zod para ${endpoint} (Form):`, validationError);
    throw new Error(`Error de Contrato: Datos inválidos recibidos del servidor.`);
  }
};

// ==================== API de Autenticación (Pública) ====================

export const apiLogin = (username: string, password: string): Promise<TokenResponse> => {
  return authFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, TokenResponseSchema); // <-- Validar
};

export const requestPasswordReset = (email: string, captcha_token: string): Promise<{ message: string }> => {
  const request: PasswordResetRequest = { email, captcha_token };
  return authFetch('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify(request),
  }, MessageResponseSchema); // <-- Validar
};

export const validatePasswordReset = (email: string, token: string, new_password: string): Promise<{ message: string }> => {
  const request: PasswordResetValidate = { email, token, new_password };
  return authFetch('/auth/validate-password-reset', {
    method: 'POST',
    body: JSON.stringify(request),
  }, MessageResponseSchema); // <-- Validar
};

// ==================== API de Autenticación (Protegida) ====================

export const apiLogout = (): Promise<void> => {
  return authFetch<void>('/auth/logout', { method: 'POST' }, z.any()); // z.any() para respuestas vacías/simples
};

export const getMe = (): Promise<User> => {
  return authFetch<User>('/auth/me', { method: 'GET' }, UserPublicSchema); // <-- Validar
};

export const updateMe = (updates: UserUpdateRequest): Promise<User> => {
  return authFetch<User>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, UserPublicSchema); // <-- Validar
};

export const changeMyPassword = (request: PasswordChangeRequest): Promise<{ message: string }> => {
  return authFetch('/auth/me/password', {
    method: 'POST',
    body: JSON.stringify(request),
  }, MessageResponseSchema); // <-- Validar
};

// ==================== API de Admin: Usuarios (RBAC) ====================

export const getAllUsers = (): Promise<User[]> => {
  return authFetch<User[]>('/admin/users', { method: 'GET' }, z.array(UserPublicSchema)); // <-- Validar
};

export const createNewUser = (data: UserCreateRequest): Promise<User> => {
  return authFetch<User>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }, UserPublicSchema); // <-- Validar
};

export const updateUser = (userId: string, updates: UserUpdateRequest): Promise<User> => {
  return authFetch<User>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, UserPublicSchema); // <-- Validar
};

export const adminResetPassword = (userId: string, new_password: string): Promise<{ message: string }> => {
  return authFetch('/admin/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, new_password }),
  }, MessageResponseSchema); // <-- Validar
};

// ==================== API Pública (Productos, Tienda) ====================

export const getAllProducts = (): Promise<Product[]> => {
  return authFetch<Product[]>('/products/', { method: 'GET' }, z.array(ProductSchema)); // <-- Validar
};

export const searchProducts = (query: string): Promise<Product[]> => {
  return authFetch<Product[]>(`/products/search?q=${encodeURIComponent(query)}`, { method: 'GET' }, z.array(ProductSchema)); // <-- Validar
};

export const getSliderProducts = (type: 'main' | 'featured' | 'discount'): Promise<ProductCard[]> => {
  return authFetch<ProductCard[]>(`/products/slider/${type}`, { method: 'GET' }, z.array(ProductCardSchema)); // <-- Validar
};

export const getBusinessInfo = (): Promise<BusinessInfo> => {
  // Endpoint público, no necesita token
  return authFetch<BusinessInfo>('/business/info', { method: 'GET' }, BusinessInfoSchema);
};

export const updateBusinessInfo = (updates: BusinessInfoUpdate): Promise<BusinessInfo> => {
  // Endpoint de admin, necesita token
  return authFetch<BusinessInfo>('/admin/business/info', {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, BusinessInfoSchema);
};

export const getCustomization = (): Promise<Customization> => {
  return authFetch<Customization>('/admin/customization/', { method: 'GET' }, CustomizationSchema);
};

// ==================== API de Admin: Productos ====================

export const createProduct = (data: ProductCreate): Promise<Product> => {
  return authFetch<Product>('/products/', {
    method: 'POST',
    body: JSON.stringify(data),
  }, ProductSchema); // <-- Validar
};

export const updateProduct = (productId: string, updates: ProductUpdate): Promise<Product> => {
  return authFetch<Product>(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, ProductSchema); // <-- Validar
};

export const deleteProduct = (productId: string): Promise<{ message: string }> => {
  return authFetch(`/products/${productId}`, { method: 'DELETE' }, MessageResponseSchema); // <-- Validar
};

/**
 * Crear producto con imagen en una sola llamada.
 * Usa multipart/form-data para enviar datos + archivo.
 */
export const createProductWithImage = async (
  data: ProductCreate,
  file?: File
): Promise<Product> => {
  const formData = new FormData();
  
  // Añadir campos del producto
  formData.append('name', data.name);
  formData.append('price', String(data.price));
  formData.append('description', data.description || '');
  formData.append('sku', data.sku || '');
  formData.append('stock', String(data.stock || 0));
  formData.append('category', data.category || '');
  formData.append('is_featured', String(data.is_featured || false));
  formData.append('is_discount', String(data.is_discount || false));
  formData.append('discount_percentage', String(data.discount_percentage || 0));
  formData.append('banner_assignment', data.banner_assignment || 'main');
  
  // Añadir archivo si existe
  if (file) {
    formData.append('file', file);
  }
  
  return authFetchForm<Product>('/products/with-image', formData, ProductSchema);
};

// ==================== API de Admin: Imágenes (Orquestador) ====================

export const uploadProductImage = (productId: string, file: File): Promise<Product> => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<Product>(`/admin/images/products/${productId}/upload`, formData, ProductSchema); // <-- Validar
};

export const uploadBusinessLogo = (file: File): Promise<BusinessInfo> => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<BusinessInfo>('/admin/images/business/logo', formData, BusinessInfoSchema); // <-- Validar
};

export const uploadBusinessIcon = (file: File): Promise<BusinessInfo> => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<BusinessInfo>('/admin/images/business/icon', formData, BusinessInfoSchema); // <-- Validar
};

export const uploadBusinessBanner = (file: File): Promise<BusinessInfo> => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<BusinessInfo>('/admin/images/business/banner', formData, BusinessInfoSchema); // <-- Validar
};

export const uploadModuleIcon = (moduleName: string, file: File): Promise<Customization> => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<Customization>(`/admin/customization/icon/${moduleName}`, formData, CustomizationSchema); // <-- Validar
};

export const uploadSocialNetworkIcon = (networkIndex: number, file: File): Promise<BusinessInfo> => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<BusinessInfo>(`/admin/business/social-icon/${networkIndex}`, formData, BusinessInfoSchema);
};

// ==================== API de Admin: Contenido y Tema ====================

export const updateCustomization = (updates: Partial<Customization>): Promise<Customization> => {
  return authFetch<Customization>('/admin/customization/', {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, CustomizationSchema); // <-- Validar
};

// ==================== API de Admin: Finanzas ====================

export const getCurrencies = (active_only: boolean = true): Promise<Currency[]> => {
  return authFetch<Currency[]>(`/finance/currencies?active_only=${active_only}`, { method: 'GET' }, z.array(CurrencySchema)); // <-- Validar
};

export const createCurrency = (data: { name: string, symbol: string, is_base: boolean, exchange_rate: number }): Promise<Currency> => {
  const params = new URLSearchParams();
  params.append('name', data.name);
  params.append('symbol', data.symbol);
  params.append('is_base', String(data.is_base));
  params.append('exchange_rate', String(data.exchange_rate));
  return authFetch<Currency>(`/finance/currencies?${params.toString()}`, { method: 'POST' }, CurrencySchema); // <-- Validar
};

export const updateCurrencyRate = (id: string, new_rate: number): Promise<Currency> => {
  return authFetch<Currency>(`/finance/currencies/${id}/rate?new_rate=${new_rate}`, { method: 'PUT' }, CurrencySchema); // <-- Validar
};

export const setBaseCurrency = (id: string): Promise<{ message: string }> => {
  return authFetch(`/finance/currencies/${id}/set-base`, { method: 'PUT' }, MessageResponseSchema); // <-- Validar
};

export const deleteCurrency = (id: string): Promise<{ message: string }> => {
  return authFetch(`/finance/currencies/${id}`, { method: 'DELETE' }, MessageResponseSchema); // <-- Validar
};

// ==================== API de Admin: Impuestos (Regional) ====================

export const getRegions = (active_only: boolean = true): Promise<Region[]> => {
  return authFetch<Region[]>(`/admin/tax/regions?active_only=${active_only}`, { method: 'GET' }, z.array(RegionSchema)); // <-- Validar
};

export const createRegion = (data: Partial<Region>): Promise<Region> => {
  const params = new URLSearchParams();
  params.append('name', data.name!);
  if (data.country) params.append('country', data.country);
  if (data.state) params.append('state', data.state);
  return authFetch<Region>(`/admin/tax/regions?${params.toString()}`, { method: 'POST' }, RegionSchema); // <-- Validar
};

export const updateRegion = (id: string, updates: RegionUpdate): Promise<Region> => {
    return authFetch<Region>(`/admin/tax/regions/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(updates) 
  }, RegionSchema); // <-- Validar
};

export const getTaxRatesForRegion = (regionId: string): Promise<TaxRate[]> => {
  return authFetch<TaxRate[]>(`/admin/tax/regions/${regionId}/tax-rates`, { method: 'GET' }, z.array(TaxRateSchema)); // <-- Validar
};

export const createTaxRate = (data: { name: string, region_id: string, rate: number, priority: number }): Promise<TaxRate> => {
  const params = new URLSearchParams();
  params.append('name', data.name);
  params.append('region_id', data.region_id);
  params.append('rate', String(data.rate));
  params.append('priority', String(data.priority));
  return authFetch<TaxRate>(`/admin/tax/tax-rates?${params.toString()}`, { method: 'POST' }, TaxRateSchema); // <-- Validar
};

// ==================== API de Carrito y Ventas (POS) ====================

export const getCart = (cartId: string): Promise<Cart> => {
  return authFetch<Cart>(`/cart/${cartId}`, { method: 'GET' }, CartSchema);
};

/**
 * HOMOLOGACIÓN: Crear carrito para usuario invitado.
 * Usa el nuevo endpoint /cart/guest que genera automáticamente el ID del invitado.
 */
export const createGuestCart = (region_id: string, currency_id: string): Promise<Cart> => {
  const params = new URLSearchParams();
  params.append('region_id', region_id);
  params.append('currency_id', currency_id);
  return authFetch<Cart>(`/cart/guest?${params.toString()}`, { method: 'POST' }, CartSchema);
};

export const createCart = (customer_name: string, customer_id: string, region_id: string, currency_id: string): Promise<Cart> => {
  const params = new URLSearchParams();
  params.append('customer_name', customer_name);
  params.append('customer_id', customer_id);
  params.append('region_id', region_id);
  params.append('currency_id', currency_id);
  return authFetch<Cart>(`/cart/?${params.toString()}`, { method: 'POST' }, CartSchema);
};

export const addItem = (cartId: string, productId: string, quantity: number): Promise<Cart> => {
  return authFetch<Cart>(`/cart/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  }, CartSchema); // <-- Validar
};

export const removeItem = (cartId: string, productId: string): Promise<Cart> => {
  return authFetch<Cart>(`/cart/${cartId}/items/${productId}`, {
    method: 'DELETE',
  }, CartSchema);
};

export const updateItemQuantity = (cartId: string, productId: string, quantity: number): Promise<Cart> => {
  return authFetch<Cart>(`/cart/${cartId}/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  }, CartSchema);
};

export const completeSale = (cartId: string, paymentDetails: PaymentDetails): Promise<Sale> => {
  return authFetch<Sale>(`/admin/sales/${cartId}/complete`, {
    method: 'POST',
    body: JSON.stringify(paymentDetails),
  }, SaleSchema); // <-- Validar
};

export const cancelSale = (cartId: string): Promise<{ message: string }> => {
  return authFetch(`/admin/sales/${cartId}/cancel`, { method: 'POST' }, MessageResponseSchema); // <-- Validar
};

export const getDailySales = (): Promise<DailyReport> => {
  return authFetch<DailyReport>('/admin/sales/daily', { method: 'GET' }, DailyReportSchema); // <-- Validar
};

export const closeDay = (): Promise<DailyReport> => {
  return authFetch<DailyReport>('/admin/sales/close-day', { method: 'POST' }, DailyReportSchema);
};

export const getPendingCarts = (): Promise<Cart[]> => {
  return authFetch<Cart[]>('/cart/', { method: 'GET' }, z.array(CartSchema));
};

// ==================== HOMOLOGACIÓN: Funciones faltantes ====================

/** Obtener un producto por ID */
export const getProductById = (productId: string): Promise<Product> => {
  return authFetch<Product>(`/products/${productId}`, { method: 'GET' }, ProductSchema);
};

/** Obtener la moneda base del sistema */
export const getBaseCurrency = (): Promise<Currency> => {
  return authFetch<Currency>('/finance/currencies/base', { method: 'GET' }, CurrencySchema);
};

/** Eliminar una región fiscal */
export const deleteRegion = (regionId: string): Promise<{ message: string }> => {
  return authFetch(`/admin/tax/regions/${regionId}`, { method: 'DELETE' }, MessageResponseSchema);
};

/** Actualizar una tasa de impuesto existente */
export const updateTaxRate = (taxRateId: string, updates: Partial<TaxRate>): Promise<TaxRate> => {
  return authFetch<TaxRate>(`/admin/tax/tax-rates/${taxRateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, TaxRateSchema);
};

/** Eliminar una tasa de impuesto */
export const deleteTaxRate = (taxRateId: string): Promise<{ message: string }> => {
  return authFetch(`/admin/tax/tax-rates/${taxRateId}`, { method: 'DELETE' }, MessageResponseSchema);
};

/** Obtener el código QR de un carrito */
export const getCartQR = (cartId: string): Promise<{ qr_code: string }> => {
  return authFetch<{ qr_code: string }>(`/cart/${cartId}/qr`, { method: 'GET' }, z.object({ qr_code: z.string() }));
};

/** Eliminar la imagen de un producto */
export const deleteProductImage = (productId: string): Promise<Product> => {
  return authFetch<Product>(`/admin/images/products/${productId}/image`, { method: 'DELETE' }, ProductSchema);
};