import 'package:flutter/material.dart';

import '../navigation/mobile_modules.dart';
import '../screens/billing_page.dart';
import '../screens/deliveries_page.dart';
import '../screens/outslips_page.dart';
import '../screens/purchase_orders_page.dart';
import '../screens/quotations_page.dart';
import '../screens/receivings_page.dart';
import '../services/api_client.dart';
import 'transaction_detail_host.dart';

Map<String, dynamic>? recordFromPayload(Map<String, dynamic> payload) {
  final data = payload['data'];
  if (data is Map) return Map<String, dynamic>.from(data);
  return null;
}

/// Opens a transaction detail screen with full workflow actions.
Future<void> openCreatedTransaction(
  BuildContext context,
  ApiClient api,
  MobileModule module,
  Map<String, dynamic> record, {
  bool popCurrentRoute = false,
  bool offline = false,
}) async {
  if (!context.mounted) return;
  if (popCurrentRoute && Navigator.canPop(context)) {
    Navigator.pop(context);
  }
  if (!context.mounted) return;

  await pushTransactionDetail(context, api, module, record, offline: offline);
}

Widget buildTransactionDetailPage({
  required ApiClient api,
  required MobileModule module,
  required Map<String, dynamic> record,
  bool popAfterMutations = true,
  bool offline = false,
  bool canReceive = false,
  Future<void> Function()? onReceive,
  Future<void> Function()? onConfirm,
  Future<void> Function()? onCreateOutslip,
  Future<void> Function()? onViewOutslip,
  Future<void> Function()? onApprove,
  Future<void> Function()? onDispatch,
  Future<void> Function()? onCreateDr,
  Future<void> Function(String status)? onSetStatus,
  Future<void> Function()? onCreateBilling,
  ValueChanged<Map<String, dynamic>>? onDeliveryUpdated,
  Future<void> Function()? onRecordPayment,
  Future<void> Function()? onApproveQuotation,
  Future<void> Function()? onConvert,
  Future<void> Function()? onCancel,
  Future<void> Function()? onEdit,
  String? workflowNotice,
  bool workflowNoticeLoading = false,
}) {
  switch (module) {
    case MobileModule.purchaseOrders:
      return PurchaseOrderDetailPage(
        api: api,
        order: record,
        canReceive: canReceive,
        onReceive: onReceive,
        offline: offline,
        workflowNotice: workflowNotice,
        workflowNoticeLoading: workflowNoticeLoading,
      );
    case MobileModule.receiving:
      return ReceivingDetailPage(
        receivingId: record['dbId']?.toString() ?? record['id']?.toString() ?? '',
        initial: record,
        popAfterMutations: popAfterMutations,
        onConfirm: onConfirm,
        onCreateOutslip: onCreateOutslip,
        onViewOutslip: onViewOutslip,
        workflowNotice: workflowNotice,
        workflowNoticeLoading: workflowNoticeLoading,
      );
    case MobileModule.outslips:
      return OutslipDetailPage(
        api: api,
        outslip: record,
        offline: offline,
        popAfterMutations: popAfterMutations,
        onApprove: onApprove,
        onDispatch: onDispatch,
        onCreateDr: onCreateDr,
        workflowNotice: workflowNotice,
        workflowNoticeLoading: workflowNoticeLoading,
      );
    case MobileModule.deliveries:
      return DeliveryDetailPage(
        api: api,
        delivery: record,
        popAfterMutations: popAfterMutations,
        onSetStatus: onSetStatus,
        onCreateBilling: onCreateBilling,
        onDeliveryUpdated: onDeliveryUpdated,
        offline: offline,
        workflowNotice: workflowNotice,
        workflowNoticeLoading: workflowNoticeLoading,
      );
    case MobileModule.billing:
      return BillingDetailPage(
        billing: record,
        popAfterMutations: popAfterMutations,
        onRecordPayment: onRecordPayment,
        workflowNotice: workflowNotice,
        workflowNoticeLoading: workflowNoticeLoading,
      );
    case MobileModule.quotations:
      return QuotationDetailPage(
        api: api,
        quotation: record,
        popAfterMutations: popAfterMutations,
        onApprove: onApproveQuotation,
        onConvert: onConvert,
        onCancel: onCancel,
        onEdit: onEdit,
        offline: offline,
        workflowNotice: workflowNotice,
        workflowNoticeLoading: workflowNoticeLoading,
      );
    default:
      return Scaffold(
        appBar: AppBar(title: Text(record['id']?.toString() ?? 'Record')),
        body: Center(child: Text('${record['id'] ?? 'Record'} created.')),
      );
  }
}
