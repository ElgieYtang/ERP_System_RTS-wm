import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/navigation/mobile_modules.dart';
import 'package:rts_erp_mobile/services/home_counts.dart';

void main() {
  group('computeHomeModuleCounts', () {
    test('counts pending quotations and open purchase orders', () {
      final counts = computeHomeModuleCounts(
        quotations: [
          {'status': 'pending'},
          {'status': 'approved'},
        ],
        purchaseOrders: [
          {'status': 'approved'},
          {'status': 'fully_received'},
          {'status': 'cancelled'},
        ],
        receivings: const [],
        outslips: const [],
        deliveryReceipts: const [],
        billings: const [],
        accomplishments: const [],
      );

      expect(counts[MobileModule.quotations], 1);
      expect(counts[MobileModule.purchaseOrders], 1);
    });

    test('includes DR-ready outslips in outslip count', () {
      final counts = computeHomeModuleCounts(
        quotations: const [],
        purchaseOrders: const [],
        receivings: const [],
        outslips: [
          {'dbId': '1', 'id': 'OS-00001', 'status': 'for_dispatch'},
        ],
        deliveryReceipts: const [],
        billings: const [],
        accomplishments: const [],
      );

      expect(counts[MobileModule.outslips], 1);
    });

    test('counts active deliveries and unpaid billing', () {
      final counts = computeHomeModuleCounts(
        quotations: const [],
        purchaseOrders: const [],
        receivings: const [],
        outslips: const [],
        deliveryReceipts: [
          {'status': 'active'},
          {'status': 'delivered'},
        ],
        billings: [
          {'paymentStatus': 'unpaid'},
          {'paymentStatus': 'paid'},
        ],
        accomplishments: [
          {'status': 'pending'},
        ],
      );

      expect(counts[MobileModule.deliveries], 1);
      expect(counts[MobileModule.billing], 1);
      expect(counts[MobileModule.accomplishments], 1);
    });
  });
}
