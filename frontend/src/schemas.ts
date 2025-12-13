import { z } from 'zod';

// ==================== SHARED ====================

export const MessageResponseSchema = z.object({
  message: z.string(),
});

// ==================== BASE ENTITY ====================

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ==================== PRODUCTOS ====================

export const ProductSchema = BaseEntitySchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string().nullable(),
  price: z.number(),
  stock: z.number().int().nonnegative(),
  category: z.string().nullable(),
  image_url: z.string().nullable(),
  is_featured: z.boolean(),
  is_discount: z.boolean(),
  discount_percentage: z.number(),
  banner_assignment: z.string(),
  final_price: z.number().optional(),
});

export const ProductCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  final_price: z.number(),
  image_url: z.string().url().nullable(),
  is_featured: z.boolean(),
  is_discount: z.boolean(),
  discount_percentage: z.number(),
});

export const ProductCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number(),
  stock: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  image_url: z.string().url().optional(),
  is_featured: z.boolean().optional(),
  is_discount: z.boolean().optional(),
  discount_percentage: z.number().optional(),
  banner_assignment: z.string().optional(),
});

export const ProductUpdateSchema = ProductCreateSchema.partial();

// ==================== FINANCIEROS ====================

export const CurrencySchema = BaseEntitySchema.extend({
  name: z.string(),
  symbol: z.string(),
  is_base: z.boolean(),
  exchange_rate: z.number(),
  base_currency_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
});

export const RegionSchema = BaseEntitySchema.extend({
  name: z.string(),
  country: z.string().nullable(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  zip_code: z.string().nullable(),
  is_active: z.boolean(),
});

export const TaxRateSchema = BaseEntitySchema.extend({
  name: z.string(),
  region_id: z.string().uuid(),
  rate: z.number(),
  priority: z.number().int(),
  is_active: z.boolean(),
});

export const RegionUpdateSchema = RegionSchema.pick({
  name: true,
  country: true,
  state: true,
  city: true,
  zip_code: true,
  is_active: true,
}).partial();

export const TaxRateUpdateSchema = TaxRateSchema.pick({
  name: true,
  rate: true,
  priority: true,
  is_active: true,
}).partial();


// ==================== CARRITO ====================

export const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number(),
  subtotal: z.number(),
});

export const CartSchema = BaseEntitySchema.extend({
  customer_name: z.string(),
  customer_id: z.string(),
  items: z.array(CartItemSchema),
  status: z.string(),
  currency_id: z.string().uuid(),
  region_id: z.string().uuid(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_with_tax: z.number(),
  qr_code: z.string().nullable(),
  item_count: z.number().int().optional(),
});

// ==================== VENTAS ====================

export const PaymentDetailsSchema = z.object({
  payment_method: z.string(),
  payment_type: z.string().optional(),
  reference: z.string().optional(),
  bank: z.string().optional(),
  phone: z.string().optional(),
  customer_id: z.string().optional(),
});

export const SaleSchema = BaseEntitySchema.extend({
  cart_id: z.string().uuid(),
  customer_name: z.string(),
  customer_id: z.string(),
  items: z.array(CartItemSchema),
  currency_id: z.string().uuid(),
  payment_details: PaymentDetailsSchema,
  status: z.string(),
  completed_by: z.string().nullable(),
  completed_at: z.string().datetime(),
  region_id: z.string().uuid().nullable(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_with_tax: z.number(),
});

export const DailyReportSchema = z.object({
  date: z.string(),
  sales_count: z.number().int(),
  total: z.number(),
  sales: z.array(SaleSchema),
});

// ==================== CONFIGURACIÓN ====================

export const SocialNetworkSchema = z.object({
  name: z.string(),
  url: z.string(),
  icon: z.string().url().optional().nullable(),
});

export const BusinessInfoSchema = z.object({
  name: z.string(),
  rif: z.string().nullable(),
  contact: z.string().nullable(),
  social_networks: z.array(SocialNetworkSchema),
  logo_url: z.string().url().nullable(),
  icon_url: z.string().url().nullable(),
  banner_url: z.string().url().nullable(),
  updated_at: z.string().datetime(),
});

export const BusinessInfoUpdateSchema = BusinessInfoSchema.pick({
    name: true,
    rif: true,
    contact: true,
    social_networks: true,
}).partial();

export const CustomizationSchema = z.object({
  primary_color: z.string(),
  secondary_color: z.string(),
  accent_color: z.string(),
  font_family: z.string(),
  custom_css: z.string().nullable(),
  updated_at: z.string().datetime(),
  icon_products_url: z.string().url().nullable(),
  icon_business_url: z.string().url().nullable(),
  icon_customization_url: z.string().url().nullable(),
  icon_finance_url: z.string().url().nullable(),
  icon_sales_url: z.string().url().nullable(),
  icon_users_url: z.string().url().nullable(),
  icon_tax_url: z.string().url().nullable(),
});

// ==================== AUTENTICACIÓN ====================

export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  full_name: z.string().nullable(),
  email: z.string().email().nullable(),
  roles: z.array(z.string()),
  is_active: z.boolean(),
});

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  user: UserPublicSchema,
});

export const UserCreateRequestSchema = z.object({
  username: z.string(),
  plain_password: z.string(),
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const UserUpdateRequestSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const PasswordChangeRequestSchema = z.object({
  old_password: z.string(),
  new_password: z.string(),
});

export const AdminPasswordResetRequestSchema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
  captcha_token: z.string(),
});

export const PasswordResetValidateSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  new_password: z.string(),
});
