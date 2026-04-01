# ContentForge SaaS — Supabase Setup Guide

## Étape 1 — Créer un projet Supabase

1. Allez sur **https://supabase.com** → "New project"
2. Choisissez un nom (ex: `contentforge`)
3. Notez votre **Project URL** et votre **anon public key** (Settings → API)

---

## Étape 2 — Créer la table `profiles`

Dans l'éditeur SQL de Supabase (SQL Editor → New query), collez et exécutez :

```sql
-- Table des profils utilisateurs
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  api_keys jsonb default '{}',
  preferred_model text default 'llama-3.1-8b-instant',
  adjustments jsonb default '[]',
  prompt_version integer default 1,
  history jsonb default '[]',
  tokens_today integer default 0,
  tokens_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activer Row Level Security
alter table public.profiles enable row level security;

-- Politique : chaque utilisateur ne voit que ses propres données
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger : créer un profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Étape 3 — Configurer l'auth email

Dans Supabase → Authentication → Providers :
- Activez **Email** (activé par défaut)
- Désactivez "Confirm email" pour les tests (ou gardez-le pour la prod)

Dans Authentication → URL Configuration :
- Site URL : `http://localhost:5173` (port par défaut de `npm run dev`) ou votre domaine en prod

---

## Étape 4 — Variables d'environnement (Vite)

1. Copiez `.env.example` vers `.env` à la racine du projet.
2. Renseignez au minimum :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_publique
# Optionnel — démo invité (voir note sécurité ci-dessous)
VITE_OWNER_GROQ_KEY=
```

Les clés Supabase sont dans **Settings → API**. Le préfixe `VITE_` est requis pour que Vite les injecte dans le bundle client.

**Important :** toute variable `VITE_*` est **visible dans le navigateur** après build. La clé **anon** Supabase est conçue pour le client si la RLS est correcte. En revanche, `VITE_OWNER_GROQ_KEY` expose votre clé Groq : à réserver au développement ou à une démo ; en production sérieuse, passez par un proxy / Edge Function pour l’invité.

---

## Étape 5 — Obtenir une clé Groq (guide pour vos utilisateurs)

Ce guide s'affiche automatiquement après l'inscription dans l'app.

1. Allez sur **https://console.groq.com**
2. Créez un compte (bouton "Sign Up" → Google ou email)
3. Dans le menu gauche : **API Keys**
4. Cliquez **"Create API Key"**
5. Nommez-la (ex: `contentforge`) et copiez la clé (commence par `gsk_`)
6. Collez-la dans ContentForge → Settings → API Key

**Limites gratuites Groq :**
| Modèle | Tokens/minute | Tokens/jour |
|--------|--------------|-------------|
| llama-3.1-8b-instant | 20 000 | 500 000 |
| llama-3.3-70b-versatile | 6 000 | 100 000 |
| mixtral-8x7b | 5 000 | 500 000 |

**Recommandation ContentForge :**
- Optimizer → `llama-3.1-8b-instant` (rapide, économique)
- Generator → `llama-3.3-70b-versatile` (qualité maximale)

---

## Étape 6 — Déployer l'app

### Option A — Netlify / Vercel / CI

```bash
npm run build
```

Déployez le dossier **`dist/`**. Dans le tableau de bord de l’hébergeur, ajoutez les mêmes variables que dans `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.), puis relancez le build.

### Option B — GitHub Pages (statique)

Après `npm run build`, publiez le contenu de **`dist/`** (pas la racine du repo). Définissez les `VITE_*` via les secrets du workflow GitHub Actions qui exécute le build, ou build en local puis poussez `dist/`.

---

## Schéma de la base de données

```
profiles
├── id (uuid, FK → auth.users)
├── email (text)
├── api_keys (jsonb) → { groq: "gsk_...", openai: "sk-...", anthropic: "sk-ant-..." }
├── preferred_model (text) → "llama-3.1-8b-instant"
├── adjustments (jsonb) → ["Use stronger hooks", "Keep posts under 200 words"]
├── prompt_version (int) → 7
├── history (jsonb) → [{ platform, tpl, rating, comment, preview, date }]
├── tokens_today (int) → 12450
├── tokens_date (date) → 2025-01-15
└── created_at / updated_at
```
