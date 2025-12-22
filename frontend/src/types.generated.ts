/**
 * types.generated.ts
 * Generado automáticamente desde OpenAPI - 2025-12-21T17:05:09.419760
 * NO EDITAR MANUALMENTE - Usar: python -m scripts.regenerate
 */

import { z } from 'zod';

// ========== HTTP Status Codes ==========

export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_NOCONTENT = 204;
export const HTTP_BADREQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOTFOUND = 404;
export const HTTP_VALIDATIONERROR = 422;
export const HTTP_INTERNALSERVERERROR = 500;

// ========== API Schemas ==========

// Schema: AddItemRequest
export const AddItemRequestSchema = z.object({
  product_id: z.string(),
  quantity: z.number().int()
});
export type AddItemRequest = z.infer<typeof AddItemRequestSchema>;

// Schema: AdminPasswordResetRequest
export const AdminPasswordResetRequestSchema = z.object({
  user_id: z.string(),
  new_password: z.string()
});
export type AdminPasswordResetRequest = z.infer<typeof AdminPasswordResetRequestSchema>;

// Schema: BusinessInfoUpdate
export const BusinessInfoUpdateSchema = z.object({
  name: z.string().nullable().optional(),
  rif: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  social_networks: z.array(z.object({}).passthrough()).nullable().optional(),
  logo_url: z.string().nullable().optional(),
  icon_url: z.string().nullable().optional(),
  banner_url: z.string().nullable().optional()
});
export type BusinessInfoUpdate = z.infer<typeof BusinessInfoUpdateSchema>;

// Schema: CartItem
export const CartItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number().int(),
  price: z.union([z.string(), z.number()]),
  subtotal: z.union([z.string(), z.number()])
});
export type CartItem = z.infer<typeof CartItemSchema>;

// Schema: Currency
export const CurrencySchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  name: z.string(),
  symbol: z.string(),
  is_base: z.boolean().optional(),
  exchange_rate: z.union([z.string(), z.number()]).optional(),
  base_currency_id: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});
export type Currency = z.infer<typeof CurrencySchema>;

// Schema: Customization
export const CustomizationSchema = z.object({
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  font_family: z.string().optional(),
  custom_css: z.string().nullable().optional(),
  updated_at: z.string().datetime().optional(),
  icon_products_url: z.string().nullable().optional(),
  icon_business_url: z.string().nullable().optional(),
  icon_customization_url: z.string().nullable().optional(),
  icon_finance_url: z.string().nullable().optional(),
  icon_sales_url: z.string().nullable().optional(),
  icon_users_url: z.string().nullable().optional(),
  icon_tax_url: z.string().nullable().optional()
});
export type Customization = z.infer<typeof CustomizationSchema>;

// Schema: CustomizationUpdate
export const CustomizationUpdateSchema = z.object({
  primary_color: z.string().nullable().optional(),
  secondary_color: z.string().nullable().optional(),
  accent_color: z.string().nullable().optional(),
  font_family: z.string().nullable().optional(),
  custom_css: z.string().nullable().optional(),
  icon_products_url: z.string().nullable().optional(),
  icon_business_url: z.string().nullable().optional(),
  icon_customization_url: z.string().nullable().optional(),
  icon_finance_url: z.string().nullable().optional(),
  icon_sales_url: z.string().nullable().optional(),
  icon_users_url: z.string().nullable().optional(),
  icon_tax_url: z.string().nullable().optional()
});
export type CustomizationUpdate = z.infer<typeof CustomizationUpdateSchema>;

// Schema: LogEntry
export const LogEntrySchema = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.string().nullable().optional(),
  stack: z.string().nullable().optional(),
  url: z.string().nullable().optional()
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

// Schema: LoginRequest
export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string()
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Schema: PasswordChangeRequest
export const PasswordChangeRequestSchema = z.object({
  old_password: z.string(),
  new_password: z.string()
});
export type PasswordChangeRequest = z.infer<typeof PasswordChangeRequestSchema>;

// Schema: PasswordResetRequest
export const PasswordResetRequestSchema = z.object({
  email: z.string(),
  captcha_token: z.string()
});
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

// Schema: PasswordResetValidate
export const PasswordResetValidateSchema = z.object({
  email: z.string(),
  token: z.string(),
  new_password: z.string()
});
export type PasswordResetValidate = z.infer<typeof PasswordResetValidateSchema>;

// Schema: PaymentDetails
export const PaymentDetailsSchema = z.object({
  payment_method: z.string(),
  payment_type: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional()
});
export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;

// Schema: Product
export const ProductSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]),
  stock: z.number().int().optional(),
  category: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  is_discount: z.boolean().optional(),
  discount_percentage: z.union([z.string(), z.number()]).optional(),
  banner_assignment: z.string().optional(),
  final_price: z.union([z.string(), z.number()])
});
export type Product = z.infer<typeof ProductSchema>;

// Schema: ProductCard
export const ProductCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()]),
  final_price: z.union([z.string(), z.number()]),
  image_url: z.string().nullable(),
  is_featured: z.boolean(),
  is_discount: z.boolean(),
  discount_percentage: z.union([z.string(), z.number()])
});
export type ProductCard = z.infer<typeof ProductCardSchema>;

