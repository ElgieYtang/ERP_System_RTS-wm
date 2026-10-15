<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionPresenter;
use App\Models\DeliveryReceipt;
use App\Models\Outslip;
use App\Support\DeliverySerials;
use App\Support\DocumentNumber;
use App\Support\PaginatedJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryReceiptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DeliveryReceipt::query()
            ->with(['details', 'outslip'])
            ->orderByDesc('id');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('dr_no', 'like', '%'.$search.'%')
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
            $query->whereDate('dr_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('dr_date', '<=', $dateTo);
        }

        return PaginatedJson::respond(
            $request,
            $query,
            fn (DeliveryReceipt $delivery) => TransactionPresenter::deliveryReceipt($delivery),
        );
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => TransactionPresenter::deliveryReceipt($this->findDelivery($id)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'outslipId' => ['required', 'integer', 'exists:outslip_main,id'],
            'date' => ['nullable', 'date'],
        ]);

        $outslip = Outslip::query()->with('details')->findOrFail($payload['outslipId']);
        $status = strtoupper((string) $outslip->status);

        if (! in_array($status, ['FOR_DISPATCH', 'RELEASED'], true)) {
            return response()->json([
                'message' => 'Outslip must be for dispatch before creating a delivery receipt.',
            ], 422);
        }

        if (DeliveryReceipt::query()->where('outslip_id', $outslip->id)->exists()) {
            return response()->json([
                'message' => 'A delivery receipt already exists for this outslip.',
            ], 422);
        }

        $user = $request->attributes->get('auth_user');

        $delivery = DB::transaction(function () use ($payload, $outslip, $user) {
            $latest = DeliveryReceipt::query()->orderByDesc('id')->value('dr_no');
            $total = $outslip->details->sum(fn ($line) => (float) $line->amount);

            $delivery = DeliveryReceipt::query()->create([
                'outslip_id' => $outslip->id,
                'dr_no' => DocumentNumber::next('DR-', $latest),
                'dr_date' => $payload['date'] ?? now()->toDateString(),
                'customer_id' => $outslip->customer_id,
                'customer_name' => $outslip->customer_name,
                'dr_total' => $total,
                'prepared_by' => $user?->id ?? 0,
                'status' => 'ACTIVE',
            ]);

            foreach ($outslip->details as $line) {
                $delivery->details()->create([
                    'item_id' => $line->item_id,
                    'item_name' => $line->item_name,
                    'qty' => $line->qty,
                    'price' => $line->price,
                    'amount' => $line->amount,
                ]);
            }

            return $delivery->load(['details', 'outslip']);
        });

        return response()->json([
            'message' => 'Delivery receipt created successfully.',
            'data' => TransactionPresenter::deliveryReceipt($delivery),
        ], 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $payload = $request->validate([
            'status' => ['required', 'string'],
        ]);

        $delivery = $this->findDelivery($id);
        $current = strtoupper((string) $delivery->status);
        $next = strtolower($payload['status']);

        $allowed = match ($current) {
            'ACTIVE', 'PENDING' => ['out_for_delivery', 'delivered'],
            'OUT FOR DELIVERY', 'OUT_FOR_DELIVERY' => ['delivered'],
            default => [],
        };

        if (! in_array($next, $allowed, true)) {
            return response()->json([
                'message' => 'Invalid status transition for this delivery receipt.',
            ], 422);
        }

        if ($next === 'delivered' && ! DeliverySerials::deliveryComplete($delivery->details)) {
            return response()->json([
                'message' => 'Capture serial numbers for all line items before marking delivered.',
            ], 422);
        }

        $delivery->status = match ($next) {
            'out_for_delivery' => 'OUT FOR DELIVERY',
            'delivered' => 'DELIVERED',
            default => $delivery->status,
        };
        $delivery->save();

        return response()->json([
            'message' => 'Delivery receipt status updated.',
            'data' => TransactionPresenter::deliveryReceipt($delivery->fresh(['details', 'outslip'])),
        ]);
    }

    public function updateSerials(Request $request, string $id): JsonResponse
    {
        $payload = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.productId' => ['required', 'integer'],
            'lines.*.serialNumbers' => ['nullable', 'array'],
            'lines.*.serialNumbers.*' => ['string', 'max:128'],
        ]);

        $delivery = $this->findDelivery($id);
        $status = strtoupper((string) $delivery->status);

        if (in_array($status, ['DELIVERED', 'CANCELLED'], true)) {
            return response()->json([
                'message' => 'Serial numbers cannot be changed after delivery is completed.',
            ], 422);
        }

        $detailsByProduct = $delivery->details->keyBy('item_id');
        $seenSerials = [];

        foreach ($payload['lines'] as $linePayload) {
            $productId = (int) $linePayload['productId'];
            $detail = $detailsByProduct->get($productId);

            if (! $detail) {
                return response()->json([
                    'message' => "Product {$productId} is not on this delivery receipt.",
                ], 422);
            }

            $serials = array_values(array_filter(array_map(
                static fn ($value) => trim((string) $value),
                $linePayload['serialNumbers'] ?? [],
            )));

            $needed = (int) round((float) $detail->qty);
            if (count($serials) > $needed) {
                return response()->json([
                    'message' => "Too many serial numbers for {$detail->item_name} (max {$needed}).",
                ], 422);
            }

            foreach ($serials as $serial) {
                $key = strtolower($serial);
                if (isset($seenSerials[$key])) {
                    return response()->json([
                        'message' => "Duplicate serial number: {$serial}",
                    ], 422);
                }

                $seenSerials[$key] = true;
            }
        }

        DB::transaction(function () use ($payload, $detailsByProduct) {
            foreach ($payload['lines'] as $linePayload) {
                $productId = (int) $linePayload['productId'];
                $detail = $detailsByProduct->get($productId);
                $serials = array_values(array_filter(array_map(
                    static fn ($value) => trim((string) $value),
                    $linePayload['serialNumbers'] ?? [],
                )));

                $detail->serial_no = DeliverySerials::encode($serials);
                $detail->save();
            }
        });

        return response()->json([
            'message' => 'Serial numbers saved.',
            'data' => TransactionPresenter::deliveryReceipt($delivery->fresh(['details', 'outslip'])),
        ]);
    }

    private function findDelivery(string $id): DeliveryReceipt
    {
        $query = DeliveryReceipt::query()->with(['details', 'outslip']);

        if (is_numeric($id)) {
            return $query->findOrFail((int) $id);
        }

        return $query->where('dr_no', $id)->firstOrFail();
    }
}
