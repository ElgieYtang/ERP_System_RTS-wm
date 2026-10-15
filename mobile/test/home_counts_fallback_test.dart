import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/navigation/mobile_modules.dart';
import 'package:rts_erp_mobile/services/home_counts.dart';
import 'package:rts_erp_mobile/widgets/field_ui.dart';

void main() {
  group('homeModuleCountsDiffer', () {
    test('returns false when all module counts match', () {
      final left = {
        MobileModule.quotations: 2,
        MobileModule.purchaseOrders: 1,
      };
      final right = {
        MobileModule.quotations: 2,
        MobileModule.purchaseOrders: 1,
      };

      expect(homeModuleCountsDiffer(left, right), isFalse);
    });

    test('returns true when any module count differs', () {
      final left = {MobileModule.outslips: 3};
      final right = {MobileModule.outslips: 1};

      expect(homeModuleCountsDiffer(left, right), isTrue);
    });
  });

  group('homeModuleCountsFromStats', () {
    test('maps cached summary keys to module counts', () {
      final counts = homeModuleCountsFromStats({
        MobileModule.quotations.name: 4,
        MobileModule.billing.name: 2,
      });

      expect(counts[MobileModule.quotations], 4);
      expect(counts[MobileModule.billing], 2);
      expect(counts[MobileModule.soa], 0);
    });
  });

  group('offline dashboard messages', () {
    test('approximate and mismatch messages are distinct', () {
      expect(approximateHomeCountsMessage, isNot(equals(homeCountsMismatchMessage)));
    });
  });
}
