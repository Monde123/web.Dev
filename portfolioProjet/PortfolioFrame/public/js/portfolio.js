/**
 * ══════════════════════════════════════════════════════════════
 *  portfolio.js — Portfolio Renderer
 *
 *  Responsibilities:
 *    1. Initialize Firebase
 *    2. Load config (theme + colors) from Firestore
 *    3. Load profile, projects, skills
 *    4. Apply theme to <body>
 *    5. Render all sections into the DOM
 * ══════════════════════════════════════════════════════════════
 */

import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, getDocs, orderBy, query }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig } from '/js/config.js';

// ─── Initialize Firebase ────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Helper: hide loading screen ────────────────────────────
function hideLoader() {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.add('hidden');
}

// ─── Helper: apply custom colors via CSS variables ──────────
/**
 * applyColors — injects --theme-primary and --theme-accent
 * into :root so themes can pick them up.
 * @param {string} primary  hex color e.g. "#6B5BFF"
 * @param {string} accent   hex color
 */
function applyColors(primary, accent) {
  const root = document.documentElement;
  if (primary) root.style.setProperty('--theme-primary', primary);
  if (accent)  root.style.setProperty('--theme-accent',  accent);
}

// ─── Step 1: Load config & apply theme ──────────────────────
async function loadConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'main'));
    if (snap.exists()) {
      const cfg = snap.data();
      // Apply theme
      document.body.dataset.theme = cfg.theme || 'minimal';
      // Apply custom colors
      applyColors(cfg.primaryColor, cfg.accentColor);
    }
  } catch (e) {
    console.warn('Could not load config, using defaults.', e);
  }
}

// ─── Step 2: Load & render profile ──────────────────────────
async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, 'profile', 'main'));
    if (!snap.exists()) return;
    const p = snap.data();

    // Update page title
    document.title = p.name ? `${p.name} — Portfolio` : 'Portfolio';

    // Nav brand
    const brand = document.getElementById('nav-brand');
    if (brand) brand.textContent = p.name || 'Portfolio';

    // Hero
    const name = document.getElementById('hero-name');
    if (name) name.textContent = p.name || '';
    name?.classList.add('fade-in');

    const bio = document.getElementById('hero-bio');
    if (bio) {
      bio.textContent = p.bio || '';
      if (p.title) bio.insertAdjacentHTML('beforebegin',
        `<p style="font-weight:600;margin-bottom:4px;opacity:0.6">${p.title}</p>`);
    }

    // Email CTA
    const emailEl = document.getElementById('hero-email');
    if (emailEl && p.email) {
      emailEl.href = `mailto:${p.email}`;
      emailEl.textContent = p.email;
    } else if (emailEl) {
      emailEl.style.display = 'none';
    }

    // Eyebrow (availability)
    const eyebrow = document.getElementById('hero-eyebrow');
    if (eyebrow && p.location) eyebrow.textContent = p.location;

    // Avatar (creative theme)
    const avatarWrap = document.getElementById('hero-avatar');
    if (avatarWrap && p.avatar) {
      avatarWrap.innerHTML = `<img src="${p.avatar}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    // Footer
    const footerCopy = document.getElementById('footer-copy');
    if (footerCopy) {
      footerCopy.textContent = `© ${new Date().getFullYear()} ${p.name || ''}`;
    }

    // Social links
    renderSocialLinks(p);

  } catch (e) {
    console.warn('Could not load profile.', e);
  }
}

/**
 * renderSocialLinks — build social icon links in footer
 * @param {Object} profile
 */
function renderSocialLinks(profile) {
  const container = document.getElementById('social-links');
  if (!container) return;

  const links = [
    { key: 'github',   label: 'GitHub',   icon: '⌘' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'in' },
    { key: 'twitter',  label: 'Twitter',  icon: '✗' },
  ];

  container.innerHTML = links
    .filter(l => profile[l.key])
    .map(l => `<a href="${profile[l.key]}" target="_blank" rel="noopener" aria-label="${l.label}">${l.label}</a>`)
    .join('');
}

// ─── Step 3: Load & render projects ─────────────────────────
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  try {
    const q    = query(collection(db, 'projects'), orderBy('order', 'asc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      grid.innerHTML = '<div class="empty-state">Aucun projet pour l\'instant.</div>';
      return;
    }

    const cards = snap.docs.map(docSnap => {
      const p = docSnap.data();
      return buildProjectCard(p);
    }).join('');

    grid.innerHTML = cards;

  } catch (e) {
    console.warn('Could not load projects.', e);
    grid.innerHTML = '<div class="empty-state">Erreur de chargement.</div>';
  }
}

/**
 * buildProjectCard — generates HTML for a single project card
 * @param {Object} project
 * @returns {string} HTML string
 */
function buildProjectCard(project) {
  const tags = (project.tags || [])
    .map(t => `<span class="project-tag">${t}</span>`)
    .join('');

  const imgContent = project.image
    ? `<img src="${project.image}" alt="${project.title}" loading="lazy">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;opacity:0.3">📁</div>`;

  const liveLink = project.liveUrl
    ? `<a class="project-link" href="${project.liveUrl}" target="_blank" rel="noopener">↗ Live</a>` : '';
  const ghLink = project.githubUrl
    ? `<a class="project-link" href="${project.githubUrl}" target="_blank" rel="noopener">⌘ Code</a>` : '';

  return `
    <div class="project-card fade-in">
      <div class="project-card-img">${imgContent}</div>
      <div class="project-card-body">
        <div class="project-tags">${tags}</div>
        <div class="project-card-title">${project.title || 'Sans titre'}</div>
        <div class="project-card-desc">${project.description || ''}</div>
        <div class="project-links">${liveLink}${ghLink}</div>
      </div>
    </div>`;
}

// ─── Step 4: Load & render skills ───────────────────────────
async function loadSkills() {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;

  try {
    const snap = await getDocs(collection(db, 'skills'));

    if (snap.empty) {
      grid.innerHTML = '<div class="empty-state">Aucune compétence renseignée.</div>';
      return;
    }

    // Group by category
    const categories = {};
    snap.docs.forEach(d => {
      const s = d.data();
      const cat = s.category || 'Général';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(s);
    });

    let html = '';
    Object.entries(categories).forEach(([cat, skills]) => {
      html += `<div style="grid-column:1/-1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;opacity:0.4;margin-top:16px;">${cat}</div>`;
      skills.forEach(s => {
        html += `
          <div class="skill-item fade-in">
            <div class="skill-header">
              <span>${s.name}</span>
              <span style="opacity:0.5">${s.level || 0}%</span>
            </div>
            <div class="skill-bar-track">
              <div class="skill-bar-fill" style="width:0%" data-level="${s.level || 0}"></div>
            </div>
          </div>`;
      });
    });

    grid.innerHTML = html;

    // Animate skill bars after a small delay
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('.skill-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.level + '%';
        });
      }, 200);
    });

  } catch (e) {
    console.warn('Could not load skills.', e);
  }
}

// ─── Bootstrap — run everything ─────────────────────────────
async function init() {
  try {
    // Load config first (to apply theme before rendering)
    await loadConfig();

    // Then load content in parallel
    await Promise.all([loadProfile(), loadProjects(), loadSkills()]);

  } catch (e) {
    console.error('Portfolio init error:', e);
  } finally {
    hideLoader();
  }
}

init();