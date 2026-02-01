import { z } from 'zod';
import { BaseEntitySchema } from './common';

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

export const ProductImageSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  image_url: z.string(),
  thumbnail_url: z.string().nullable().optional(),
  is_main: z.boolean(),
  display_order: z.number().int(),
});
