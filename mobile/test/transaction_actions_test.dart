import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/services/transaction_actions.dart';
import 'package:rts_erp_mobile/services/transaction_lists.dart';

TransactionLists _lists({
  List<Map<String, dynamic>> purchaseOrders = const [],
  List<Map<String, dynamic>> receivings = const [],
  List<Map<String, dynamic>> outslips = const [],
  List<Map<String, dynamic>> deliveryReceipts = const [],
  List<Map<String, dynamic>> billings = const [],
  bool crossModuleRulesReliable = true,
}) {
  return TransactionLists(
    purchaseOrders: purchaseOrders,
    receivings: receivings,
    outslips: outslips,
    deliveryReceipts: deliveryReceipts,
    billings: billings,
    crossModuleRulesReliable: crossModuleRulesReliable,
  );
}

void main() {
  group('canReceivePurchaseOrder', () {
    test('blocks fully received or cancelled POs', () {
      expect(
        canReceivePurchaseOrder({'status': 'fully_received'}, _lists()),
        isFalse,
      );
      expect(
        canReceivePurchaseOrder({'status': 'cancelled'}, _lists()),
        isFalse,
      );
    });

    test('blocks when an open receiving already exists', () {
      final po = {'dbId': '3', 'id': 'PO-00003', 'status': 'approved'};
      final lists = _lists(
        receivings: [
          {'purchaseOrderDbId': '3', 'status': 'pending'},
        ],
      );

      expect(canReceivePurchaseOrder(po, lists), isFalse);
    });

    test('allows approved PO without receiving', () {
      final po = {'dbId': '3', 'id': 'PO-00003', 'status': 'approved'};
      expect(canReceivePurchaseOrder(po, _lists()), isTrue);
    });
  });

  group('canConfirmReceiving', () {
    test('allows non-completed receivings', () {
      expect(canConfirmReceiving({'status': 'pending'}), isTrue);
      expect(canConfirmReceiving({'status': 'completed'}), isFalse);
    });
  });

  group('outslip admin actions', () {
    test('approve and dispatch require admin role', () {
      const row = {'status': 'pending'};
      const admin = {'role': 'admin'};
      const staff = {'role': 'staff'};

      expect(canApproveOutslipForUser(row, admin), isTrue);
      expect(canApproveOutslipForUser(row, staff), isFalse);
      expect(
        canDispatchOutslipForUser({'status': 'approved'}, admin),
        isTrue,
      );
      expect(
        canDispatchOutslipForUser({'status': 'approved'}, staff),
        isFalse,
      );
    });
  });

  group('canCreateOutslipFromReceiving', () {
    test('allows completed receiving with quotation customer and no outslip', () {
      final receiving = {
        'dbId': '5',
        'status': 'completed',
        'customerId': '12',
      };
      final lists = _lists();

      expect(canCreateOutslipFromReceiving(receiving, lists), isTrue);
    });

    test('blocks open receiving', () {
      final receiving = {
        'dbId': '5',
        'status': 'pending',
        'customerId': '12',
      };

      expect(canCreateOutslipFromReceiving(receiving, _lists()), isFalse);
    });

    test('blocks when quotation customer is missing', () {
      final receiving = {
        'dbId': '5',
        'status': 'completed',
      };

      expect(canCreateOutslipFromReceiving(receiving, _lists()), isFalse);
    });

    test('blocks when outslip already exists for receiving', () {
      final receiving = {
        'dbId': '5',
        'status': 'completed',
        'customerId': '12',
      };
      final lists = _lists(
        outslips: [
          {'dbId': '9', 'receivingId': '5'},
        ],
      );

      expect(canCreateOutslipFromReceiving(receiving, lists), isFalse);
      expect(findOutslipForReceiving(receiving, lists)?['dbId'], '9');
    });
  });

  group('canCreateOutslipFromReceivingSafe', () {
    test('requires reliable cross-module cache', () {
      final receiving = {
        'dbId': '5',
        'status': 'completed',
        'customerId': '12',
      };
      final lists = _lists(crossModuleRulesReliable: false);

      expect(canCreateOutslipFromReceiving(receiving, lists), isTrue);
      expect(canCreateOutslipFromReceivingSafe(receiving, lists), isFalse);
    });
  });

  group('canCreateDrFromOutslip', () {
    test('allows for_dispatch and released without existing DR', () {
      final outslip = {'dbId': '7', 'id': 'OS-00007', 'status': 'for_dispatch'};
      final lists = _lists();

      expect(canCreateDrFromOutslip(outslip, lists), isTrue);
      expect(canCreateDrFromOutslip({...outslip, 'status': 'released'}, lists), isTrue);
    });

    test('blocks pending or approved outslips', () {
      final lists = _lists();
      expect(
        canCreateDrFromOutslip({'dbId': '7', 'status': 'pending'}, lists),
        isFalse,
      );
      expect(
        canCreateDrFromOutslip({'dbId': '7', 'status': 'approved'}, lists),
        isFalse,
      );
    });

    test('blocks when delivery receipt already exists', () {
      final outslip = {'dbId': '7', 'id': 'OS-00007', 'status': 'for_dispatch'};
      final lists = _lists(
        deliveryReceipts: [
          {'referenceOutslipDbId': '7', 'id': 'DR-00001'},
        ],
      );

      expect(canCreateDrFromOutslip(outslip, lists), isFalse);
    });
  });

  group('gate pass rules', () {
    test('canPrintGatePass for approved, for_dispatch, and released', () {
      expect(canPrintGatePass({'status': 'approved'}), isTrue);
      expect(canPrintGatePass({'status': 'for_dispatch'}), isTrue);
      expect(canPrintGatePass({'status': 'released'}), isTrue);
      expect(canPrintGatePass({'status': 'pending'}), isFalse);
    });

    test('canEditGatePass and canMarkGatePassExited respect exited and offline', () {
      const openDoc = {'status': 'open'};
      const exitedDoc = {'status': 'exited'};

      expect(canEditGatePass(openDoc), isTrue);
      expect(canMarkGatePassExited(openDoc), isTrue);
      expect(canEditGatePass(exitedDoc), isFalse);
      expect(canMarkGatePassExited(exitedDoc), isFalse);
      expect(canEditGatePass(openDoc, offline: true), isFalse);
    });

    test('buildGatePassPayload trims fields and mergeGatePassDocument overlays form', () {
      final payload = buildGatePassPayload(
        destination: ' Site A ',
        driverName: ' Juan ',
        plateNo: ' ABC123 ',
        vehicleNo: ' Truck 1 ',
        remarks: ' Handle with care ',
      );

      expect(payload['destination'], 'Site A');
      expect(payload['driverName'], 'Juan');

      final merged = mergeGatePassDocument(
        {'gatePassNo': 'GP-00001', 'destination': 'Old'},
        payload,
      );
      expect(merged['gatePassNo'], 'GP-00001');
      expect(merged['destination'], 'Site A');
    });
  });

  group('quotation conversion rules', () {
    test('canConvertQuotation only when approved and no PO exists', () {
      final quotation = {'id': 'QTN-00001', 'dbId': '1', 'status': 'approved'};
      expect(canConvertQuotation(quotation, _lists()), isTrue);
      expect(
        canConvertQuotation(
          quotation,
          _lists(
            purchaseOrders: [
              {'referenceQuotationId': 'QTN-00001'},
            ],
          ),
        ),
        isFalse,
      );
    });

    test('canCancelQuotation blocks when PO already exists', () {
      final quotation = {'id': 'QTN-00002', 'dbId': '2', 'status': 'approved'};
      final lists = _lists(
        purchaseOrders: [
          {'referenceQuotationNo': 'QTN-00002'},
        ],
      );

      expect(canCancelQuotation(quotation, lists), isFalse);
    });
  });

  group('delivery and billing rules', () {
    test('canCreateBillingFromDelivery requires delivered status without billing', () {
      final delivery = {'dbId': '3', 'id': 'DR-00003', 'status': 'delivered'};
      expect(canCreateBillingFromDelivery(delivery, _lists()), isTrue);
      expect(
        canCreateBillingFromDelivery({...delivery, 'status': 'active'}, _lists()),
        isFalse,
      );
      expect(
        canCreateBillingFromDelivery(
          delivery,
          _lists(billings: [
            {'referenceDrId': 'DR-00003'},
          ]),
        ),
        isFalse,
      );
    });

    test('canRecordBillingPayment only for unpaid or partially paid', () {
      expect(canRecordBillingPayment({'paymentStatus': 'unpaid'}), isTrue);
      expect(canRecordBillingPayment({'paymentStatus': 'partially_paid'}), isTrue);
      expect(canRecordBillingPayment({'paymentStatus': 'paid'}), isFalse);
    });

    test('canMarkDeliveryDeliveredWithSerials requires serial count to match qty', () {
      final delivery = {
        'status': 'active',
        'items': [
          {
            'productId': '1',
            'quantity': 2,
            'serialNumbers': ['SN-001'],
          },
        ],
      };

      expect(canMarkDeliveryDelivered(delivery), isTrue);
      expect(canMarkDeliveryDeliveredWithSerials(delivery), isFalse);
      expect(deliverySerialsPending(delivery), isTrue);

      final complete = {
        ...delivery,
        'items': [
          {
            'productId': '1',
            'quantity': 2,
            'serialNumbers': ['SN-001', 'SN-002'],
          },
        ],
      };
      expect(canMarkDeliveryDeliveredWithSerials(complete), isTrue);
      expect(deliverySerialsPending(complete), isFalse);
    });

    test('canScanDeliverySerials only while active (warehouse)', () {
      expect(canScanDeliverySerials({'status': 'active'}), isTrue);
      expect(
        canScanDeliverySerials({
          'status': 'out_for_delivery',
          'items': [
            {'productId': '1', 'quantity': 1, 'serialNumbers': []},
          ],
        }),
        isFalse,
      );
      expect(canScanDeliverySerials({'status': 'delivered'}), isFalse);
      expect(canScanDeliverySerials({'status': 'active'}, offline: true), isFalse);
    });

    test('canMarkDeliveryOutWithSerials requires complete serials', () {
      final incomplete = {
        'status': 'active',
        'items': [
          {'productId': '1', 'quantity': 1, 'serialNumbers': []},
        ],
      };
      expect(canMarkDeliveryOut(incomplete), isTrue);
      expect(canMarkDeliveryOutWithSerials(incomplete), isFalse);

      final complete = {
        'status': 'active',
        'items': [
          {'productId': '1', 'quantity': 1, 'serialNumbers': ['SN-1']},
        ],
      };
      expect(canMarkDeliveryOutWithSerials(complete), isTrue);
    });

    test('canUpdateDeliveryStatus blocks delivered when serials incomplete', () {
      final delivery = {
        'status': 'out_for_delivery',
        'items': [
          {'productId': '1', 'quantity': 1, 'serialNumbers': []},
        ],
      };

      expect(canUpdateDeliveryStatus(delivery, 'out_for_delivery'), isFalse);

      final activeIncomplete = {
        'status': 'active',
        'items': [
          {'productId': '1', 'quantity': 1, 'serialNumbers': []},
        ],
      };
      expect(canUpdateDeliveryStatus(activeIncomplete, 'out_for_delivery'), isFalse);
      expect(canUpdateDeliveryStatus(delivery, 'delivered'), isFalse);
    });
  });
}
