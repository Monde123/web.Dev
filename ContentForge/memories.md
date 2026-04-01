# ContentForge — mémoire projet (contexte court)

**But** : SPA « AI Content Studio » — auth Supabase, profil `profiles`, génération LLM (Groq/OpenAI/Anthropic), mode invité limité.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `index.html` | Shell HTML |
| `src/main.js` | Entrée Vite : import CSS + `app.js` |
| `src/config.js` | Lit `import.meta.env.VITE_*` + défauts numériques |
| `src/app.js` | Client Supabase, auth, wizard, `gen()`, rating ; expose les handlers sur `window` pour les `onclick` inline |
| `css/app.css` | Styles (importés par `main.js`) |
| `vite.config.js` | Build → `dist/` |
| `.env` | **Local uniquement** (gitignored) — clés et URL |
| `.env.example` | Modèle des variables |
| `SETUP_SUPABASE.md` | SQL `profiles`, RLS |
| `README.txt` | Commandes dev / build |

## Stack

- **Vite 6** + `@supabase/supabase-js` (plus de CDN UMD)
- Variables : préfixe **`VITE_`** obligatoire pour exposition client
- Invité : `VITE_OWNER_GROQ_KEY` — **exposée dans le JS** ; OK pour dev/démo seulement

## Commandes

- `npm run dev` — http://localhost:5173
- `npm run build` — sortie `dist/`
- `npm run preview` — test du build local

## Constantes (`src/config.js` / `.env`)

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OWNER_GROQ_KEY`
- Optionnel : `VITE_GUEST_MAX`, `VITE_GUEST_MODEL`, `VITE_GUEST_MAX_TOKENS`, `VITE_DAILY_TOKEN_CAP`

## Règles métier (ne pas casser)

- `showApp()` : `updateModelChips()` seulement si `!isGuest`
- `gen()` : invité → `guestCount >= GUEST_MAX` et `OWNER_GROQ_KEY` requis
- `saveProfile` / `loadProfile` : historique max 20, reset tokens jour
- Chips : `data-model-id`, `title` échappé
