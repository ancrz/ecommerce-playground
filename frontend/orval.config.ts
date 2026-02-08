import { defineConfig } from 'orval';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8042';

export default defineConfig({
  'ecommerce-playground': {
    input: {
      target: './openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/model',
      client: 'react-query',
      baseUrl: BACKEND_URL, 
      override: {
        mutator: {
          path: './src/axios-instance.ts',
          name: 'customInstance',
        },
      },
      prettier: true,
    },
  },
});
