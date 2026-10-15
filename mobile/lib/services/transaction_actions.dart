import '../widgets/field_ui.dart';
import 'transaction_lists.dart';

bool _idsMatch(dynamic a, dynamic b) {
  if (a == null || b == null) return false;
  return a.toString() == b.toString();
}

String? _quotationPublicId(Map<String, dynamic> quotation) =>
    quotation['id']?.toString();

Map<String, dynamic>? findPoForQuotation(
  Map<String, dynamic> quotation,
  TransactionLists lists,
) {
  final qtnId = _quotationPublicId(quotation);
  final qtnDb = fieldDbId(quotation);
  for (final po in lists.purchaseOrders) {
    if (_idsMatch(po['referenceQuotationId'], qtnId) ||
        _idsMatch(po['referenceQuotationId'], qtnDb) ||
        _idsMatch(po['referenceQuotationNo'], qtnId)) {
      return po;
    }
  }
  return null;
}

bool canApproveQuotation(Map<String, dynamic> row) =>
    row['status']?.toString() == 'pending';

/// Cancel when not already cancelled and no PO has been created from this quotation.
bool canCancelQuotation(Map<String, dynamic> row, TransactionLists lists) {
  final status = row['status']?.toString() ?? '';
  if (status == 'cancelled') return false;
  return findPoForQuotation(row, lists) == null;
}

/// Edit date/status when not cancelled and no PO has been created yet.
bool canEditQuotation(Map<String, dynamic> row, TransactionLists lists) {
  final status = row['status']?.toString() ?? '';
  if (status == 'cancelled') return false;
  return findPoForQuotation(row, lists) == null;
}

bool canConvertQuotation(Map<String, dynamic> row, TransactionLists lists) =>
    row['status']?.toString() == 'approved' && findPoForQuotation(row, lists) == null;

bool hasReceivingForPo(Map<String, dynamic> po, TransactionLists lists) {
  final poDb = fieldDbId(po);
  final poNo = po['id']?.toString();
  return lists.receivings.any(
    (row) =>
        _idsMatch(row['purchaseOrderDbId'], poDb) || _idsMatch(row['purchaseOrderId'], poNo),
  );
}

Map<String, dynamic>? findReceivingForPo(Map<String, dynamic> po, TransactionLists lists) {
  final poDb = fieldDbId(po);
  final poNo = po['id']?.toString();
  for (final row in lists.receivings) {
    if (_idsMatch(row['purchaseOrderDbId'], poDb) || _idsMatch(row['purchaseOrderId'], poNo)) {
      return row;
    }
  }
  return null;
}

bool hasOpenReceivingForPo(Map<String, dynamic> po, TransactionLists lists) {
  final poDb = fieldDbId(po);
  final poNo = po['id']?.toString();
  return lists.receivings.any((row) {
    final open = row['status']?.toString() != 'completed';
    return open &&
        (_idsMatch(row['purchaseOrderDbId'], poDb) || _idsMatch(row['purchaseOrderId'], poNo));
  });
}

bool canReceivePurchaseOrder(Map<String, dynamic> po, TransactionLists lists) {
  final status = po['status']?.toString() ?? '';
  if (status == 'fully_received' || status == 'cancelled') return false;
  return !hasReceivingForPo(po, lists);
}

bool canConfirmReceiving(Map<String, dynamic> row) =>
    row['status']?.toString() != 'completed';

bool hasOutslipForReceiving(Map<String, dynamic> receiving, TransactionLists lists) {
  final rcvDb = fieldDbId(receiving);
  return lists.outslips.any((row) => _idsMatch(row['receivingId'], rcvDb));
}

Map<String, dynamic>? findOutslipForReceiving(
  Map<String, dynamic> receiving,
  TransactionLists lists,
) {
  final rcvDb = fieldDbId(receiving);
  for (final row in lists.outslips) {
    if (_idsMatch(row['receivingId'], rcvDb)) {
      return row;
    }
  }
  return null;
}

