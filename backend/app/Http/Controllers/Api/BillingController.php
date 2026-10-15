<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionPresenter;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\CustomerLedger;
use App\Models\DeliveryReceipt;
use App\Support\BillingAmounts;
use App\Support\DocumentNumber;
use App\Support\PaginatedJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Billing::query()
            ->with(['payments', 'delivery.details'])
            ->orderByDesc('id');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('billing_no', 'like', '%'.$search.'%')
                    ->orWhere('customer_name', 'like', '%'.$search.'%');
            });
        }

        $paymentStatus = (string) $request->query('payment_status', 'all');
        if ($paymentStatus !== '' && $paymentStatus !== 'all') {
            $query->where('payment_status', strtoupper($paymentStatus));
        }

        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        if ($dateFrom) {
            $query->whereDate('billing_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('billing_date', '<=', $dateTo);
        }

        return PaginatedJson::respond(
            $request,
            $query,
            fn (Billing $billing) => TransactionPresenter::billing($billing),
        );
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => TransactionPresenter::billing($this->findBilling($id)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'deliveryId' => ['required', 'integer', 'exists:delivery_main,id'],
            'date' => ['nullable', 'date'],
        ]);

        $delivery = DeliveryReceipt::query()->findOrFail($payload['deliveryId']);

        if (strtoupper((string) $delivery->status) !== 'DELIVERED') {
            return response()->json([
                'message' => 'Only delivered delivery receipts can be billed.',
            ], 422);
        }

        if (Billing::query()->where('delivery_id', $delivery->id)->exists()) {
            return response()->json([
                'message' => 'A billing statement already exists for this delivery receipt.',
            ], 422);
        }

        $user = $request->attributes->get('auth_user');

        $billing = DB::transaction(function () use ($payload, $delivery, $user) {
            $latest = Billing::query()->orderByDesc('id')->value('billing_no');

            $billing = Billing::query()->create([
                'delivery_id' => $delivery->id,
                'billing_no' => DocumentNumber::next('BS-', $latest),
                'billing_date' => $payload['date'] ?? now()->toDateString(),
                'customer_id' => $delivery->customer_id,
                'customer_name' => $delivery->customer_name,
                'billing_total' => (float) $delivery->dr_total,
                'paid_amount' => 0,
                'prepared_by' => $user?->id ?? 0,
                'status' => 'ACTIVE',
            ]);

            CustomerLedger::query()->create([
                'customer_id' => $delivery->customer_id,
                'outslip_id' => (int) ($delivery->outslip_id ?? 0),
                'debit' => (float) $delivery->dr_total,
                'credit' => 0,
            ]);

            return $billing->load(['payments', 'delivery']);
        });

        return response()->json([
            'message' => 'Billing statement created successfully.',
            'data' => TransactionPresenter::billing($billing),
        ], 201);
    }

    public function recordPayment(Request $request, string $id): JsonResponse
    {
        $payload = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'date' => ['nullable', 'date'],
            'reference' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $billing = $this->findBilling($id);
        BillingAmounts::syncStoredTotals($billing);
        $billing->refresh();

        $remaining = BillingAmounts::remainingDue($billing);
        $amount = round((float) $payload['amount'], 2);

        if ($remaining <= 0) {
            return response()->json([
                'message' => 'This billing is already paid.',
            ], 422);
        }

        if ($amount > $remaining) {
            if ($amount - $remaining <= 0.05) {
                $amount = $remaining;
            } else {
                return response()->json([
                    'message' => 'Payment exceeds the remaining balance.',
                    'remaining' => $remaining,
                ], 422);
            }
        }

        $billing = DB::transaction(function () use ($billing, $payload, $amount) {
            $latest = BillingPayment::query()->orderByDesc('id')->value('payment_no');

            BillingPayment::query()->create([
                'billing_id' => $billing->id,
                'payment_no' => DocumentNumber::next('PAY-', $latest),
                'payment_date' => $payload['date'] ?? now()->toDateString(),
                'amount' => $amount,
                'reference' => $payload['reference'] ?? null,
                'remarks' => $payload['remarks'] ?? null,
            ]);

            $billing->load('payments');
            $billing->paid_amount = BillingAmounts::paidTotal($billing);
            $billing->save();

            CustomerLedger::query()->create([
                'customer_id' => $billing->customer_id,
                'outslip_id' => (int) ($billing->delivery?->outslip_id ?? 0),
                'debit' => 0,
                'credit' => $amount,
            ]);

            return $billing->fresh(['payments', 'delivery.details']);
        });

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'data' => TransactionPresenter::billing($billing),
        ]);
    }

    private function findBilling(string $id): Billing
    {
        $query = Billing::query()->with(['payments', 'delivery.details']);

        if (is_numeric($id)) {
            return $query->findOrFail((int) $id);
        }

        return $query->where('billing_no', $id)->firstOrFail();
    }
}
