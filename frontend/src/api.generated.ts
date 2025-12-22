/**
 * api.generated.ts
 * Generado automáticamente desde OpenAPI - 2025-12-21T17:05:09.421265
 * NO EDITAR MANUALMENTE - Usar: python -m scripts.regenerate
 */

import { z } from 'zod';
import * as schemas from './types.generated';

// ========== API Error Handler ==========

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
  }

  is400() { return this.status === 400; }
  is401() { return this.status === 401; }
  is403() { return this.status === 403; }
  is404() { return this.status === 404; }
  is422() { return this.status === 422; }
  is500() { return this.status >= 500; }
}

// ========== Response Handler ==========

export async function handleResponse<T>(
  response: Response,
  schema?: z.ZodType<T>
): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (schema) {
    return schema.parse(data);
  }

  return data as T;
}

// ========== Logging Helper ==========

export function logApiError(error: unknown, context: string): void {
  if (error instanceof ApiError) {
    console.error(`[API ERROR] ${context}:`, {
      status: error.status,
      statusText: error.statusText,
      body: error.body,
    });
  } else if (error instanceof Error) {
    console.error(`[ERROR] ${context}:`, error.message);
  } else {
    console.error(`[ERROR] ${context}:`, error);
  }
}
