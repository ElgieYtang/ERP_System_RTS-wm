import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rts_erp_mobile/services/offline_cache.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });
  test('gate pass cache round-trips document by outslip ref', () async {
    const ref = '42';
    const document = {
      'gatePassNo': 'GP-00042',
      'destination': 'Site A',
      'items': [],
    };

    await OfflineCache.saveGatePass(ref, document);
    final loaded = await OfflineCache.loadGatePass(ref);

    expect(loaded.data?['gatePassNo'], 'GP-00042');
    expect(loaded.data?['destination'], 'Site A');
    expect(loaded.savedAt, isNotNull);
  });

  test('soa report cache key includes customer and date range', () async {
    expect(
      OfflineCache.soaReportKey('5', from: '2026-01-01', to: '2026-01-31'),
      'rc_cache_soa_5_2026-01-01_2026-01-31',
    );
  });
}
