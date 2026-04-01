ContentForge — AI Content Studio (Vite + Supabase)

1. Copier .env.example vers .env et remplir VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (et optionnellement VITE_OWNER_GROQ_KEY pour la démo invité).

2. npm install
   npm run dev
   → http://localhost:5173

3. Production : npm run build puis déployer le dossier dist/ (définir les mêmes VITE_* sur l’hébergeur).

Schéma SQL : SETUP_SUPABASE.md
Contexte IA / équipe : memories.md
