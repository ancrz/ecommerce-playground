import { defineConfig } from 'orval';

export default defineConfig({
  'ecommerce-playground': {
    input: {
      target: 'http://localhost:8000/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/model',
      client: 'react-query',
      baseUrl: 'http://localhost:8000', 
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
