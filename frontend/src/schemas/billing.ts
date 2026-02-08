import { z } from 'zod';

export const SMTPCheckResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
});
