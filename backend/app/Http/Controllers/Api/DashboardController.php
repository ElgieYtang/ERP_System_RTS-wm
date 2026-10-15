<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\DeliveryReceipt;
use App\Models\Outslip;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\Receiving;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $pendingQuotations = Quotation::query()
            ->whereNotIn('status', ['CANCELLED', 'INACTIVE', 'APPROVED'])
            ->count();

        $openPurchaseOrders = PurchaseOrder::query()
            ->whereNotIn('status', ['CANCELLED', 'INACTIVE', 'FULLY_RECEIVED', 'COMPLETED'])
            ->count();

        $pendingReceiving = Receiving::query()
            ->where('status', '!=', 'COMPLETED')
            ->count();

        $pendingOutslips = Outslip::query()
            ->whereIn('status', ['PENDING', 'DRAFT', 'APPROVED'])
            ->count();

        $activeDeliveries = DeliveryReceipt::query()
            ->whereIn('status', ['ACTIVE', 'PENDING', 'OUT FOR DELIVERY', 'OUT_FOR_DELIVERY'])
            ->count();

        $unpaidBills = Billing::query()
            ->where(function ($query) {
                $query->whereNull('payment_status')
                    ->orWhere('payment_status', '!=', 'PAID');
            })
            ->count();

        return response()->json([
            'data' => [
                'pendingQuotations' => $pendingQuotations,
                'openPurchaseOrders' => $openPurchaseOrders,
                'pendingReceiving' => $pendingReceiving,
                'pendingOutslips' => $pendingOutslips,
                'activeDeliveries' => $activeDeliveries,
                'unpaidBills' => $unpaidBills,
            ],
        ]);
    }
}
