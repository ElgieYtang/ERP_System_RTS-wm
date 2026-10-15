<?php

namespace App\Http\Resources;

use App\Models\Billing;
use App\Models\DeliveryReceipt;
use App\Models\GatePass;
use App\Models\Outslip;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\Receiving;
use App\Models\SetupCustomer;
use App\Models\SetupItem;
use App\Models\SetupUser;
use App\Support\BillingAmounts;
use App\Support\DeliverySerials;

class TransactionPresenter
{
    public static function quotation(Quotation $quotation): array
    {
        $quotation->loadMissing('details');

        return [
            'id' => $quotation->quotation_no ?: ('QTN-'.str_pad((string) $quotation->id, 5, '0', STR_PAD_LEFT)),
            'dbId' => (string) $quotation->id,
            'customerId' => (string) ($quotation->customer_id ?? ''),
            'customerName' => $quotation->customer_name,
            'date' => optional($quotation->quotation_date)->format('Y-m-d'),
            'displayDate' => optional($quotation->quotation_date)->format('F j, Y'),
            'total' => (float) $quotation->quotation_total,
            'status' => self::statusToFrontend($quotation->status),
            'preparedBy' => (string) $quotation->prepared_by,
            'approvedBy' => (string) $quotation->approved_by,
            'items' => $quotation->details->map(fn ($line) => [
                'productId' => (string) $line->item_id,
                'productName' => $line->item_name,
                'quantity' => (float) $line->qty,
                'unitPrice' => (float) $line->price,
                'amount' => (float) $line->amount,
            ])->values()->all(),
        ];
    }

    public static function purchaseOrder(PurchaseOrder $po): array
    {
        $po->loadMissing('details');

        return [
            'id' => $po->po_no ?: ('PO-'.str_pad((string) $po->id, 5, '0', STR_PAD_LEFT)),
            'dbId' => (string) $po->id,
            'referenceQuotationId' => $po->quotation_id ? (string) $po->quotation_id : null,
            'referenceQuotationNo' => null,
            'supplierId' => (string) ($po->supplier_id ?? ''),
            'supplierName' => $po->supplier_name,
            'date' => optional($po->po_date)->format('Y-m-d'),
            'displayDate' => optional($po->po_date)->format('F j, Y'),
            'total' => (float) $po->po_total,
            'status' => self::poStatusToFrontend($po->status),
            'preparedBy' => (string) $po->prepared_by,
            'approvedBy' => (string) $po->approved_by,
            'items' => $po->details->map(fn ($line) => [
                'productId' => (string) $line->item_id,
                'productName' => $line->item_name,
                'quantity' => (float) $line->qty,
                'unitPrice' => (float) $line->price,
                'amount' => (float) $line->amount,
            ])->values()->all(),
        ];
    }

    public static function receiving(Receiving $receiving): array
    {
        $receiving->loadMissing(['details', 'purchaseOrder.details']);

        $po = $receiving->purchaseOrder;
        $poLines = $po?->details ?? collect();
        $isCompleted = strtoupper((string) $receiving->status) === 'COMPLETED';

        $items = $receiving->details->map(function ($line) use ($poLines, $isCompleted) {
            $poLine = $poLines->firstWhere('item_id', $line->item_id);
            $itemName = $poLine?->item_name
                ?? SetupItem::query()->find($line->item_id)?->item_name
                ?? 'Item '.$line->item_id;
            $ordered = (float) ($poLine?->qty ?? $line->qty);

            return [
                'productId' => (string) $line->item_id,
                'productName' => $itemName,
                'quantity' => (float) $line->qty,
                'unitPrice' => (float) ($poLine?->price ?? 0),
                'ordered' => $ordered,
                'received' => $isCompleted ? $ordered : 0,
                'remaining' => $isCompleted ? 0 : $ordered,
            ];
        })->values()->all();

        $customerId = '';
        $customerName = '';
        if ($po?->quotation_id) {
            $quotation = Quotation::query()->find($po->quotation_id);
            if ($quotation) {
                $customerId = (string) ($quotation->customer_id ?? '');
                $customerName = $quotation->customer_name ?? '';
            }
        }

        return [
            'id' => $receiving->receiving_no ?: ('RCV-'.str_pad((string) $receiving->id, 5, '0', STR_PAD_LEFT)),
            'dbId' => (string) $receiving->id,
            'purchaseOrderId' => $po?->po_no ?? (string) $receiving->po_id,
            'purchaseOrderDbId' => (string) $receiving->po_id,
            'supplierId' => (string) ($po?->supplier_id ?? ''),
            'supplierName' => $po?->supplier_name ?? '',
            'customerId' => $customerId,
            'customerName' => $customerName,
            'branchId' => (string) $receiving->branch_id,
            'date' => optional($receiving->receiving_date)->format('Y-m-d'),
            'displayDate' => optional($receiving->receiving_date)->format('F j, Y'),
            'remarks' => $receiving->remarks,
            'status' => $isCompleted ? 'completed' : 'pending',
            'items' => $items,
        ];
    }

