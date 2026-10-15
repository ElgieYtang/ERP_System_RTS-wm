<?php

use App\Http\Controllers\Api\AccomplishmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\DeliveryReceiptController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\OutslipController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\ReceivingController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SetupController;
use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

Route::get('/health', [HealthController::class, 'show']);

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware(AuthenticateApiToken::class)->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update'])->middleware(EnsureAdmin::class);
    Route::put('/settings/password', [SettingsController::class, 'updatePassword']);

    Route::get('/setup/items/by-barcode/{barcode}', [SetupController::class, 'showItemByBarcode']);

    Route::prefix('setup')->middleware(EnsureAdmin::class)->group(function () {
        Route::get('/{resource}', [SetupController::class, 'index']);
        Route::post('/{resource}', [SetupController::class, 'store']);
        Route::put('/{resource}/{id}', [SetupController::class, 'update']);
        Route::delete('/{resource}/{id}', [SetupController::class, 'destroy']);
    });

    Route::get('/quotations', [QuotationController::class, 'index']);
    Route::post('/quotations', [QuotationController::class, 'store']);
    Route::get('/quotations/{id}', [QuotationController::class, 'show']);
    Route::put('/quotations/{id}', [QuotationController::class, 'update']);
    Route::post('/quotations/{id}/cancel', [QuotationController::class, 'cancel']);
    Route::post('/quotations/{id}/convert-to-po', [QuotationController::class, 'convertToPurchaseOrder']);

    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::get('/purchase-orders/{id}', [PurchaseOrderController::class, 'show']);
    Route::post('/purchase-orders/{id}/receivings', [PurchaseOrderController::class, 'createReceiving']);

    Route::get('/receivings', [ReceivingController::class, 'index']);
    Route::get('/receivings/{id}', [ReceivingController::class, 'show']);
    Route::post('/receivings/{id}/confirm', [ReceivingController::class, 'confirm']);

    Route::get('/outslips', [OutslipController::class, 'index']);
    Route::post('/outslips', [OutslipController::class, 'store']);
    Route::get('/outslips/{id}', [OutslipController::class, 'show']);
    Route::post('/outslips/{id}/approve', [OutslipController::class, 'approve'])->middleware(EnsureAdmin::class);
    Route::post('/outslips/{id}/dispatch', [OutslipController::class, 'dispatch'])->middleware(EnsureAdmin::class);
    Route::get('/outslips/{id}/gate-pass', [OutslipController::class, 'showGatePass']);
    Route::put('/outslips/{id}/gate-pass', [OutslipController::class, 'saveGatePass']);
    Route::post('/outslips/{id}/gate-pass/exit', [OutslipController::class, 'markGatePassExit']);

    Route::get('/delivery-receipts', [DeliveryReceiptController::class, 'index']);
    Route::post('/delivery-receipts', [DeliveryReceiptController::class, 'store']);
    Route::get('/delivery-receipts/{id}', [DeliveryReceiptController::class, 'show']);
    Route::post('/delivery-receipts/{id}/status', [DeliveryReceiptController::class, 'updateStatus']);
    Route::put('/delivery-receipts/{id}/serials', [DeliveryReceiptController::class, 'updateSerials']);

    Route::get('/billings', [BillingController::class, 'index']);
    Route::post('/billings', [BillingController::class, 'store']);
    Route::get('/billings/{id}', [BillingController::class, 'show']);
    Route::post('/billings/{id}/payments', [BillingController::class, 'recordPayment']);

    Route::get('/reports/soa', [ReportController::class, 'soa']);
    Route::get('/reports/customer-ledger', [ReportController::class, 'customerLedger']);
    Route::get('/reports/supplier-ledger', [ReportController::class, 'supplierLedger']);
    Route::get('/reports/inventory', [ReportController::class, 'inventory']);

    Route::get('/accomplishments', [AccomplishmentController::class, 'index']);
    Route::post('/accomplishments', [AccomplishmentController::class, 'store']);
    Route::get('/accomplishments/{id}', [AccomplishmentController::class, 'show']);
    Route::put('/accomplishments/{id}', [AccomplishmentController::class, 'update']);
    Route::delete('/accomplishments/{id}', [AccomplishmentController::class, 'destroy']);
    Route::post('/accomplishments/{id}/photos', [AccomplishmentController::class, 'uploadPhotos']);
    Route::delete('/accomplishments/{id}/photos/{photoId}', [AccomplishmentController::class, 'destroyPhoto']);
    Route::get('/accomplishments/{id}/photos/{photoId}/file', [AccomplishmentController::class, 'showPhoto']);
});
