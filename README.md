<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f35b3bad-e7ba-4056-aa72-05cd1d2c13cd

## Configuração

1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente no `.env.local`:
   - `GEMINI_API_KEY`: sua chave da API Gemini
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: chave anon pública do Supabase
3. Execute o schema SQL em `supabase-schema.sql` no SQL Editor do seu projeto Supabase
4. Ative o provider Google em Authentication > Providers no Supabase Dashboard
5. Rode o app: `npm run dev`
