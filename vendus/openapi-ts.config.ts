import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: '../docs/vendus-api/vendus-api-v1.2.openapi.json',
    output: 'src/generated/vendus/hey-api',
    plugins: ['@hey-api/typescript', '@hey-api/sdk', '@hey-api/client-fetch'],
});
