import { z } from 'zod';
import { BaseEntitySchema } from './common';

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
  igtf_amount: z.number().default(0),
  total_with_tax: z.number(),
  qr_code: z.string().nullable(),
  item_count: z.number().int().optional(),
});

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
  igtf_amount: z.number().default(0),
  total_with_tax: z.number(),
  invoice_status: z.string().default('pending'),
  invoice_retry_count: z.number().int().default(0),
});

export const DailyReportSchema = z.object({
  date: z.string(),
  sales_count: z.number().int(),
  total: z.number(),
  sales: z.array(SaleSchema),
});
