import { z } from 'zod';

export const MessageResponseSchema = z.object({
  message: z.string(),
});

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
