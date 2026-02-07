import axios, { AxiosRequestConfig } from 'axios';
import { config } from './config';

export const AXIOS_INSTANCE = axios.create({
  baseURL: config.apiUrl, // Usa la URL base de tu configuración
});

// Interceptor para inyectar el token
AXIOS_INSTANCE.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Función wrapper personalizada para Orval
// Esta firma debe coincidir con lo que Orval espera para custom mutators
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};
