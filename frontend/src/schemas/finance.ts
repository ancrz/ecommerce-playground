import { z } from 'zod';
import { BaseEntitySchema } from './common';

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