    public static function outslip(Outslip $outslip): array
    {
        $outslip->loadMissing(['details', 'gatePass']);

        return [
            'id' => $outslip->outslip_no ?: ('OS-'.str_pad((string) $outslip->id, 5, '0', STR_PAD_LEFT)),
            'dbId' => (string) $outslip->id,
            'customerId' => (string) ($outslip->customer_id ?? ''),
            'customerName' => $outslip->customer_name,
            'receivingId' => $outslip->receiving_id ? (string) $outslip->receiving_id : null,
            'branchId' => (string) $outslip->branch_id,
            'date' => optional($outslip->outslip_date)->format('Y-m-d'),
            'displayDate' => optional($outslip->outslip_date)->format('F j, Y'),
            'status' => self::outslipStatusToFrontend($outslip->status),
            'gatePass' => $outslip->gatePass
                ? self::gatePass($outslip->gatePass)
                : null,
            'items' => $outslip->details->map(fn ($line) => [
                'productId' => (string) $line->item_id,
                'productName' => $line->item_name,
                'quantity' => (float) $line->qty,
                'unitPrice' => (float) $line->price,
                'amount' => (float) $line->amount,
                'unit' => 'PC/S',
            ])->values()->all(),
        ];
    }

    public static function gatePass(GatePass $gatePass): array
    {
        return [
            'id' => (string) $gatePass->id,
            'gatePassNo' => $gatePass->gate_pass_no,
            'outslipId' => (string) $gatePass->outslip_id,
            'vehicleNo' => $gatePass->vehicle_no ?? '',
            'driverName' => $gatePass->driver_name ?? '',
            'plateNo' => $gatePass->plate_no ?? '',
            'destination' => $gatePass->destination ?? '',
            'remarks' => $gatePass->remarks ?? '',
            'status' => strtolower((string) $gatePass->status),
            'exitAt' => optional($gatePass->exit_at)->format('Y-m-d H:i:s'),
            'displayExitAt' => optional($gatePass->exit_at)->format('F j, Y g:i A'),
            'displayTimeOut' => optional($gatePass->exit_at)->format('h:i A'),
        ];
    }

    public static function gatePassDocument(Outslip $outslip, GatePass $gatePass): array
    {
        $outslip->loadMissing(['details', 'receiving.purchaseOrder']);
        $customer = SetupCustomer::query()->find($outslip->customer_id);
        $preparer = $gatePass->prepared_by
            ? SetupUser::query()->find($gatePass->prepared_by)
            : null;

        $itemIds = $outslip->details->pluck('item_id')->filter()->unique()->values();
        $setupItems = SetupItem::query()
            ->with(['brand', 'model', 'unitMeasure'])
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id');

        $items = $outslip->details->map(function ($line) use ($setupItems) {
            $setup = $setupItems->get($line->item_id);

            return [
                'productId' => (string) $line->item_id,
                'productCode' => 'ITM-'.str_pad((string) $line->item_id, 4, '0', STR_PAD_LEFT),
                'productName' => $line->item_name,
                'brand' => $setup?->brand?->name ?? '',
                'model' => $setup?->model?->name ?? '',
                'quantity' => (float) $line->qty,
                'unit' => $setup?->unitMeasure?->name ?: 'UNIT',
            ];
        })->values()->all();

        $purchaseOrder = $outslip->receiving?->purchaseOrder;
        $destination = trim((string) ($gatePass->destination ?? ''));
        if ($destination === '') {
            $destination = trim((string) ($customer?->address ?? ''));
        }

        return array_merge(self::gatePass($gatePass), [
            'outslipNo' => $outslip->outslip_no ?: ('OS-'.str_pad((string) $outslip->id, 5, '0', STR_PAD_LEFT)),
            'outslipDbId' => (string) $outslip->id,
            'purchaseOrderNo' => $purchaseOrder?->po_no
                ?? ($purchaseOrder ? 'PO-'.str_pad((string) $purchaseOrder->id, 5, '0', STR_PAD_LEFT) : ''),
            'customerId' => (string) ($outslip->customer_id ?? ''),
            'customerName' => $outslip->customer_name ?: ($customer?->name ?? ''),
            'destination' => $destination,
            'purpose' => 'Delivery of items per Outslip',
            'displayDate' => optional($outslip->outslip_date)->format('F j, Y'),
            'date' => optional($outslip->outslip_date)->format('Y-m-d'),
            'preparedByName' => $preparer?->name ?: 'WEB ADMINISTRATOR',
            'authorizedByName' => 'Admin',
            'outslipStatus' => self::outslipStatusToFrontend($outslip->status),
            'items' => $items,
        ]);
    }

