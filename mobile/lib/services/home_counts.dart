import '../navigation/mobile_modules.dart';
import 'transaction_actions.dart';
import 'transaction_lists.dart';

Map<MobileModule, int> computeHomeModuleCounts({
  required List<dynamic> quotations,
  required List<dynamic> purchaseOrders,
  required List<dynamic> receivings,
  required List<dynamic> outslips,
  required List<dynamic> deliveryReceipts,
  required List<dynamic> billings,
  required List<dynamic> accomplishments,
}) {
  final lists = TransactionLists(
    outslips: outslips.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList(),
    deliveryReceipts:
        deliveryReceipts.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList(),
  );

  return {
    MobileModule.quotations: quotations.where((r) => r is Map && r['status'] == 'pending').length,
    MobileModule.purchaseOrders: purchaseOrders
        .where((r) => r is Map && r['status'] != 'fully_received' && r['status'] != 'cancelled')
        .length,
    MobileModule.receiving:
        receivings.where((r) => r is Map && r['status'] != 'completed').length,
    MobileModule.outslips: _countOpenOutslips(outslips, lists),
    MobileModule.deliveries: deliveryReceipts
        .where(
          (r) => r is Map && (r['status'] == 'active' || r['status'] == 'out_for_delivery'),
        )
        .length,
    MobileModule.billing:
        billings.where((r) => r is Map && r['paymentStatus'] != 'paid').length,
    MobileModule.soa: 0,
    MobileModule.accomplishments:
        accomplishments.where((r) => r is Map && r['status'] == 'pending').length,
  };
}

int _countOpenOutslips(List<dynamic> rows, TransactionLists lists) {
  var count = 0;
  for (final row in rows) {
    if (row is! Map) continue;
    final map = Map<String, dynamic>.from(row);
    final status = map['status']?.toString() ?? '';
    if (status == 'pending' || status == 'approved') {
      count++;
    } else if (canCreateDrFromOutslip(map, lists)) {
      count++;
    }
  }
  return count;
}
