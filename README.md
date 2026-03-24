# 🚀 Portfolio Framework

A zero-dependency, Firebase-powered portfolio generator with a full admin dashboard.
Pick one of 3 visual themes, manage your projects and profile — all from a browser interface.
Deploy to Firebase Hosting in under 5 minutes.

---

## ✨ Features

| Feature | Description |
|---|---|
| 3 themes | Minimal · Bold · Creative — switchable from admin |
| Admin dashboard | Edit profile, projects, skills, colors |
| Live preview | See changes before publishing |
| Firebase backend | Firestore (data) + Auth (admin login) + Hosting |
| Zero dependencies | Pure HTML/CSS/JS — no build step, no Node needed for the frontend |
| Fully responsive | Mobile-first on all themes |

---

## 🗂 Project Structure

```
portfolio-framework/
├── README.md
├── firebase.json           ← Hosting + Firestore rules config
├── firestore.rules         ← Security rules (admin-only writes)
├── .gitignore
└── public/
    ├── index.html          ← Portfolio (visitor view)
    ├── login.html          ← Admin login page
    ├── admin/
    │   └── index.html      ← Admin dashboard (protected)
    ├── js/
    │   ├── config.js       ← 🔧 YOUR Firebase config goes here
    │   ├── portfolio.js    ← Portfolio rendering + theme engine
    │   └── admin.js        ← Admin CRUD operations
    └── css/
        └── themes.css      ← 3 theme definitions
```

---

## 📋 Prerequisites

- A [Firebase account](https://firebase.google.com) (free)
- [Node.js](https://nodejs.org) v18+ (only for Firebase CLI)
- [Firebase CLI](https://firebase.google.com/docs/cli)

---

## 🔧 Installation

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/portfolio-framework.git
cd portfolio-framework
```

### Step 2 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → Create
3. In the project, go to **Build → Firestore Database** → Create database → Start in **production mode**
4. Go to **Build → Authentication** → Get started → Email/Password → Enable

### Step 3 — Create your admin account

In Firebase Console → Authentication → Users → **Add user**
- Enter your email and a strong password
- This will be your admin login

### Step 4 — Get your Firebase config

In Firebase Console → Project Settings (⚙️) → Your apps → **Add app** → Web app

Copy the config object and paste it into `public/js/config.js`:

```js
// public/js/config.js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 5 — Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, keep default rules file
firebase deploy --only firestore:rules
```

### Step 6 — Deploy to Firebase Hosting

```bash
firebase init hosting
# Public directory: public
# Single-page app: N
# GitHub auto-deploys: N
# Overwrite index.html: N

firebase deploy
```

### Step 7 — Seed initial data (first run only)

1. Open your site at `https://YOUR_PROJECT.web.app/login`
2. Log in with your admin credentials
3. You'll land on the dashboard — fill in your profile and add projects
4. Click **Publish** to make changes live

---

## 🎨 Themes

| Theme | Font | Vibe |
|---|---|---|
| **Minimal** | Playfair Display + Inter | Clean, editorial, lots of whitespace |
| **Bold** | Space Grotesk + JetBrains Mono | Dark, high-contrast, modern agency |
| **Creative** | Syne + Outfit | Bento grid, gradients, glassmorphism |

Switch themes in Admin → Appearance → Theme Selector. Changes go live immediately on Publish.

---

## 🗃 Firestore Data Model

```
/config               (single document)
  theme: "minimal" | "bold" | "creative"
  primaryColor: "#6B5BFF"
  accentColor: "#FF3B5C"
  bgColor: "#FAFAF8"

/profile              (single document)
  name: "Your Name"
  title: "Your Job Title"
  bio: "A short bio..."
  avatar: "https://..."
  location: "City, Country"
  email: "you@example.com"
  github: "https://github.com/..."
  linkedin: "https://linkedin.com/in/..."
  twitter: "https://twitter.com/..."

/projects             (collection)
  /{auto-id}
    title: "Project Name"
    description: "Short description"
    tags: ["React", "Firebase"]
    image: "https://..."
    liveUrl: "https://..."
    githubUrl: "https://github.com/..."
    featured: true
    order: 1

/skills               (collection)
  /{auto-id}
    name: "React"
    level: 90        (0-100)
    category: "Frontend"
```

---

## 🔒 Security

- Firestore rules: public **read**, admin-only **write** (Firebase Auth required)
- Admin route `/admin/` checks auth state on load — redirects to `/login` if not authenticated
- Never commit your `config.js` with real API keys to a **private** project
- For public repos: use environment variables + a build step, or restrict your Firebase API key in Google Cloud Console

---

## 🚀 Deploy updates

After any edit:

```bash
firebase deploy
```

Or to deploy only hosting (faster):

```bash
firebase deploy --only hosting
```

---

## 📄 License

MIT — use freely, modify, share.