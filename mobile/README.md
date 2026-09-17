# RTS ERP — Field Mobile (Flutter)

Same Laravel API as the office web app. Mobile covers the web **TRANSACTIONS** workflow only (not Setup or Reports).

## Prerequisites

- Flutter SDK on PATH (`flutter doctor` clean)
- Android Studio + emulator (or USB device)
- Laravel API reachable from the device/emulator

## API base URL

Default is in `lib/config/api_config.dart`:

| Where you run the app | Base URL |
|-----------------------|----------|
| Android emulator | `http://10.0.2.2:8000/api` |
| Physical phone (same Wi‑Fi) | `http://YOUR-PC-LAN-IP:8000/api` |
| iOS simulator | `http://127.0.0.1:8000/api` |

Override at run time without editing code:

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.0.106:8000/api
```

Cleartext HTTP is allowed for debug in `android/app/src/main/AndroidManifest.xml`.

## Run

```powershell
# Terminal 1 — API (must bind 0.0.0.0 for emulator/phone)
cd C:\erp-system\backend
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 — mobile
cd C:\erp-system\mobile
flutter pub get
flutter run
```

Login with a `setup_users` account (e.g. **admin** / **p@ssw0rd**).

**Refresh while running:** `r` = hot reload, `R` = hot restart (use restart after navigation or theme changes).

## Test & analyze

```powershell
cd C:\erp-system\mobile
flutter analyze lib/
flutter test
```

`flutter analyze lib/` should report no issues before release builds. Unit/widget tests cover workflow rules in `test/transaction_actions_test.dart` and key detail screens.

## Navigation

- **Dashboard** — greeting, open-task summary, 8-module icon grid, “Needs attention” chips
- Tap any module icon to open its list
- **Detail screens** — open immediately with record data; workflow buttons appear after linked lists load (short “Loading workflow actions…” notice)
- **Detail screens** — back button (left) and dashboard shortcut (right)
- **Profile** — avatar menu on dashboard (sign out)
- No side drawer or bottom tabs

## Modules & workflow

Full chain (same as web):

**Quotation → PO → Receiving → Outslip → Gate pass → DR → Billing → Payment**

| Module | Mobile actions |
|--------|----------------|
| Quotations | New, approve, cancel, edit (date/status), convert to PO |
| Purchase orders | Receive items → creates or opens receiving |
| Receiving | Confirm → create outslip (requires quotation customer) or **View outslip** if one exists |
| Outslips | Filters: **Needs action**, **For dispatch**, **Ready for DR**, **All** — new, approve, dispatch, gate pass, create DR |
| Gate pass | From approved/for-dispatch outslip — edit transport fields, save, mark exited, print PDF |
| Delivery receipts | Out for delivery, delivered → create billing |
| Billing | Record payment |
| SOA | Generate by customer + optional date range, print PDF |
| Accomplishments | New, edit, approve, photos, PDF |

**Action buttons hide when not allowed** (enforced in UI and before API calls): e.g. convert to PO hides after a PO exists; receive hides when a receiving exists; create outslip hides without quotation customer or when an outslip already exists; create DR/billing hide once the next document exists; gate pass save/exit lock after **exited**; record payment hides when paid.

Rules live in `lib/services/transaction_actions.dart`; mutations go through `lib/widgets/transaction_workflows.dart` (including gate pass load/save/exit/print).

## Gate pass

1. Open **Outslips** → tap an **approved** or **for dispatch** outslip
2. Tap **Gate pass** on the detail screen
3. **Details** tab — destination, driver, plate, vehicle, remarks
4. **Items** tab — line items from the outslip
5. **Print gate pass** — sticky bottom bar or app-bar printer icon (share sheet PDF)
6. **Save** — persists transport fields
7. **Mark exited** — records exit; form locks read-only afterward

Requires a live API for first load. Print uses the same share-sheet flow as other documents.

## Print / PDF

| Document | Where |
|----------|--------|
| Quotation, PO, DR | Detail → Print PDF |
| Receiving, Outslip, Billing | Detail → Print PDF |
| Gate pass | Outslip detail → Gate pass → Print gate pass |
| SOA | After generate → Print SOA PDF |
| Accomplishment | Detail → PDF |

Android opens the share sheet (save, email, WhatsApp, etc.). Layout matches office A4 letterhead where implemented.

## Offline

When the API is unreachable, list screens show the last cached data with a stale-data banner. **Mutations are disabled** until back online.

Additional offline behavior:

- Cached **PO, receiving, outslip, DR, and billing** lists hydrate cross-module rules so buttons like **Create DR** do not appear incorrectly
- If cache is incomplete, linked workflow buttons stay hidden
- **All transaction detail screens** (from cache) show an offline notice; workflow actions are hidden
- **Dashboard counts** recompute from cached module lists when the API is down
- **Gate pass**: view/print may work if data was loaded; **Save** and **Mark exited** are blocked offline; pull-to-refresh and exit confirmation when online

Pull-to-refresh on list screens retries the API when connectivity returns.

## Not on mobile

Setup (customers, suppliers, items, users) and inventory ledger reports — office web only.

## Regression checklist (manual)

Run on emulator or phone with API up:

1. Login / logout
2. Dashboard counts and pull-to-refresh (outslip count includes DR-ready rows)
3. **QTN** — create → approve → convert to PO
4. **PO** — receive items (duplicate receiving opens existing)
5. **Receiving** — confirm → create outslip; completed receiving with existing outslip shows **View outslip**
6. **Outslip** — approve → dispatch → **Gate pass** (save, print, mark exited) → create DR
7. **Outslip filters** — **Ready for DR** shows dispatched outslips without a DR
8. **DR** — out for delivery → delivered → create billing
9. **Billing** — record payment
10. **SOA** — pick customer, optional dates, generate + PDF
11. **Accomplishment** — create, edit, approve, PDF
12. Confirm invalid actions are hidden or blocked (e.g. convert after PO exists, create outslip without quotation customer)
13. **Offline** — airplane mode → cached lists + banners; mutations blocked; gate pass save/exit blocked

## Project layout

```
lib/
  config/api_config.dart        # API base URL
  navigation/                   # Dashboard shell, detail host, modules
  screens/
    gate_pass_page.dart         # Gate pass tabs, form, print bar
    outslips_page.dart          # Outslip list filters + detail
    receivings_page.dart        # Receiving list + create/view outslip
    ...                         # Other module list/detail pages
  services/
    home_counts.dart              # Dashboard open-item counts (live + offline)
    transaction_actions.dart    # When buttons show/hide
    transaction_lists.dart      # Cross-module lookups + offline cache hydrate
    document_print.dart         # PDF generation + share sheet
    document_pdf_layout.dart    # Shared A4 layouts (incl. gate pass)
    offline_cache.dart          # Last-known list payloads
  widgets/
    transaction_workflows.dart  # Dialogs + API mutations (incl. gate pass)
    field_ui.dart               # Status chips, banners, detail scaffold
test/
  home_counts_test.dart
  offline_detail_pages_test.dart
  transaction_actions_test.dart # Workflow rule unit tests
  receiving_detail_page_test.dart
  outslip_detail_page_test.dart
```
