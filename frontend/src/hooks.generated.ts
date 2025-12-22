/**
 * hooks.generated.ts
 * Generado automáticamente desde OpenAPI - 2025-12-21T17:05:09.422745
 * NO EDITAR MANUALMENTE
 */

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import * as schemas from './types.generated';
import { handleResponse, ApiError } from './api.generated';
import { config } from './config';

// Tipos genéricos de Hook
interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  refetch: () => Promise<void>;
}

interface MutationState<T, B> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  mutate: (body: B) => Promise<T>;
}

const BASE_URL = ''; // Paths de OpenAPI ya incluyen prefijo

/** Login */
export function useLoginApiAuthLoginPost() {
  const [state, setState] = useState<MutationState<schemas.TokenResponse, schemas.LoginRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.LoginRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.TokenResponseSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Logout */
export function useLogoutApiAuthLogoutPost() {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Request Password Reset */
export function useRequestPasswordResetApiAuthRequestPasswordResetPost() {
  const [state, setState] = useState<MutationState<unknown, schemas.PasswordResetRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.PasswordResetRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Validate Password Reset */
export function useValidatePasswordResetApiAuthValidatePasswordResetPost() {
  const [state, setState] = useState<MutationState<unknown, schemas.PasswordResetValidate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.PasswordResetValidate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/validate-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Me */
export function useGetMeApiAuthMeGet() {
  const [state, setState] = useState<QueryState<schemas.User>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.UserSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update Me */
export function useUpdateMeApiAuthMePut() {
  const [state, setState] = useState<MutationState<schemas.User, schemas.UserUpdateRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.UserUpdateRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.UserSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Change My Password */
export function useChangeMyPasswordApiAuthMePasswordPost() {
  const [state, setState] = useState<MutationState<unknown, schemas.PasswordChangeRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.PasswordChangeRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Products */
export function useGetProductsApiProductsGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Create Product */
export function useCreateProductApiProductsPost() {
  const [state, setState] = useState<MutationState<schemas.Product, schemas.ProductCreate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.ProductCreate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.ProductSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Search Products */
export function useSearchProductsApiProductsSearchGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/search`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Get Slider Products */
export function useGetSliderProductsApiProductsSliderSliderTypeGet(slider_type: string) {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/slider/${slider_type}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, [slider_type]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Get Product */
export function useGetProductApiProductsProductIdGet(product_id: string) {
  const [state, setState] = useState<QueryState<schemas.Product>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/${product_id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.ProductSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, [product_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update Product */
export function useUpdateProductApiProductsProductIdPut(product_id: string) {
  const [state, setState] = useState<MutationState<schemas.Product, schemas.ProductUpdate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.ProductUpdate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/${product_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.ProductSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Delete Product */
export function useDeleteProductApiProductsProductIdDelete(product_id: string) {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/products/${product_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Currencies */
export function useGetCurrenciesApiFinanceCurrenciesGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/currencies`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Create Currency */
export function useCreateCurrencyApiFinanceCurrenciesPost() {
  const [state, setState] = useState<MutationState<schemas.Currency, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/currencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.CurrencySchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Base Currency */
export function useGetBaseCurrencyApiFinanceCurrenciesBaseGet() {
  const [state, setState] = useState<QueryState<schemas.Currency>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/currencies/base`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.CurrencySchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Get Price Conversion */
export function useGetPriceConversionApiFinancePriceConversionGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/price-conversion`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update Exchange Rate */
export function useUpdateExchangeRateApiFinanceCurrenciesCurrencyIdRatePut(currency_id: string) {
  const [state, setState] = useState<MutationState<schemas.Currency, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/currencies/${currency_id}/rate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.CurrencySchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Set Base Currency */
export function useSetBaseCurrencyApiFinanceCurrenciesCurrencyIdSetBasePut(currency_id: string) {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/currencies/${currency_id}/set-base`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Delete Currency */
export function useDeleteCurrencyApiFinanceCurrenciesCurrencyIdDelete(currency_id: string) {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/finance/currencies/${currency_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Business Info */
export function useGetBusinessInfoApiBusinessInfoGet() {
  const [state, setState] = useState<QueryState<schemas.BusinessInfo>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/business/info`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update Business Info */
export function useUpdateBusinessInfoApiBusinessInfoPut() {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, schemas.BusinessInfoUpdate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.BusinessInfoUpdate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/business/info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Social Icon */
export function useUploadSocialIconApiBusinessSocialIconNetworkIndexPost(network_index: string) {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/business/social-icon/${network_index}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Create Guest Cart */
export function useCreateGuestCartApiCartGuestPost() {
  const [state, setState] = useState<MutationState<schemas.Cart, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.CartSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Create Cart */
export function useCreateCartApiCartPost() {
  const [state, setState] = useState<MutationState<schemas.Cart, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.CartSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Pending Carts */
export function useGetPendingCartsApiCartGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Get Cart */
export function useGetCartApiCartCartIdGet(cart_id: string) {
  const [state, setState] = useState<QueryState<schemas.Cart>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/${cart_id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.CartSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, [cart_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Add Item To Cart */
export function useAddItemToCartApiCartCartIdItemsPost(cart_id: string) {
  const [state, setState] = useState<MutationState<schemas.Cart, schemas.AddItemRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.AddItemRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/${cart_id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.CartSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Update Item Quantity */
export function useUpdateItemQuantityApiCartCartIdItemsProductIdPut(cart_id: string, product_id: string) {
  const [state, setState] = useState<MutationState<schemas.Cart, schemas.UpdateQuantityRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.UpdateQuantityRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/${cart_id}/items/${product_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.CartSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Remove Item From Cart */
export function useRemoveItemFromCartApiCartCartIdItemsProductIdDelete(cart_id: string, product_id: string) {
  const [state, setState] = useState<MutationState<schemas.Cart, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/${cart_id}/items/${product_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.CartSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Generate Qr */
export function useGenerateQrApiCartCartIdQrGet(cart_id: string) {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/cart/${cart_id}/qr`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, [cart_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Log Client Event */
export function useLogClientEventApiClientLogsPost() {
  const [state, setState] = useState<MutationState<unknown, schemas.LogEntry>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.LogEntry) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/client-logs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Business Info */
export function useGetBusinessInfoApiAdminBusinessInfoGet() {
  const [state, setState] = useState<QueryState<schemas.BusinessInfo>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/business/info`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update Business Info */
export function useUpdateBusinessInfoApiAdminBusinessInfoPut() {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, schemas.BusinessInfoUpdate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.BusinessInfoUpdate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/business/info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Social Icon */
export function useUploadSocialIconApiAdminBusinessSocialIconNetworkIndexPost(network_index: string) {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/business/social-icon/${network_index}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get All Users */
export function useGetAllUsersApiAdminUsersGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Create New User */
export function useCreateNewUserApiAdminUsersPost() {
  const [state, setState] = useState<MutationState<schemas.User, schemas.UserCreateRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.UserCreateRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.UserSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get User By Id */
export function useGetUserByIdApiAdminUsersUserIdGet(user_id: string) {
  const [state, setState] = useState<QueryState<schemas.User>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${user_id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.UserSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, [user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update User */
export function useUpdateUserApiAdminUsersUserIdPut(user_id: string) {
  const [state, setState] = useState<MutationState<schemas.User, schemas.UserUpdateRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.UserUpdateRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.UserSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Admin Reset Password */
export function useAdminResetPasswordApiAdminUsersResetPasswordPost() {
  const [state, setState] = useState<MutationState<unknown, schemas.AdminPasswordResetRequest>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.AdminPasswordResetRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Complete Sale */
export function useCompleteSaleApiAdminSalesCartIdCompletePost(cart_id: string) {
  const [state, setState] = useState<MutationState<schemas.Sale, schemas.PaymentDetails>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.PaymentDetails) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sales/${cart_id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.SaleSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Cancel Sale */
export function useCancelSaleApiAdminSalesCartIdCancelPost(cart_id: string) {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sales/${cart_id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Daily Sales */
export function useGetDailySalesApiAdminSalesDailyGet() {
  const [state, setState] = useState<QueryState<schemas.DailyReport>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sales/daily`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.DailyReportSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Close Day */
export function useCloseDayApiAdminSalesCloseDayPost() {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sales/close-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Regions */
export function useGetRegionsApiAdminTaxRegionsGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/regions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Create Region */
export function useCreateRegionApiAdminTaxRegionsPost() {
  const [state, setState] = useState<MutationState<schemas.Region, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.RegionSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Update Region */
export function useUpdateRegionApiAdminTaxRegionsRegionIdPut(region_id: string) {
  const [state, setState] = useState<MutationState<schemas.Region, schemas.RegionUpdate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.RegionUpdate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/regions/${region_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.RegionSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Delete Region */
export function useDeleteRegionApiAdminTaxRegionsRegionIdDelete(region_id: string) {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/regions/${region_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Tax Rates For Region */
export function useGetTaxRatesForRegionApiAdminTaxRegionsRegionIdTaxRatesGet(region_id: string) {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/regions/${region_id}/tax-rates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, [region_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Create Tax Rate */
export function useCreateTaxRateApiAdminTaxTaxRatesPost() {
  const [state, setState] = useState<MutationState<schemas.TaxRate, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/tax-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.TaxRateSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Update Tax Rate */
export function useUpdateTaxRateApiAdminTaxTaxRatesTaxRateIdPut(tax_rate_id: string) {
  const [state, setState] = useState<MutationState<schemas.TaxRate, schemas.TaxRateUpdate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.TaxRateUpdate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/tax-rates/${tax_rate_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.TaxRateSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Delete Tax Rate */
export function useDeleteTaxRateApiAdminTaxTaxRatesTaxRateIdDelete(tax_rate_id: string) {
  const [state, setState] = useState<MutationState<unknown, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/tax/tax-rates/${tax_rate_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Product Image */
export function useUploadProductImageApiAdminImagesProductsProductIdUploadPost(product_id: string) {
  const [state, setState] = useState<MutationState<schemas.Product, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/images/products/${product_id}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.ProductSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Delete Product Image */
export function useDeleteProductImageApiAdminImagesProductsProductIdImageDelete(product_id: string) {
  const [state, setState] = useState<MutationState<schemas.Product, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/images/products/${product_id}/image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.ProductSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Business Logo */
export function useUploadBusinessLogoApiAdminImagesBusinessLogoPost() {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/images/business/logo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Business Icon */
export function useUploadBusinessIconApiAdminImagesBusinessIconPost() {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/images/business/icon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Business Banner */
export function useUploadBusinessBannerApiAdminImagesBusinessBannerPost() {
  const [state, setState] = useState<MutationState<schemas.BusinessInfo, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/images/business/banner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.BusinessInfoSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Get Customization */
export function useGetCustomizationApiAdminCustomizationGet() {
  const [state, setState] = useState<QueryState<schemas.Customization>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/customization/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, schemas.CustomizationSchema);
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Update Customization */
export function useUpdateCustomizationApiAdminCustomizationPut() {
  const [state, setState] = useState<MutationState<schemas.Customization, schemas.CustomizationUpdate>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body: schemas.CustomizationUpdate) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/customization/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });
      const data = await handleResponse(res, schemas.CustomizationSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Upload Module Icon */
export function useUploadModuleIconApiAdminCustomizationIconModuleNamePost(module_name: string) {
  const [state, setState] = useState<MutationState<schemas.Customization, unknown>>({
    data: null, loading: false, error: null, mutate: async () => null as any
  });

  const mutate = async (body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/customization/icon/${module_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: undefined
      });
      const data = await handleResponse(res, schemas.CustomizationSchema);
      setState({ data, loading: false, error: null, mutate });
      return data;
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
      throw err;
    }
  };

  return { ...state, mutate };
}

/** Root */
export function useRootGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}

/** Health Check */
export function useHealthCheckApiHealthGet() {
  const [state, setState] = useState<QueryState<unknown>>({
    data: null, loading: true, error: null, refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${BASE_URL}/api/health`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await handleResponse(res, z.unknown());
      setState({ data, loading: false, error: null, refetch: fetchData });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return state;
}
