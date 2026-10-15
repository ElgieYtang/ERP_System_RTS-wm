<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionPresenter;
use App\Models\PurchaseDetail;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\SetupCustomer;
use App\Models\SetupItem;
use App\Models\SetupSupplier;
use App\Models\SupplierLedger;
use App\Support\DocumentNumber;
use App\Support\PaginatedJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Quotation::query()->with('details')->orderByDesc('id');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('quotation_no', 'like', '%'.$search.'%')
                    ->orWhere('customer_name', 'like', '%'.$search.'%');
            });
        }

        $status = (string) $request->query('status', 'all');
        if ($status !== '' && $status !== 'all') {
            $query->where('status', TransactionPresenter::statusToDb($status));
        }

        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        if ($dateFrom) {
            $query->whereDate('quotation_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('quotation_date', '<=', $dateTo);
        }

        $response = PaginatedJson::respond(
            $request,
            $query,
            fn (Quotation $quotation) => TransactionPresenter::quotation($quotation),
        );

        if ($request->boolean('include_counts') && ! $request->boolean('all')) {
            $payload = $response->getData(true);
            $payload['meta']['statusCounts'] = $this->quotationStatusCounts();
            $response->setData($payload);
        }

        return $response;
    }

    /** @return array<string, int> */
    private function quotationStatusCounts(): array
    {
        $rows = Quotation::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $counts = ['all' => (int) $rows->sum(), 'draft' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'cancelled' => 0];

        foreach ($rows as $status => $count) {
            $frontend = TransactionPresenter::statusToFrontend((string) $status);
            if (isset($counts[$frontend])) {
                $counts[$frontend] += (int) $count;
            }
        }

        return $counts;
    }

    public function show(string $id): JsonResponse
    {
        $quotation = $this->findQuotation($id);

        return response()->json([
            'data' => TransactionPresenter::quotation($quotation),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'customerId' => ['required', 'integer', 'exists:setup_customer,id'],
            'date' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.productId' => ['required', 'integer', 'exists:setup_items,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unitPrice' => ['required', 'numeric', 'min:0'],
        ]);

        $user = $request->attributes->get('auth_user');
        $customer = SetupCustomer::query()->findOrFail($payload['customerId']);

        $quotation = DB::transaction(function () use ($payload, $customer, $user) {
            $latest = Quotation::query()->orderByDesc('id')->value('quotation_no');
            $lines = $this->buildLines($payload['items']);
            $total = collect($lines)->sum('amount');

            $quotation = Quotation::query()->create([
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'quotation_no' => DocumentNumber::next('QTN-', $latest),
                'quotation_date' => $payload['date'] ?? now()->toDateString(),
                'quotation_total' => $total,
                'prepared_by' => $user?->id ?? 0,
                'approved_by' => 0,
                'status' => 'PENDING',
            ]);

            foreach ($lines as $line) {
                $quotation->details()->create($line);
            }

            return $quotation->load('details');
        });

        return response()->json([
            'message' => 'Quotation created successfully.',
            'data' => TransactionPresenter::quotation($quotation),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $quotation = $this->findQuotation($id);

        if (in_array(strtoupper((string) $quotation->status), ['CANCELLED', 'INACTIVE'], true)) {
            return response()->json(['message' => 'Cancelled quotations cannot be edited.'], 422);
        }

        $payload = $request->validate([
            'customerId' => ['sometimes', 'integer', 'exists:setup_customer,id'],
            'date' => ['nullable', 'date'],
            'status' => ['sometimes', 'string'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.productId' => ['required_with:items', 'integer', 'exists:setup_items,id'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.unitPrice' => ['required_with:items', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($quotation, $payload) {
            if (isset($payload['customerId'])) {
                $customer = SetupCustomer::query()->findOrFail($payload['customerId']);
                $quotation->customer_id = $customer->id;
                $quotation->customer_name = $customer->name;
            }

            if (array_key_exists('date', $payload) && $payload['date']) {
                $quotation->quotation_date = $payload['date'];
            }

            if (isset($payload['status'])) {
                $quotation->status = TransactionPresenter::statusToDb($payload['status']);
            }

            if (isset($payload['items'])) {
                $lines = $this->buildLines($payload['items']);
                $quotation->details()->delete();
                foreach ($lines as $line) {
                    $quotation->details()->create($line);
                }
                $quotation->quotation_total = collect($lines)->sum('amount');
            }

            $quotation->save();
        });

        return response()->json([
            'message' => 'Quotation updated successfully.',
            'data' => TransactionPresenter::quotation($quotation->fresh('details')),
        ]);
    }

    public function cancel(string $id): JsonResponse
    {
        $quotation = $this->findQuotation($id);
        $quotation->status = 'CANCELLED';
        $quotation->save();

        return response()->json([
            'message' => 'Quotation cancelled successfully.',
            'data' => TransactionPresenter::quotation($quotation->fresh('details')),
        ]);
    }

    public function convertToPurchaseOrder(Request $request, string $id): JsonResponse
    {
        $quotation = $this->findQuotation($id);

        if (TransactionPresenter::statusToFrontend($quotation->status) !== 'approved') {
            return response()->json([
                'message' => 'Only approved quotations can be converted to a purchase order.',
            ], 422);
        }

        $existing = PurchaseOrder::query()
            ->where('quotation_id', $quotation->id)
            ->with('details')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Purchase order already exists for this quotation.',
                'data' => TransactionPresenter::purchaseOrder($existing),
            ]);
        }

        $payload = $request->validate([
            'supplierId' => ['required', 'integer', 'exists:setup_supplier,id'],
            'date' => ['nullable', 'date'],
        ]);

        $user = $request->attributes->get('auth_user');
        $supplier = SetupSupplier::query()->findOrFail($payload['supplierId']);

        $po = DB::transaction(function () use ($quotation, $supplier, $payload, $user) {
            $latest = PurchaseOrder::query()->orderByDesc('id')->value('po_no');

            $po = PurchaseOrder::query()->create([
                'quotation_id' => $quotation->id,
                'supplier_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'po_no' => DocumentNumber::next('PO-', $latest),
                'po_date' => $payload['date'] ?? now()->toDateString(),
                'po_total' => $quotation->quotation_total,
                'prepared_by' => $user?->id ?? 0,
                'approved_by' => $user?->id ?? 0,
                'status' => 'APPROVED',
            ]);

            foreach ($quotation->details as $line) {
                PurchaseDetail::query()->create([
                    'po_id' => $po->id,
                    'item_id' => $line->item_id,
                    'item_name' => $line->item_name,
                    'qty' => $line->qty,
                    'price' => $line->price,
                    'amount' => $line->amount,
                ]);
            }

            SupplierLedger::query()->create([
                'supplier_id' => $supplier->id,
                'po_id' => $po->id,
                'debit' => (float) $quotation->quotation_total,
                'credit' => 0,
            ]);

            return $po->load('details');
        });

        return response()->json([
            'message' => 'Purchase Order created successfully.',
            'data' => TransactionPresenter::purchaseOrder($po),
        ], 201);
    }

    private function findQuotation(string $id): Quotation
    {
        $query = Quotation::query()->with('details');

        if (is_numeric($id)) {
            return $query->findOrFail((int) $id);
        }

        return $query->where('quotation_no', $id)->firstOrFail();
    }

    /** @param  array<int, array{productId:int|string, quantity:float|int|string, unitPrice:float|int|string}>  $items */
    private function buildLines(array $items): array
    {
        $lines = [];

        foreach ($items as $item) {
            $setupItem = SetupItem::query()->findOrFail($item['productId']);
            $qty = (float) $item['quantity'];
            $price = (float) $item['unitPrice'];

            $lines[] = [
                'item_id' => $setupItem->id,
                'item_name' => $setupItem->item_name,
                'qty' => $qty,
                'price' => $price,
                'amount' => round($qty * $price, 2),
            ];
        }

        return $lines;
    }
}
