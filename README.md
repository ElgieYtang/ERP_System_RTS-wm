# ResponsivCode ERP — monorepo

```
erp-system/
  frontend/   React + Vite (office web UI)
  backend/    Laravel API
  database/   MySQL dump (local only, not committed)
```

## Stack

| Layer | Tech |
|-------|------|
| Web frontend | React 19, Vite, JavaScript, Tailwind v4 |
| Backend API | Laravel 13, PHP 8.2+ |
| Database | MySQL `rts_system` (WAMP) |
| Mobile (later) | Flutter field app |

## Quick start (local)

### Backend (WAMP PHP)

**Windows:** you do not need `php` on PATH — from `backend\` run `serve-api.cmd` (see [backend/README.md](backend/README.md)).

```bat
cd C:\erp-system\backend
install-deps.cmd
copy .env.example .env
artisan.cmd key:generate
artisan.cmd storage:link
artisan.cmd erp:hash-passwords
serve-api.cmd
```

Or with an explicit PHP path:

```powershell
$php = "C:\wamp64\bin\php\php8.3.28\php.exe"
cd C:\erp-system\backend
copy .env.example .env
# Edit .env — DB_DATABASE=rts_system, DB_USERNAME, DB_PASSWORD
& $php artisan key:generate
& $php artisan storage:link
& $php artisan erp:hash-passwords
& $php artisan serve
```

API: `http://127.0.0.1:8000/api` · Health: `GET /api/health`

Run path-specific migrations only when noted in [docs/PHASES.md](docs/PHASES.md) (do **not** run full `artisan migrate` against the legacy DB).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. Vite proxies `/api` → `http://127.0.0.1:8000`.

Login: **admin** / **p@ssw0rd** (from `setup_users`; legacy plaintext passwords are rehashed on first successful login or via `erp:hash-passwords`).

## Production deploy notes

1. **Backend `.env`:** `APP_ENV=production`, `APP_DEBUG=false`, real `APP_KEY`, `APP_URL`, `LOG_LEVEL=error`, MySQL credentials.
2. **CORS:** set `FRONTEND_URL` to the live SPA origin(s) if the browser calls the API directly (not needed when the SPA and API share a reverse-proxy path).
3. **Storage:** `php artisan storage:link` (accomplishment photos on the `public` disk).
4. **Passwords:** `php artisan erp:hash-passwords` once after importing legacy users.
5. **Frontend build:**
   ```bash
   cd frontend
   # optional: set VITE_API_URL=https://api.your-domain.com/api
   npm run build
   ```
   Serve `frontend/dist` behind nginx/IIS; proxy `/api` to Laravel (or set `VITE_API_URL`).
6. **Smoke test:** login → quotation → PO → receiving → outslip → DR → billing → SOA → accomplishment photo upload.

## GitHub

https://github.com/ElgieYtang/RTS_ERP_System_Web.git

## Phase status

See [docs/PHASES.md](docs/PHASES.md) and [docs/HANDOFF.md](docs/HANDOFF.md) for deploy + demo sign-off.

- **Phases 1–7 complete** (auth → setup → transactions → fulfillment → reports → accomplishments → polish/QA).
- **Phase 9 complete** (office web Magsayo UI parity — modals, SOA cards, barcodes, list pagination).
- **Phase 8 in progress:** Flutter field app in [`mobile/`](mobile/README.md) (not required for office web deploy).
