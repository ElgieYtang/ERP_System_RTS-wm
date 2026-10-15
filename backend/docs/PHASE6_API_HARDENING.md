# Backend — Phase 6 API hardening

Server-side rules that complement the mobile field app QA phases.

## Gate pass lock after exit

- `PUT /api/outslips/{id}/gate-pass` returns **422** when gate pass status is `EXITED`.
- `POST /api/outslips/{id}/gate-pass/exit` uses the same guard (no duplicate exit).
- Implementation: `OutslipController::assertGatePassEditable()` + row lock in transaction.

## Inventory check on dispatch

- `POST /api/outslips/{id}/dispatch` verifies on-hand quantity per line via `InventoryStock::quantityForItem()` before creating OUT movements.
- Returns **422** with item name and available qty when stock is insufficient.
- Blocks duplicate dispatch if OUTSLIP inventory rows already exist for the outslip.

## Role permissions

Middleware: `App\Http\Middleware\EnsureAdmin` (alias `admin`).

| Route | Access |
|-------|--------|
| `POST /outslips/{id}/approve` | Admin |
| `POST /outslips/{id}/dispatch` | Admin |
| `PUT /settings` | Admin |
| `POST/PUT/DELETE /setup/*` | Admin |
| Gate pass, receiving confirm, DR, billing, quotations | Any authenticated active user |

Login returns `role: admin|staff` in `/auth/me` from `SetupUser::type`.

## Concurrent edit handling

State-changing endpoints use `DB::transaction()` + `lockForUpdate()` on the parent row:

- Outslip approve / dispatch
- Gate pass save / mark exited
- Receiving confirm

Receiving confirm remains idempotent when already `COMPLETED`.

## Files

- `app/Http/Controllers/Api/OutslipController.php`
- `app/Http/Controllers/Api/ReceivingController.php`
- `app/Http/Middleware/EnsureAdmin.php`
- `routes/api.php`
