import { z } from 'zod';

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
