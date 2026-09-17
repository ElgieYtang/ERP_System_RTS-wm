import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/screens/outslips_page.dart';
import 'package:rts_erp_mobile/services/api_client.dart';

void main() {
  testWidgets('offline outslip detail shows notice and hides workflow buttons', (tester) async {
    final api = ApiClient();

    await tester.pumpWidget(
      MaterialApp(
        home: OutslipDetailPage(
          api: api,
          offline: true,
          outslip: const {
            'id': 'OS-00001',
            'dbId': '1',
            'status': 'approved',
            'customerName': 'Customer A',
            'items': [],
          },
          workflowNotice: 'Offline — reconnect to update this record.',
        ),
      ),
    );

    expect(find.text('Offline — reconnect to update this record.'), findsOneWidget);
    expect(find.text('Approve outslip'), findsNothing);
    expect(find.text('Mark for dispatch'), findsNothing);
    expect(find.text('Gate pass'), findsOneWidget);
  });
}
