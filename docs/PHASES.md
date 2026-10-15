# Phase 1 — Foundation (complete)

Real API authentication connected to `setup_users`.

---

# Phase 2 — Setup modules (complete)

All 12 setup screens read/write MySQL via `/api/setup/*`.

---

# Phase 3 — Core transactions (complete)

Quotation → Purchase Order → Receiving now persists in MySQL.

---

# Phase 4 — Fulfillment (complete)

Outslip → Delivery Receipt → Billing with inventory OUT on dispatch.

---

# Phase 5 — SOA + ledgers + reports (complete)

Statement of Account, customer/supplier ledgers, and inventory from real DB data.

---

# Phase 6 — Accomplishment CRUD + server photos (complete)

Accomplishment reports + photos on Laravel public disk / authenticated file stream.

---

# Phase 7 — Polish / QA / production (complete)

Production readiness for the office web app.

---

# Phase 8 — Flutter field mobile

Field app in `mobile/` on the same Laravel API.

## Mobile M1 — field transactions (complete in code)
- Login / logout, home counts
- Receiving / deliveries / accomplishments (+ photos)
- Detail screens, status chips, IndexedStack tabs
- Debug APK build gate passed

## Mobile M2 — field depth (complete in code)
- List filters (open / active / delivered / all)
- Offline **read cache** of last lists + home stats (writes still need API)
- Friendlier unreachable-API messages (emulator vs phone)
- Photo upload retries (up to 3) + snackbar Retry
- Actions disabled while offline-cached

## Mobile M3 — outslip / warehouse handoff (complete in code)
- Outslips tab: list, detail, filters (needs action / for dispatch / all)
- Approve pending outslip
- Dispatch approved outslip (inventory OUT)
- Home count for outslips needing action
- Offline read cache for outslips

**Device smoke test still pending.**

## Run
See `mobile/README.md`. Emulator default API: `http://10.0.2.2:8000/api`.

```powershell
cd C:\erp-system\backend
C:\wamp64\bin\php\php8.3.28\php.exe artisan serve --host=0.0.0.0 --port=8000

cd C:\erp-system\mobile
flutter analyze
flutter build apk --debug
# later: flutter run
```

## Next (M4+)
- Ask head before sales QTN / billing / collections on phone
- Not in field v1: full SOA, push, deep RBAC, write-offline queue

---

# Phase 9 — Magsayo web parity (complete in code)

Office web UI aligned with Magsayo ERP patterns (Laravel API unchanged).

- Outslip: `CreateOutslipFromReceivingDialog`, `OutslipDetailModal`, `DispatchConfirmDialog`, list pagination
- Receiving: `ReceivingDetailModal`, list pagination
- Purchase orders: `PoStatusChips` on detail modal
- SOA: `SoaLedger` summary cards
- Setup: item barcode print page (`/setup/item/barcodes`, `react-barcode`)
- Gate pass list: lock icon when DR exists (Magsayo cancel guard)
- Billing list pagination

**Not ported (API / product limits):** outslip draft/edit/save (DB uses `PENDING` on create), PO delete, gate pass void API, Magsayo localStorage demo flows.

## Handoff polish (complete in code)

- Delivery receipts + gate passes: client-side list pagination
- Document print: `quotation-print-page` included in global print visibility (preview routes)
- Legacy demo layer removed (`DemoContext`, unused demo master pages, sample `erpStore` reports)
- [HANDOFF.md](HANDOFF.md): demo script, deploy summary, known limitations, future work