bool receivingHasQuotationCustomer(Map<String, dynamic> receiving) {
  final id = receiving['customerId']?.toString();
  return id != null && id.isNotEmpty;
}

bool canCreateOutslipFromReceiving(
  Map<String, dynamic> receiving,
  TransactionLists lists,
) =>
    receiving['status']?.toString() == 'completed' &&
    receivingHasQuotationCustomer(receiving) &&
    !hasOutslipForReceiving(receiving, lists);

bool canCreateOutslipFromReceivingSafe(
  Map<String, dynamic> receiving,
  TransactionLists lists,
) =>
    lists.crossModuleRulesReliable && canCreateOutslipFromReceiving(receiving, lists);

bool canApproveOutslip(Map<String, dynamic> row) => row['status']?.toString() == 'pending';

bool canDispatchOutslip(Map<String, dynamic> row) => row['status']?.toString() == 'approved';

bool userIsAdmin(Map<String, dynamic>? user) => user?['role']?.toString() == 'admin';

bool canApproveOutslipForUser(Map<String, dynamic> row, Map<String, dynamic>? user) =>
    canApproveOutslip(row) && userIsAdmin(user);

bool canDispatchOutslipForUser(Map<String, dynamic> row, Map<String, dynamic>? user) =>
    canDispatchOutslip(row) && userIsAdmin(user);

bool canPrintGatePass(Map<String, dynamic> row) {
  final status = row['status']?.toString() ?? '';
  return status == 'approved' || status == 'for_dispatch' || status == 'released';
}

bool isGatePassExited(Map<String, dynamic> document) =>
    (document['status']?.toString() ?? '').toLowerCase() == 'exited';

bool canEditGatePass(Map<String, dynamic> document, {bool offline = false}) =>
    !offline && !isGatePassExited(document);

bool canMarkGatePassExited(Map<String, dynamic> document, {bool offline = false}) =>
    !offline && !isGatePassExited(document);

Map<String, dynamic> buildGatePassPayload({
  required String destination,
  required String driverName,
  required String plateNo,
  required String vehicleNo,
  required String remarks,
}) =>
    {
      'destination': destination.trim(),
      'driverName': driverName.trim(),
      'plateNo': plateNo.trim(),
      'vehicleNo': vehicleNo.trim(),
      'remarks': remarks.trim(),
    };

Map<String, dynamic> mergeGatePassDocument(
  Map<String, dynamic> document,
  Map<String, dynamic> payload,
) =>
    {
      ...document,
      ...payload,
    };

String gatePassEditBlockedMessage({bool offline = false}) => offline
    ? 'Offline — reconnect to save gate pass details.'
    : 'This gate pass can no longer be edited.';

String gatePassExitBlockedMessage({bool offline = false}) => offline
    ? 'Offline — reconnect to mark this gate pass as exited.'
    : 'This gate pass has already been marked as exited.';

bool isOutslipReadyForDr(String? status) {
  final value = (status ?? '').toLowerCase();
  return value == 'for_dispatch' || value == 'released';
}

bool hasDrForOutslip(Map<String, dynamic> outslip, TransactionLists lists) {
  final osDb = fieldDbId(outslip);
  final osNo = outslip['id']?.toString();
  return lists.deliveryReceipts.any(
    (row) =>
        _idsMatch(row['referenceOutslipDbId'], osDb) ||
        _idsMatch(row['referenceOutslipId'], osNo),
  );
}

bool canCreateDrFromOutslip(Map<String, dynamic> outslip, TransactionLists lists) =>
    isOutslipReadyForDr(outslip['status']?.toString()) && !hasDrForOutslip(outslip, lists);

bool canMarkDeliveryOut(Map<String, dynamic> row) => row['status']?.toString() == 'active';

