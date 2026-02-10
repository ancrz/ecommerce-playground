import { z } from 'zod';

export const SocialNetworkSchema = z.object({
  name: z.string(),
  url: z.string(),
  icon: z.string().optional().nullable(),
});

export const BusinessInfoSchema = z.object({
  name: z.string(),
  rif: z.string().nullable(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  contact: z.string().nullable(),
  social_networks: z.array(SocialNetworkSchema),
  logo_url: z.string().nullable(),
  icon_url: z.string().nullable(),
  banner_url: z.string().nullable(),
  updated_at: z.string().datetime(),
});

export const BusinessInfoUpdateSchema = BusinessInfoSchema.pick({
    name: true,
  rif: true,
  address: true,
  phone: true,
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
  // Fiscal Data (added for invoice generation)
  name: z.string().optional().nullable(),
  rif: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  // Icons (relative paths from backend, e.g. "/uploads/icons/...")
  icon_dashboard_url: z.string().nullable().optional(),
  icon_pos_url: z.string().nullable().optional(),
  icon_products_url: z.string().nullable(),
  icon_orders_url: z.string().nullable().optional(),
  icon_business_url: z.string().nullable(),
  icon_customization_url: z.string().nullable(),
  icon_finance_url: z.string().nullable(),
  icon_sales_url: z.string().nullable(),
  icon_users_url: z.string().nullable(),
  icon_tax_url: z.string().nullable(),
});