// Schema: ProductCreate
export const ProductCreateSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]),
  stock: z.number().int().optional(),
  category: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  is_discount: z.boolean().optional(),
  discount_percentage: z.union([z.string(), z.number()]).optional(),
  banner_assignment: z.string().optional()
});
export type ProductCreate = z.infer<typeof ProductCreateSchema>;

// Schema: ProductUpdate
export const ProductUpdateSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  stock: z.number().int().nullable().optional(),
  category: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_featured: z.boolean().nullable().optional(),
  is_discount: z.boolean().nullable().optional(),
  discount_percentage: z.union([z.string(), z.number()]).optional(),
  banner_assignment: z.string().nullable().optional()
});
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

// Schema: Region
export const RegionSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  name: z.string(),
  country: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});
export type Region = z.infer<typeof RegionSchema>;

// Schema: RegionUpdate
export const RegionUpdateSchema = z.object({
  name: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional()
});
export type RegionUpdate = z.infer<typeof RegionUpdateSchema>;

// Schema: Sale
export const SaleSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  cart_id: z.string(),
  customer_name: z.string(),
  customer_id: z.string(),
  items: z.array(CartItemSchema),
  currency_id: z.string(),
  payment_details: PaymentDetailsSchema,
  status: z.string().optional(),
  completed_by: z.string().nullable().optional(),
  completed_at: z.string().datetime().optional(),
  region_id: z.string().nullable().optional(),
  subtotal: z.union([z.string(), z.number()]),
  tax_amount: z.union([z.string(), z.number()]),
  total_with_tax: z.union([z.string(), z.number()])
});
export type Sale = z.infer<typeof SaleSchema>;

// Schema: SocialNetwork
export const SocialNetworkSchema = z.object({
  name: z.string(),
  url: z.string(),
  icon: z.string().nullable().optional()
});
export type SocialNetwork = z.infer<typeof SocialNetworkSchema>;

// Schema: TaxRate
export const TaxRateSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  name: z.string(),
  region_id: z.string(),
  rate: z.union([z.string(), z.number()]),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional()
});
export type TaxRate = z.infer<typeof TaxRateSchema>;

// Schema: TaxRateUpdate
export const TaxRateUpdateSchema = z.object({
  name: z.string().nullable().optional(),
  rate: z.union([z.string(), z.number()]).optional(),
  priority: z.number().int().nullable().optional(),
  is_active: z.boolean().nullable().optional()
});
export type TaxRateUpdate = z.infer<typeof TaxRateUpdateSchema>;

// Schema: UpdateQuantityRequest
export const UpdateQuantityRequestSchema = z.object({
  quantity: z.number().int()
});
export type UpdateQuantityRequest = z.infer<typeof UpdateQuantityRequestSchema>;

// Schema: User
export const UserSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  username: z.string(),
  password_hash: z.string(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});
export type User = z.infer<typeof UserSchema>;

// Schema: UserCreateRequest
export const UserCreateRequestSchema = z.object({
  username: z.string(),
  plain_password: z.string(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});
export type UserCreateRequest = z.infer<typeof UserCreateRequestSchema>;

// Schema: UserPublic
export const UserPublicSchema = z.object({
  id: z.string(),
  username: z.string(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  is_active: z.boolean()
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

// Schema: UserUpdateRequest
export const UserUpdateRequestSchema = z.object({
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  roles: z.array(z.string()).nullable().optional(),
  is_active: z.boolean().nullable().optional()
});
export type UserUpdateRequest = z.infer<typeof UserUpdateRequestSchema>;

// Schema: BusinessInfo
export const BusinessInfoSchema = z.object({
  name: z.string().optional(),
  rif: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  social_networks: z.array(SocialNetworkSchema).optional(),
  logo_url: z.string().nullable().optional(),
  icon_url: z.string().nullable().optional(),
  banner_url: z.string().nullable().optional(),
  updated_at: z.string().datetime().optional()
});
export type BusinessInfo = z.infer<typeof BusinessInfoSchema>;

// Schema: Cart
export const CartSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  customer_name: z.string(),
  customer_id: z.string(),
  items: z.array(CartItemSchema).optional(),
  status: z.string().optional(),
  currency_id: z.string(),
  region_id: z.string(),
  subtotal: z.union([z.string(), z.number()]).optional(),
  tax_amount: z.union([z.string(), z.number()]).optional(),
  total_with_tax: z.union([z.string(), z.number()]).optional(),
  qr_code: z.string().nullable().optional(),
  item_count: z.number().int()
});
export type Cart = z.infer<typeof CartSchema>;

// Schema: DailyReport
export const DailyReportSchema = z.object({
  date: z.string(),
  sales_count: z.number().int(),
  total: z.union([z.string(), z.number()]),
  sales: z.array(SaleSchema)
});
export type DailyReport = z.infer<typeof DailyReportSchema>;

// Schema: TokenResponse
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  user: UserPublicSchema
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
