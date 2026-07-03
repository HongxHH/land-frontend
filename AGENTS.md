# AGENTS.md

## Cursor Cloud specific instructions

This repo is the Vue 3 + Vite frontend of **LandCheck** (国土房产测绘数据智能归档管理系统).
It talks to the Spring Boot backend in the `land-frontend` sibling repo `land-backend`.

- Package manager is **npm** (`package-lock.json`); Node 20.19+/22.12+ required (VM has Node 22). Deps are refreshed by the update script.
- Standard scripts (see `package.json`): `npm run dev` (Vite on **:5173**), `npm run build`, `npm run test` (Vitest/jsdom), `npm run lint` (ESLint). `npm run lint` currently reports 6 warnings and 0 errors — that's the expected baseline.
- **The dev server proxies `/api` → `http://127.0.0.1:8082`** (the backend) with `ws: true`. So the backend (and its infra: MongoDB, Redis, RocketMQ) must be running for anything beyond static pages to work. See `land-backend/AGENTS.md` for how to start the backend and its Docker-based infra.
- Override the backend target with `VITE_API_PROXY_TARGET` in `.env.local` if the backend is not on `127.0.0.1:8082`.
- No seed admin exists: register a user via the login page's "立即注册" link (or `POST /api/auth/register`), then log in. A normal user can create projects.
