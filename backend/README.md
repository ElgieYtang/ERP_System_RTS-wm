# RTS ERP — Laravel API

JSON API at `/api/*` for the React office UI (and later Flutter).

## Requirements

- PHP 8.2+ (WAMP: `C:\wamp64\bin\php\php8.3.28\php.exe`)
- Composer
- MySQL database `rts_system`

## Setup

### Windows (PHP not on PATH)

From `backend\`, use the `.cmd` wrappers — they find WAMP PHP automatically (or set env var `ERP_PHP` to your `php.exe`):

```bat
cd C:\erp-system\backend
install-deps.cmd
copy .env.example .env
rem Set DB_* for rts_system in .env
artisan.cmd key:generate
artisan.cmd storage:link
artisan.cmd erp:hash-passwords
serve-api.cmd
```

`serve-api.cmd` runs `artisan serve --host=0.0.0.0 --port=8000` (needed for Android emulator / phone).

### PowerShell (explicit PHP path)

```powershell
$php = "C:\wamp64\bin\php\php8.3.28\php.exe"
cd backend
copy .env.example .env
# Set DB_* for rts_system
& $php artisan key:generate
& $php artisan storage:link
& $php artisan erp:hash-passwords
& $php artisan serve
```

### Path migrations (legacy DB)

Do **not** run bare `artisan migrate` (conflicts with existing tables). Run only when a phase doc says so, e.g.:

```powershell
& $php artisan migrate --path=database/migrations/2026_08_20_000003_phase4_fulfillment_tables.php --force
```

## Main API surface (auth required unless noted)

| Area | Paths |
|------|--------|
| Health (public) | `GET /api/health` |
| Auth | `POST /api/auth/login` (throttled), `GET /api/auth/me`, `POST /api/auth/logout` |
| Setup | `/api/setup/{resource}` |
| Transactions | quotations, purchase-orders, receivings, outslips, delivery-receipts, billings |
| Reports | `/api/reports/soa`, `customer-ledger`, `supplier-ledger`, `inventory` |
| Accomplishments | `/api/accomplishments` (+ photos) |

## Production

- `APP_ENV=production`, `APP_DEBUG=false`
- `FRONTEND_URL` for CORS when SPA is on another origin
- `storage:link` for public disk photos
- See root [README.md](../README.md) and [docs/PHASES.md](../docs/PHASES.md)