    public static function deliveryReceipt(DeliveryReceipt $delivery): array
    {
        $delivery->loadMissing(['details', 'outslip']);

        $itemIds = $delivery->details->pluck('item_id')->filter()->unique()->values();
        $setupItems = SetupItem::query()
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id');

        return [
            'id' => $delivery->dr_no ?: ('DR-'.str_pad((string) $delivery->id, 5, '0', STR_PAD_LEFT)),
            'dbId' => (string) $delivery->id,
            'customerId' => (string) ($delivery->customer_id ?? ''),
            'customerName' => $delivery->customer_name,
            'referenceOutslipId' => $delivery->outslip?->outslip_no
                ?? ($delivery->outslip_id ? (string) $delivery->outslip_id : null),
            'referenceOutslipDbId' => (string) $delivery->outslip_id,
            'date' => optional($delivery->dr_date)->format('Y-m-d'),
            'displayDate' => optional($delivery->dr_date)->format('F j, Y'),
            'total' => (float) $delivery->dr_total,
            'status' => self::deliveryStatusToFrontend($delivery->status),
            'items' => $delivery->details->map(function ($line) use ($setupItems) {
                $setup = $setupItems->get($line->item_id);
                $serials = DeliverySerials::decode($line->serial_no);

                return [
                    'productId' => (string) $line->item_id,
                    'productName' => $line->item_name,
                    'barcode' => $setup?->barcode ?? '',
                    'quantity' => (float) $line->qty,
                    'unitPrice' => (float) $line->price,
                    'amount' => (float) $line->amount,
                    'serialNumbers' => $serials,
                    'brandSerial' => DeliverySerials::formatForPrint($line->serial_no),
                ];
            })->values()->all(),
        ];
    }

    public static function billing(Billing $billing): array
    {
        $billing->loadMissing(['payments', 'delivery.details']);

        $total = BillingAmounts::statementTotal($billing);
        $paid = BillingAmounts::paidTotal($billing);
        $balanceDue = BillingAmounts::remainingDue($billing);
        $paymentStatus = 'unpaid';
        if ($balanceDue <= 0 && $total > 0) {
            $paymentStatus = 'paid';
        } elseif ($paid > 0) {
            $paymentStatus = 'partially_paid';
        }

        return [
            'id' => $billing->billing_no ?: ('BS-'.str_pad((string) $billing->id, 5, '0', STR_PAD_LEFT)),
            'dbId' => (string) $billing->id,
            'customerId' => (string) ($billing->customer_id ?? ''),
            'customerName' => $billing->customer_name,
            'referenceDrId' => $billing->delivery?->dr_no
                ?? ($billing->delivery_id ? (string) $billing->delivery_id : null),
            'referenceDrDbId' => (string) $billing->delivery_id,
            'billingDate' => optional($billing->billing_date)->format('Y-m-d'),
            'displayDate' => optional($billing->billing_date)->format('F j, Y'),
            'amount' => $total,
            'paidAmount' => $paid,
            'balanceDue' => $balanceDue,
            'paymentStatus' => $paymentStatus,
            'status' => strtoupper((string) $billing->status) === 'INACTIVE' ? 'inactive' : 'active',
            'payments' => $billing->payments->map(fn ($payment) => [
                'id' => $payment->payment_no ?: ('PAY-'.str_pad((string) $payment->id, 5, '0', STR_PAD_LEFT)),
                'date' => optional($payment->payment_date)->format('Y-m-d'),
                'amount' => (float) $payment->amount,
                'reference' => $payment->reference,
                'remarks' => $payment->remarks,
            ])->values()->all(),
        ];
    }

    public static function outslipStatusToFrontend(?string $status): string
    {
        return match (strtoupper((string) $status)) {
            'APPROVED' => 'approved',
            'FOR_DISPATCH', 'RELEASED' => 'for_dispatch',
            'CANCELLED', 'INACTIVE' => 'cancelled',
            default => 'pending',
        };
    }

    public static function deliveryStatusToFrontend(?string $status): string
    {
        return match (strtoupper((string) $status)) {
            'OUT FOR DELIVERY', 'OUT_FOR_DELIVERY' => 'out_for_delivery',
            'DELIVERED' => 'delivered',
            'INACTIVE', 'CANCELLED' => 'cancelled',
            'PENDING', 'ACTIVE' => 'active',
            default => 'active',
        };
    }

    public static function statusToFrontend(?string $status): string
    {
        return match (strtoupper((string) $status)) {
            'ACTIVE', 'APPROVED' => 'approved',
            'INACTIVE', 'CANCELLED' => 'cancelled',
            'COMPLETED' => 'approved',
            'REJECTED' => 'rejected',
            'DRAFT' => 'draft',
            default => 'pending',
        };
    }

    public static function poStatusToFrontend(?string $status): string
    {
        return match (strtoupper((string) $status)) {
            'ACTIVE', 'APPROVED' => 'approved',
            'INACTIVE', 'CANCELLED' => 'cancelled',
            'COMPLETED', 'FULLY_RECEIVED' => 'fully_received',
            'PARTIAL' => 'partial',
            default => 'pending',
        };
    }

    public static function statusToDb(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'approved' => 'APPROVED',
            'cancelled', 'inactive' => 'CANCELLED',
            'rejected' => 'REJECTED',
            'draft' => 'DRAFT',
            'completed', 'fully_received' => 'COMPLETED',
            'partial' => 'PARTIAL',
            'for_dispatch' => 'FOR_DISPATCH',
            'out_for_delivery' => 'OUT FOR DELIVERY',
            'delivered' => 'DELIVERED',
            'active' => 'ACTIVE',
            default => 'PENDING',
        };
    }
}
