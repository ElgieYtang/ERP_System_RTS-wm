import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/navigation/transaction_detail_host.dart';
import 'package:rts_erp_mobile/widgets/field_ui.dart';

void main() {
  group('transactionDetailWorkflowNotice', () {
    test('shows loading copy while linked lists load', () {
      expect(
        transactionDetailWorkflowNotice(
          loadingLists: true,
          offline: false,
          crossModuleRulesReliable: true,
        ),
        'Checking linked records…',
      );
    });

    test('shows offline copy when detail opened from cache', () {
      expect(
        transactionDetailWorkflowNotice(
          loadingLists: false,
          offline: true,
          crossModuleRulesReliable: true,
        ),
        'Offline — reconnect to update this record.',
      );
    });

    test('shows partial cache copy when cross-module rules are unreliable', () {
      expect(
        transactionDetailWorkflowNotice(
          loadingLists: false,
          offline: false,
          crossModuleRulesReliable: false,
        ),
        partialCacheWorkflowMessage,
      );
    });

    test('returns null when online with reliable linked lists', () {
      expect(
        transactionDetailWorkflowNotice(
          loadingLists: false,
          offline: false,
          crossModuleRulesReliable: true,
        ),
        isNull,
      );
    });
  });
}
