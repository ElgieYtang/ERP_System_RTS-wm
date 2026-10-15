<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionPresenter;
use App\Models\DeliveryReceipt;
use App\Models\GatePass;
use App\Models\InventoryMovement;
use App\Models\Outslip;
use App\Models\Quotation;
use App\Models\Receiving;
use App\Models\SetupCustomer;
use App\Models\SetupItem;
use App\Support\DocumentNumber;
use App\Support\InventoryStock;
use App\Support\PaginatedJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OutslipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Outslip::query()->with(['details', 'gatePass'])->orderByDesc('id');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('outslip_no', 'like', '%'.$search.'%')
                    ->orWhere('customer_name', 'like', '%'.$search.'%');
            });
        }

        if ($request->boolean('gate_pass_eligible')) {
            $query->whereIn('status', ['APPROVED', 'FOR_DISPATCH', 'RELEASED']);
        } else {
            $status = (string) $request->query('status', 'all');
            if ($status !== '' && $status !== 'all') {
                $query->where('status', TransactionPresenter::statusToDb($status));
            }
        }

        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        if ($dateFrom) {
            $query->whereDate('outslip_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('outslip_date', '<=', $dateTo);
        }

        return PaginatedJson::respond(
            $request,
            $query,
            fn (Outslip $outslip) => TransactionPresenter::outslip($outslip),
        );
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data' => TransactionPresenter::outslip($this->findOutslip($id)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'customerId' => ['required', 'integer', 'exists:setup_customer,id'],
            'receivingId' => ['required', 'integer', 'exists:receiving_main,id'],
            'branchId' => ['nullable', 'integer'],
            'date' => ['nullable', 'date'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.productId' => ['required_with:items', 'integer', 'exists:setup_items,id'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.unitPrice' => ['nullable', 'numeric', 'min:0'],
            'asDraft' => ['nullable', 'boolean'],
        ]);

        $user = $request->attributes->get('auth_user');
        $receivingId = (int) $payload['receivingId'];

        $this->assertReceivingAvailableForOutslip($receivingId);
        $expectedCustomer = $this->customerFromReceiving($receivingId);

        if (! $expectedCustomer) {
            throw ValidationException::withMessages([
                'receivingId' => 'This receiving has no quotation customer. An outslip cannot be created.',
            ]);
        }

        if ((int) $payload['customerId'] !== (int) $expectedCustomer->id) {
            throw ValidationException::withMessages([
                'customerId' => 'Customer must match the quotation linked to this receiving ('.$expectedCustomer->name.').',
            ]);
        }

        $payload['customerId'] = $expectedCustomer->id;

        $customer = SetupCustomer::query()->findOrFail($payload['customerId']);
        $lines = $this->resolveLines($payload);

        if ($lines === []) {
            throw ValidationException::withMessages([
                'items' => 'At least one line item is required.',
            ]);
        }

        $outslip = DB::transaction(function () use ($payload, $customer, $user, $lines, $receivingId) {
            $latest = Outslip::query()->orderByDesc('id')->value('outslip_no');

            $outslip = Outslip::query()->create([
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'outslip_no' => DocumentNumber::next('OS-', $latest),
                'outslip_date' => $payload['date'] ?? now()->toDateString(),
                'receiving_id' => $receivingId,
                'branch_id' => (int) ($payload['branchId'] ?? 1),
                'prepared_by' => $user?->id ?? 0,
                'status' => ! empty($payload['asDraft']) ? 'DRAFT' : 'PENDING',
            ]);

            foreach ($lines as $line) {
                $outslip->details()->create($line);
            }

            return $outslip->load('details');
        });

        return response()->json([
            'message' => 'Outslip created successfully.',
            'data' => TransactionPresenter::outslip($outslip),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $payload = $request->validate([
            'date' => ['nullable', 'date'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.productId' => ['required_with:items', 'integer', 'exists:setup_items,id'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.unitPrice' => ['nullable', 'numeric', 'min:0'],
        ]);

        $outslip = DB::transaction(function () use ($id, $payload) {
            $outslip = $this->findOutslipForUpdate($id);
            $status = strtoupper((string) $outslip->status);

            if (! in_array($status, ['DRAFT', 'PENDING'], true)) {
                throw ValidationException::withMessages([
                    'outslip' => 'Only draft or pending outslips can be edited.',
                ]);
            }

            if (array_key_exists('date', $payload) && $payload['date']) {
                $outslip->outslip_date = $payload['date'];
            }

            if (isset($payload['items'])) {
                $lines = $this->buildLines($payload['items']);
                $outslip->details()->delete();
                foreach ($lines as $line) {
                    $outslip->details()->create($line);
                }
            }

            $outslip->save();

            return $outslip->fresh(['details', 'gatePass']);
        });

        return response()->json([
            'message' => 'Outslip updated.',
            'data' => TransactionPresenter::outslip($outslip),
        ]);
    }

    public function submit(Request $request, string $id): JsonResponse
    {
        $outslip = DB::transaction(function () use ($id) {
            $outslip = $this->findOutslipForUpdate($id);

            if (strtoupper((string) $outslip->status) !== 'DRAFT') {
                throw ValidationException::withMessages([
                    'outslip' => 'Only draft outslips can be submitted for approval.',
                ]);
            }

            $outslip->status = 'PENDING';
            $outslip->save();

            return $outslip->fresh(['details', 'gatePass']);
        });

        return response()->json([
            'message' => 'Outslip submitted for approval.',
            'data' => TransactionPresenter::outslip($outslip),
        ]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $user = $request->attributes->get('auth_user');

        $outslip = DB::transaction(function () use ($id, $user) {
            $outslip = $this->findOutslipForUpdate($id);

            if (strtoupper((string) $outslip->status) !== 'PENDING') {
                throw ValidationException::withMessages([
                    'outslip' => 'Only pending outslips can be approved.',
                ]);
            }

            $outslip->status = 'APPROVED';
            $outslip->prepared_by = $outslip->prepared_by ?: ($user?->id ?? 0);
            $outslip->save();

            return $outslip->fresh('details');
        });

        return response()->json([
            'message' => 'Outslip approved.',
            'data' => TransactionPresenter::outslip($outslip),
        ]);
    }

    public function dispatch(string $id): JsonResponse
    {
        $outslip = DB::transaction(function () use ($id) {
            $outslip = $this->findOutslipForUpdate($id);

            if (strtoupper((string) $outslip->status) !== 'APPROVED') {
                throw ValidationException::withMessages([
                    'outslip' => 'Only approved outslips can be marked for dispatch.',
                ]);
            }

            if ($this->outslipInventoryAlreadyPosted($outslip)) {
                throw ValidationException::withMessages([
                    'outslip' => 'This outslip has already been dispatched.',
                ]);
            }

            $branchId = $outslip->branch_id ?: 1;

            foreach ($outslip->details as $line) {
                $itemId = (int) $line->item_id;
                $needed = (float) $line->qty;
                $available = InventoryStock::quantityForItem($itemId, $branchId);

                if ($available < $needed) {
                    $name = $line->item_name ?? 'Item '.$itemId;
                    throw ValidationException::withMessages([
                        'inventory' => "{$name}: need {$needed}, available {$available}.",
                    ]);
                }
            }

            foreach ($outslip->details as $line) {
                InventoryMovement::query()->create([
                    'branch_id' => $branchId,
                    'item_id' => $line->item_id,
                    'trans_id' => $outslip->id,
                    'trans_date' => $outslip->outslip_date?->toDateString() ?? now()->toDateString(),
                    'trans_type' => 'OUTSLIP',
                    'in' => 0,
                    'out' => $line->qty,
                ]);
            }

            $outslip->status = 'FOR_DISPATCH';
            $outslip->save();

            return $outslip->fresh(['details', 'gatePass']);
        });

        return response()->json([
            'message' => 'Outslip marked for dispatch. Inventory has been updated.',
            'data' => TransactionPresenter::outslip($outslip),
        ]);
    }

    public function showGatePass(string $id): JsonResponse
    {
        $outslip = $this->findOutslip($id);
        $this->assertGatePassAllowed($outslip);

        $gatePass = $this->findOrCreateGatePass($outslip);

        return response()->json([
            'data' => TransactionPresenter::gatePassDocument($outslip, $gatePass),
        ]);
    }

    public function saveGatePass(Request $request, string $id): JsonResponse
    {
        $outslip = $this->findOutslip($id);
        $this->assertGatePassAllowed($outslip);

        $payload = $request->validate([
            'vehicleNo' => ['nullable', 'string', 'max:255'],
            'driverName' => ['nullable', 'string', 'max:255'],
            'plateNo' => ['nullable', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        $user = $request->attributes->get('auth_user');

        $document = DB::transaction(function () use ($outslip, $payload, $user) {
            $gatePass = $this->findOrCreateGatePassForUpdate($outslip);
            $this->assertGatePassEditable($gatePass);

            $gatePass->fill([
                'vehicle_no' => $payload['vehicleNo'] ?? $gatePass->vehicle_no,
                'driver_name' => $payload['driverName'] ?? $gatePass->driver_name,
                'plate_no' => $payload['plateNo'] ?? $gatePass->plate_no,
                'destination' => $payload['destination'] ?? $gatePass->destination,
                'remarks' => $payload['remarks'] ?? $gatePass->remarks,
                'prepared_by' => $gatePass->prepared_by ?: ($user?->id ?? 0),
            ]);
            $gatePass->save();

            return TransactionPresenter::gatePassDocument($outslip, $gatePass->fresh());
        });

        return response()->json([
            'message' => 'Gate pass updated.',
            'data' => $document,
        ]);
    }

    public function markGatePassExit(Request $request, string $id): JsonResponse
    {
        $outslip = $this->findOutslip($id);
        $this->assertGatePassAllowed($outslip);

        $document = DB::transaction(function () use ($outslip) {
            $gatePass = $this->findOrCreateGatePassForUpdate($outslip);
            $this->assertGatePassEditable($gatePass);

            $gatePass->status = 'EXITED';
            $gatePass->exit_at = now();
            $gatePass->save();

            return TransactionPresenter::gatePassDocument($outslip, $gatePass->fresh());
        });

        return response()->json([
            'message' => 'Gate pass marked as exited.',
            'data' => $document,
        ]);
    }

    public function voidGatePass(Request $request, string $id): JsonResponse
    {
        $outslip = $this->findOutslip($id);

        if (DeliveryReceipt::query()->where('outslip_id', $outslip->id)->exists()) {
            throw ValidationException::withMessages([
                'gatePass' => 'Cannot void a gate pass after a delivery receipt exists.',
            ]);
        }

        $document = DB::transaction(function () use ($outslip) {
            $outslip = $this->findOutslipForUpdate((string) $outslip->id);
            $gatePass = GatePass::query()
                ->where('outslip_id', $outslip->id)
                ->lockForUpdate()
                ->first();

            if (! $gatePass) {
                throw ValidationException::withMessages([
                    'gatePass' => 'No gate pass exists for this outslip.',
                ]);
            }

            if (strtoupper((string) $gatePass->status) === 'VOID') {
                throw ValidationException::withMessages([
                    'gatePass' => 'This gate pass is already void.',
                ]);
            }

            $status = strtoupper((string) $outslip->status);

            if ($status === 'FOR_DISPATCH' || $status === 'RELEASED') {
                InventoryMovement::query()
                    ->where('trans_type', 'OUTSLIP')
                    ->where('trans_id', $outslip->id)
                    ->delete();

                $outslip->status = 'APPROVED';
                $outslip->save();
            } elseif ($status !== 'APPROVED') {
                throw ValidationException::withMessages([
                    'outslip' => 'Gate pass can only be voided for approved or dispatched outslips.',
                ]);
            }

            $gatePass->status = 'VOID';
            $gatePass->save();

            return TransactionPresenter::gatePassDocument($outslip->fresh(['details', 'gatePass']), $gatePass->fresh());
        });

        return response()->json([
            'message' => 'Gate pass voided.',
            'data' => $document,
        ]);
    }

    private function assertGatePassEditable(GatePass $gatePass): void
    {
        if (strtoupper((string) $gatePass->status) === 'EXITED') {
            throw ValidationException::withMessages([
                'gatePass' => 'This gate pass can no longer be edited.',
            ]);
        }
    }

    private function outslipInventoryAlreadyPosted(Outslip $outslip): bool
    {
        return InventoryMovement::query()
            ->where('trans_type', 'OUTSLIP')
            ->where('trans_id', $outslip->id)
            ->exists();
    }

    private function findOutslipForUpdate(string $id): Outslip
    {
        $query = Outslip::query()->with(['details', 'gatePass']);

        if (is_numeric($id)) {
            return $query->lockForUpdate()->findOrFail((int) $id);
        }

        return $query->where('outslip_no', $id)->lockForUpdate()->firstOrFail();
    }

    private function findOrCreateGatePassForUpdate(Outslip $outslip): GatePass
    {
        $existing = GatePass::query()
            ->where('outslip_id', $outslip->id)
            ->lockForUpdate()
            ->first();

        if ($existing) {
            return $existing;
        }

        $latest = GatePass::query()->orderByDesc('id')->value('gate_pass_no');

        return GatePass::query()->create([
            'outslip_id' => $outslip->id,
            'gate_pass_no' => DocumentNumber::next('GP-', $latest),
            'status' => 'PENDING',
        ]);
    }

    private function assertGatePassAllowed(Outslip $outslip): void
    {
        $status = strtoupper((string) $outslip->status);

        if (! in_array($status, ['APPROVED', 'FOR_DISPATCH', 'RELEASED'], true)) {
            throw ValidationException::withMessages([
                'outslip' => 'Gate pass is only available for approved or dispatched outslips.',
            ]);
        }
    }

    private function findOrCreateGatePass(Outslip $outslip): GatePass
    {
        $existing = GatePass::query()->where('outslip_id', $outslip->id)->first();
        if ($existing) {
            return $existing;
        }

        $latest = GatePass::query()->orderByDesc('id')->value('gate_pass_no');

        return GatePass::query()->create([
            'outslip_id' => $outslip->id,
            'gate_pass_no' => DocumentNumber::next('GP-', $latest),
            'status' => 'PENDING',
        ]);
    }

    private function resolveLines(array $payload): array
    {
        if (! empty($payload['items'])) {
            return $this->buildLines($payload['items']);
        }

        $receivingId = (int) ($payload['receivingId'] ?? 0);
        if (! $receivingId) {
            return [];
        }

        $receiving = Receiving::query()
            ->with(['details', 'purchaseOrder.details'])
            ->findOrFail($receivingId);

        if (strtoupper((string) $receiving->status) !== 'COMPLETED') {
            throw ValidationException::withMessages([
                'receivingId' => 'Only completed receivings can create an outslip.',
            ]);
        }

        $poLines = $receiving->purchaseOrder?->details ?? collect();

        return $receiving->details->map(function ($line) use ($poLines) {
            $poLine = $poLines->firstWhere('item_id', $line->item_id);
            $item = SetupItem::query()->find($line->item_id);
            $qty = (float) $line->qty;
            $price = (float) ($poLine?->price ?? 0);

            return [
                'item_id' => $line->item_id,
                'item_name' => $poLine?->item_name ?? $item?->item_name ?? 'Item '.$line->item_id,
                'qty' => $qty,
                'price' => $price,
                'amount' => $qty * $price,
            ];
        })->values()->all();
    }

    private function buildLines(array $items): array
    {
        $lines = [];

        foreach ($items as $item) {
            $setupItem = SetupItem::query()->findOrFail((int) $item['productId']);
            $qty = (float) $item['quantity'];
            $price = (float) ($item['unitPrice'] ?? 0);

            $lines[] = [
                'item_id' => $setupItem->id,
                'item_name' => $setupItem->item_name,
                'qty' => $qty,
                'price' => $price,
                'amount' => $qty * $price,
            ];
        }

        return $lines;
    }

    private function assertReceivingAvailableForOutslip(int $receivingId): void
    {
        $exists = Outslip::query()
            ->where('receiving_id', $receivingId)
            ->whereNotIn('status', ['CANCELLED', 'INACTIVE'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'receivingId' => 'An outslip already exists for this receiving.',
            ]);
        }
    }

    private function customerFromReceiving(int $receivingId): ?SetupCustomer
    {
        $receiving = Receiving::query()
            ->with('purchaseOrder')
            ->findOrFail($receivingId);

        $quotationId = $receiving->purchaseOrder?->quotation_id;
        if (! $quotationId) {
            return null;
        }

        $quotation = Quotation::query()->find($quotationId);
        if (! $quotation?->customer_id) {
            return null;
        }

        return SetupCustomer::query()->find($quotation->customer_id);
    }

    private function findOutslip(string $id): Outslip
    {
        $query = Outslip::query()->with(['details', 'gatePass']);

        if (is_numeric($id)) {
            return $query->findOrFail((int) $id);
        }

        return $query->where('outslip_no', $id)->firstOrFail();
    }
}
