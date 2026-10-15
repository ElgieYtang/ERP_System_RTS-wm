# Office web — handoff checklist

Use this with [README.md](../README.md) for deploy and demo sign-off.

## Boss demo path (≈15 min)

1. Login (`admin` / password from `setup_users`, run `erp:hash-passwords` after DB import).
2. **Quotation** — create or open → print preview.
3. **Purchase order** — from QTN → print preview.
4. **Receiving** — receive against PO → open detail modal.
5. **Outslip** — create from receiving → approve → dispatch.
6. **Gate pass** — print from list or preview.
7. **Delivery receipt** — create → scan serials → mark delivered → print.
8. **Billing** — create from DR → record payment (try full balance).
9. **SOA** — pick customer → generate → print preview.
10. **Accomplishment** — create report → upload photo on preview → print.

## Deploy (summary)

- Backend: production `.env`, `storage:link`, `erp:hash-passwords`, MySQL `rts_system`.
- Frontend: `npm run build`, serve `dist`, set `VITE_API_URL` or proxy `/api`.
- CORS: `FRONTEND_URL` when SPA and API are on different origins.

## Delivered in Phase 9 + handoff polish

- Magsayo-style outslip/receiving modals, SOA summary cards, item barcode print, list pagination (QTN, PO, receiving, outslip, billing, **DR**, **gate passes**).
- Print CSS: preview routes (`quotation-print-page`) visible in Chrome print.
- Removed legacy demo data layer (`DemoContext`, sample ERP store pages).

## Known limitations (tell stakeholders upfront)

| Item | Notes |
|------|--------|
| Outslip draft / edit | API creates `PENDING` outslips only |
| Delete PO | No API |
| Void gate pass | UI lock when DR exists; no void API |
| Server-side list paging | All transactions load on login (client pagination only) |
| Full Magsayo PO inline editor | Modal/table flow with live API |
| Mobile field app | Phase 8 — separate from office web deploy |
| RBAC | Admin vs user on settings; not per-module permissions |

## Phase 10 (API + web)

- **Server list paging:** `GET` transaction lists accept `page`, `per_page`, filters; `?all=1` for full export (used by `TransactionContext` refresh).
- **Dashboard:** `GET /api/dashboard/stats` for home counts.
- **PO delete:** `DELETE /api/purchase-orders/{id}` (admin; blocked if receiving exists).
- **Outslip draft:** `asDraft` on create, `PUT` update, `POST` submit.
- **Gate pass void:** `POST /api/outslips/{id}/gate-pass/void` (admin; no DR; reverses dispatch inventory when needed).
- **Web:** server-paged **gate passes** and **delivery receipts**; Playwright smoke tests (`npm run test:e2e`).

## Future work

- Wire remaining list pages (quotations, PO, receiving, outslip, billing) to server paging in the UI (API already supports it).
- Deeper role-based access control.

## Quick commands

```bat
cd backend
serve-api.cmd

cd frontend
npm install
npm run dev
npm run build
npm test
```
