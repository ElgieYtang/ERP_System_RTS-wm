import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rts_erp_mobile/screens/gate_pass_page.dart';
import 'package:rts_erp_mobile/services/api_client.dart';
import 'package:rts_erp_mobile/services/offline_cache.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('offline gate pass loads from cache when available', (tester) async {
    await OfflineCache.saveGatePass('99', const {
      'gatePassNo': 'GP-00099',
      'customerName': 'Customer A',
      'destination': 'Site A',
      'items': [],
    });

    await tester.pumpWidget(
      MaterialApp(
        home: GatePassPage(
          api: ApiClient(),
          offline: true,
          outslip: const {
            'id': 'OS-00099',
            'dbId': '99',
            'status': 'approved',
          },
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('GP-00099'), findsWidgets);
    expect(find.text('Site A'), findsOneWidget);
  });
}