bool canMarkDeliveryOutWithSerials(Map<String, dynamic> row) =>
    canMarkDeliveryOut(row) && deliverySerialsComplete(row);

bool canMarkDeliveryDelivered(Map<String, dynamic> row) {
  final status = row['status']?.toString() ?? '';
  return status == 'active' || status == 'out_for_delivery';
}

int deliveryLineSerialCount(Map<String, dynamic> item) {
  final serials = item['serialNumbers'];
  if (serials is List) {
    return serials
        .where((value) => value?.toString().trim().isNotEmpty == true)
        .length;
  }
  final brandSerial = item['brandSerial']?.toString();
  if (brandSerial != null && brandSerial.trim().isNotEmpty) {
    return brandSerial
        .split(',')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .length;
  }
  return 0;
}

({int needed, int captured, bool complete}) deliveryLineSerialProgress(
  Map<String, dynamic> item,
) {
  final qty = item['quantity'];
  final needed = qty is num ? qty.round().clamp(0, 999999) : 0;
  final captured = deliveryLineSerialCount(item);
  return (
    needed: needed,
    captured: captured,
    complete: needed == 0 || captured >= needed,
  );
}

bool deliverySerialsComplete(Map<String, dynamic> delivery) {
  return deliveryOverallSerialProgress(delivery).complete;
}

({int needed, int captured, bool complete}) deliveryOverallSerialProgress(
  Map<String, dynamic> delivery,
) {
  final items = delivery['items'];
  if (items is! List || items.isEmpty) {
    return (needed: 0, captured: 0, complete: true);
  }

  var needed = 0;
  var captured = 0;
  for (final entry in items) {
    if (entry is! Map) continue;
    final progress = deliveryLineSerialProgress(Map<String, dynamic>.from(entry));
    needed += progress.needed;
    captured += progress.captured.clamp(0, progress.needed);
  }

  return (
    needed: needed,
    captured: captured,
    complete: needed == 0 || captured >= needed,
  );
}

bool canMarkDeliveryDeliveredWithSerials(Map<String, dynamic> row) =>
    canMarkDeliveryDelivered(row) && deliverySerialsComplete(row);

bool deliverySerialsPending(Map<String, dynamic> row) =>
    canMarkDeliveryDelivered(row) && !deliverySerialsComplete(row);

bool canScanDeliverySerials(Map<String, dynamic> row, {bool offline = false}) {
  if (offline) return false;
  return row['status']?.toString() == 'active';
}

bool canUpdateDeliveryStatus(Map<String, dynamic> delivery, String nextStatus) {
  switch (nextStatus) {
    case 'out_for_delivery':
      return canMarkDeliveryOutWithSerials(delivery);
    case 'delivered':
      return canMarkDeliveryDeliveredWithSerials(delivery);
    default:
      return false;
  }
}

String deliverySerialsBlockedMessage() =>
    'Capture serial numbers for every line item before marking delivered.';

bool hasBillingForDelivery(Map<String, dynamic> delivery, TransactionLists lists) {
  final drDb = fieldDbId(delivery);
  final drNo = delivery['id']?.toString();
  return lists.billings.any(
    (row) => _idsMatch(row['referenceDrDbId'], drDb) || _idsMatch(row['referenceDrId'], drNo),
  );
}

bool canCreateBillingFromDelivery(Map<String, dynamic> delivery, TransactionLists lists) =>
    delivery['status']?.toString() == 'delivered' && !hasBillingForDelivery(delivery, lists);

bool canRecordBillingPayment(Map<String, dynamic> row) =>
    row['paymentStatus']?.toString() != 'paid';

bool canApproveAccomplishment(Map<String, dynamic> row) {
  final status = row['status']?.toString() ?? '';
  return status != 'approved' && status != 'inactive';
}

bool canEditAccomplishment(Map<String, dynamic> row) {
  final status = row['status']?.toString() ?? '';
  return status != 'approved' && status != 'inactive';
}
