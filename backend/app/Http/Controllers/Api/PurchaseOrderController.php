<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionPresenter;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\Receiving;
use App\Models\ReceivingDetail;
use App\Models\SupplierLedger;
use App\Support\DocumentNumber;
use App\Support\PaginatedJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::query()->with('details')->orderByDesc('id');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('po_no', 'like', '%'.$search.'%')
                    ->orWhere('supplier_name', 'like', '%'.$search.'%');
            });
        }

        $status = (string) $request->query('status', 'all');
        if ($status !== '' && $status !== 'all') {
            $query->where('status', TransactionPresenter::statusToDb($status));
        }

        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        if ($dateFrom) {
            $query->whereDate('po_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('po_date', '<=', $dateTo);
        }

        return PaginatedJson::respond($request, $query, function (PurchaseOrder $po) {
            $presented = TransactionPresenter::purchaseOrder($po);

            if ($po->quotation_id) {
                $qtn = Quotation::query()->find($po->quotation_id);
                $presented['referenceQuotationNo'] = $qtn?->quotation_no;
                $presented['referenceQuotationId'] = $qtn?->quotation_no ?? (string) $po->quotation_id;
            }

            return $presented;
        });
    }

    public function destroy(string $id): JsonResponse
    {
        $po = $this->findPurchaseOrder($id);

        if (Receiving::query()->where('po_id', $po->id)->exists()) {
            throw ValidationException::withMessages([
                'purchaseOrder' => 'Cannot delete a purchase order that already has receiving records.',
            ]);
        }

        DB::transaction(function () use ($po) {
            SupplierLedger::query()->where('po_id', $po->id)->delete();
            $po->details()->delete();
            $po->delete();
        });

        return response()->json([
            'message' => 'Purchase order deleted successfully.',
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $po = $this->findPurchaseOrder($id);
        $presented = TransactionPresenter::purchaseOrder($po);

        if ($po->quotation_id) {
            $qtn = Quotation::query()->find($po->quotation_id);
            $presented['referenceQuotationNo'] = $qtn?->quotation_no;
            $presented['referenceQuotationId'] = $qtn?->quotation_no ?? (string) $po->quotation_id;
        }

        return response()->json(['data' => $presented]);
    }

    public function createReceiving(Request $request, string $id): JsonResponse
    {
        $po = $this->findPurchaseOrder($id);

        if (! in_array(TransactionPresenter::statusToFrontend($po->status), ['approved', 'pending', 'partial'], true)) {
            return response()->json([
                'message' => 'This purchase order cannot receive items in its current status.',
            ], 422);
        }

        $existing = Receiving::query()
            ->where('po_id', $po->id)
            ->with(['details', 'purchaseOrder.details'])
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            $isOpen = strtoupper((string) $existing->status) !== 'COMPLETED';

            return response()->json([
                'message' => $isOpen
                    ? 'An open receiving already exists for this purchase order.'
                    : 'A receiving already exists for this purchase order.',
                'data' => TransactionPresenter::receiving($existing),
            ]);
        }

        $payload = $request->validate([
            'branchId' => ['nullable', 'integer', 'exists:setup_branch,id'],
            'date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        $receiving = DB::transaction(function () use ($po, $payload) {
            $latest = Receiving::query()->orderByDesc('id')->value('receiving_no');

            $receiving = Receiving::query()->create([
                'po_id' => $po->id,
                'receiving_no' => DocumentNumber::next('RCV-', $latest),
                'receiving_date' => $payload['date'] ?? now()->toDateString(),
                'branch_id' => $payload['branchId'] ?? 1,
                'remarks' => $payload['remarks'] ?? ('Receiving for '.$po->po_no),
                'status' => 'PENDING',
            ]);

            foreach ($po->details as $line) {
                ReceivingDetail::query()->create([
                    'receiving_id' => $receiving->id,
                    'item_id' => $line->item_id,
                    'qty' => $line->qty,
                ]);
            }

            return $receiving->load(['details', 'purchaseOrder.details']);
        });

        return response()->json([
            'message' => 'Receiving created successfully.',
            'data' => TransactionPresenter::receiving($receiving),
        ], 201);
    }

    private function findPurchaseOrder(string $id): PurchaseOrder
    {
        $query = PurchaseOrder::query()->with('details');

        if (is_numeric($id)) {
            return $query->findOrFail((int) $id);
        }

        return $query->where('po_no', $id)->firstOrFail();
    }
}
