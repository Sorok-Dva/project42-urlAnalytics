# P42 | MIR-ALPHA URL Manager

P42-urlManager est une plate-forme mono-repo complète pour créer, gérer et analyser des liens courts avec génération de QR codes et analytics temps réel. Le système inclut un backend Node.js/Express/Sequelize, un frontend React/Vite/Tailwind, des scripts pnpm, une base MySQL, des conteneurs Docker et un pipeline CI.

## Architecture

- **apps/server** – API REST (TypeScript, Express, Sequelize, Socket.IO) avec migrations Umzug, seed de démonstration, webhooks et redirection ultra-rapide (cache mémoire).
- **apps/web** – Interface React + Vite + Tailwind, thème « P42 | MIR-ALPHA », mode sombre, i18n fr/en, analytics temps réel via Socket.IO, checklist onboarding, modules statistiques complets.
- **packages/shared** – Types, schémas Zod, constantes et feature flags partagés.
- **Docker** – Images distinctes pour le serveur (Node) et le frontend (Nginx), orchestration docker-compose avec MySQL.
- **CI** – GitHub Action `ci.yml` (pnpm install, build, tests server/web, lint).

## Fonctionnalités clés

- Authentification email/mot de passe + endpoints OAuth (GitHub/Discord prêts côté backend).
- Workspaces multi-rôles (Owner/Admin/Member/Viewer) avec limites plan configurables.
- Liens courts avec gestion avancée : géo-ciblage, expiration, fallback, notes, statut public/privé, duplication, archivage, déplacement par projet.
- Analytics temps réel (Socket.IO) : agrégation par intervalle (ALL/1Y/3M/1M/1W/1D), filtres éventements, exports CSV/JSON, top dimensions (Pays/Villes/Continents/Devices/OS/Browsers/Langues/Référents), flux d’événements, métriques de scans QR.
- QR codes personnalisables (préréglages, domaines, export SVG) et compteur de scans.
- API publique REST (`/api/links`, `/api/projects`, `/api/qr`, `/api/webhooks/tests`, `/api/links/:id/stats`, `/api/utils/utm`) + route de redirection `GET /:slug` respectant Do-Not-Track, anonymisation IP, déduplication d’événements, rate-limit.
- Seed de démo (workspace, domaines vérifiés, projets, liens, événements, QR code) : `pnpm --filter @p42/server run seed`.
- Feature flag `FeatureFlags.linkInBio` prêt pour une future page Link-in-bio.

## Prérequis

- Node.js ≥ 20
- pnpm ≥ 8.15.5
- MySQL 8 (ou Sqlite pour les tests via `DATABASE_URL=sqlite::memory:`)

## Installation & scripts

```bash
pnpm install
pnpm --filter @p42/server run dev      # API + Socket.IO
pnpm --filter @p42/web run dev         # Frontend Vite
pnpm --filter @p42/server run migrate  # Migrations Sequelize
pnpm --filter @p42/server run seed     # Fixtures MIR-ALPHA
pnpm --filter @p42/server run test     # Tests API (Vitest + Supertest)
pnpm --filter @p42/web run test        # Tests UI (Vitest + Testing Library)
```

### Variables d’environnement (extrait `.env.example`)

```
SERVER_PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL=mysql://p42:p42pass@mysql:3306/p42_urlmanager
SESSION_SECRET=...
JWT_SECRET=...
DEFAULT_DOMAIN=localhost:4000
MAXMIND_ACCOUNT_ID=...
MAXMIND_LICENSE_KEY=...
FEATURE_LINK_IN_BIO=false
```

Pour le frontend (`apps/web/.env.example`) :
```
VITE_API_URL=http://localhost:4000
VITE_APP_NAME="P42 | MIR-ALPHA"
VITE_PUBLIC_BASE_URL=http://localhost:4000
```

## Docker

```bash
# Build + run
docker compose build
docker compose up
# API disponible sur http://localhost:4000, Frontend sur http://localhost:8080
```

`Dockerfile.server` exécute les migrations via `pnpm migrate` puis lance `node dist/index.js`. `Dockerfile.web` produit le bundle Vite et l’expose via Nginx (reverse-proxy `/api` vers le service `server`).

## Structure des données principales

- **User / Workspace / WorkspaceMember** – gestion multi-tenant + rôles.
- **Project** – conteneur pour liens, partage public (token) + Snapshot.
- **Domain** – vérification personnalisée (instructions DNS + token).
- **Link** – slug unique par domaine, géo-règles JSON, expiration, plan de redirection, stats publiques.
- **LinkEvent** – clics/scans (device, OS, navigateur, langue, UTM, géo IP anonymisée).
- **QrCode** – designs, codes, total scans.
- **ApiKey / Webhook** – API publique, webhooks `click.recorded` & `scan.recorded` signé HMAC.

## API rapide

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Crée un utilisateur + workspace (seed domaine).
| POST | `/api/auth/login` | Auth JWT.
| GET | `/api/dashboard` | Métriques workspace + derniers événements.
| CRUD | `/api/links` | Création, mise à jour (geofilter, expiration), duplication, archivage.
| GET | `/api/links/:id/stats` | Analytics agrégés (interval, pagination, dimensions).
| GET | `/api/links/:id/export` | Export CSV/JSON.
| GET | `/api/projects`, `/api/projects/:id/public` | Projets + partage public.
| GET/POST | `/api/qr` | Gestion QR + téléchargement SVG.
| POST | `/api/utils/utm` | Génération rapide d’URL UTM.
| POST | `/api/webhooks/tests` | Envoi d’un webhook de test signé.
| GET | `/public/links/:token` | Statistiques publiques d’un lien.
| GET | `/public/projects/:token` | Statistiques publiques d’un projet.
| GET | `/:slug` | Redirection rapide (cache mémoire, analytics). |
| GET | `/qr/:code` | Redirection depuis QR + comptage scans. |

## Tests & Qualité

- Backend : Vitest + Supertest (SQLite en mémoire, `dotenv` `.env.test`).
- Frontend : Vitest + Testing Library (`jsdom`).
- ESLint et Prettier configurés (pas de point-virgule).

## Plans & limites

Les workspaces stockent `planLimits` (JSON) pour contrôler liens, QR codes et membres. Les helpers `ensureWorkspaceLimit` sont appelés lors de la création de liens et QR.

## Auto-hébergement

1. Copier `.env.example` → `.env`, ajuster secrets et `DATABASE_URL`.
2. Lancer `pnpm --filter @p42/server run migrate && pnpm --filter @p42/server run seed`.
3. Démarrer via `pnpm -r dev` ou `docker compose up`.
4. Configurer domaines personnalisés : `POST /api/domains` (token de vérification TXT), `POST /api/domains/:id/verify`.

## Roadmap courte

- Activation future de la page « Link-in-bio » (flag `FeatureFlags.linkInBio`).
- Connecteurs OAuth côté frontend.
- Editeur visuel avancé pour QR code (palette & logos uploadés).

---

**P42 | MIR-ALPHA** – MIR-ALPHA Metric Intelligence & Redirection.
