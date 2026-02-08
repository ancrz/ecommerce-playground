import { z } from 'zod';
import { BaseEntitySchema } from './common';

export const CustomerSchema = BaseEntitySchema.extend({
  cedula: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  last_purchase: z.string().nullable(), // Datetime string
});

export const CustomerCreateSchema = z.object({
  cedula: z.string(),
  name: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});
