import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rts_erp_mobile/screens/gate_pass_page.dart';
import 'package:rts_erp_mobile/services/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('offline gate pass load error shows connect message', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: GatePassPage(
          api: ApiClient(),
          offline: true,
          outslip: const {
            'id': 'OS-00001',
            'dbId': 'no-cache',
            'status': 'approved',
          },
        ),
      ),
    );

    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 100));
      if (find.text(GatePassPage.offlineLoadMessage).evaluate().isNotEmpty) break;
    }

    expect(find.text(GatePassPage.offlineLoadMessage), findsWidgets);
  });
}
