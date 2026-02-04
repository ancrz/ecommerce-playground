/**
 * src/types.ts
 * "El Plano del Frontend"
 * REFACTORIZADO: Este archivo ya no define interfaces manualmente.
 * Ahora infiere todos los tipos (DTOs) directamente desde los esquemas
 * de Zod definidos en 'schemas.ts'.
 *
 * Esto asegura que la validación (Zod) y los tipos (TypeScript)
 * estén siempre 100% sincronizados.
 */

import { z } from 'zod';
import {
  ProductSchema,
  ProductCardSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  CurrencySchema,
  RegionSchema,
  TaxRateSchema,
  RegionUpdateSchema,
  TaxRateUpdateSchema,
  CartItemSchema,
  CartSchema,
  PaymentDetailsSchema,
  SaleSchema,
  DailyReportSchema,
  SocialNetworkSchema,
  BusinessInfoSchema,
  BusinessInfoUpdateSchema,
  CustomizationSchema,
  UserPublicSchema,
  TokenResponseSchema,
  UserCreateRequestSchema,
  UserUpdateRequestSchema,
  PasswordChangeRequestSchema,
  PasswordResetRequestSchema,
  PasswordResetValidateSchema,
  ProductImageSchema
} from './schemas'; // Asumiendo que todos los esquemas están en schemas.ts

// ==================== MODELOS BASE (DTOs) ====================

export type Product = z.infer<typeof ProductSchema>;
export type ProductCard = z.infer<typeof ProductCardSchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type Region = z.infer<typeof RegionSchema>;
export type TaxRate = z.infer<typeof TaxRateSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type Sale = z.infer<typeof SaleSchema>;
export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;
export type DailyReport = z.infer<typeof DailyReportSchema>;
export type SocialNetwork = z.infer<typeof SocialNetworkSchema>;
export type BusinessInfo = z.infer<typeof BusinessInfoSchema>;
export type Customization = z.infer<typeof CustomizationSchema>;

// ==================== MODELOS RBAC Y AUTENTICACIÓN ====================

export type User = z.infer<typeof UserPublicSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// ==================== DTOS DE INTENCIÓN (API) ====================

export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type BusinessInfoUpdate = z.infer<typeof BusinessInfoUpdateSchema>;
export type UserCreateRequest = z.infer<typeof UserCreateRequestSchema>;
export type UserUpdateRequest = z.infer<typeof UserUpdateRequestSchema>;
export type PasswordChangeRequest = z.infer<typeof PasswordChangeRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetValidate = z.infer<typeof PasswordResetValidateSchema>;
export type RegionUpdate = z.infer<typeof RegionUpdateSchema>;
export type TaxRateUpdate = z.infer<typeof TaxRateUpdateSchema>;