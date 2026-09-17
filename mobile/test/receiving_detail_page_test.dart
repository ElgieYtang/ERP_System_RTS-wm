import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/screens/receivings_page.dart';

void main() {
  testWidgets('shows create outslip only when callback is provided', (tester) async {
    final completed = {
      'id': 'RCV-00001',
      'dbId': '1',
      'status': 'completed',
      'customerId': '10',
      'supplierName': 'Supplier A',
      'items': const [],
    };

    await tester.pumpWidget(
      MaterialApp(
        home: ReceivingDetailPage(
          receivingId: '1',
          initial: completed,
          onCreateOutslip: () async {},
        ),
      ),
    );

    expect(find.text('Create outslip'), findsOneWidget);
    expect(find.text('View outslip'), findsNothing);
  });

  testWidgets('shows view outslip instead of create when linked outslip exists', (tester) async {
    final completed = {
      'id': 'RCV-00002',
      'dbId': '2',
      'status': 'completed',
      'customerId': '10',
      'supplierName': 'Supplier A',
      'items': const [],
    };

    await tester.pumpWidget(
      MaterialApp(
        home: ReceivingDetailPage(
          receivingId: '2',
          initial: completed,
          onViewOutslip: () async {},
        ),
      ),
    );

    expect(find.text('View outslip'), findsOneWidget);
    expect(find.text('Create outslip'), findsNothing);
  });

  testWidgets('shows customer requirement message when quotation customer is missing', (tester) async {
    final completed = {
      'id': 'RCV-00003',
      'dbId': '3',
      'status': 'completed',
      'supplierName': 'Supplier A',
      'items': const [],
    };

    await tester.pumpWidget(
      MaterialApp(
        home: ReceivingDetailPage(
          receivingId: '3',
          initial: completed,
        ),
      ),
    );

    expect(find.textContaining('quotation customer'), findsOneWidget);
    expect(find.text('Create outslip'), findsNothing);
  });

  testWidgets('shows workflow loading notice when provided', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ReceivingDetailPage(
          receivingId: '1',
          initial: const {
            'id': 'RCV-00004',
            'status': 'completed',
            'supplierName': 'Supplier A',
            'items': [],
          },
          workflowNotice: 'Loading workflow actions…',
          workflowNoticeLoading: true,
        ),
      ),
    );

    expect(find.text('Loading workflow actions…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('offline notice hides workflow buttons when callbacks are omitted', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ReceivingDetailPage(
          receivingId: '1',
          initial: const {
            'id': 'RCV-00005',
            'status': 'pending',
            'supplierName': 'Supplier A',
            'items': [],
          },
          workflowNotice: 'Offline — reconnect to update this record.',
        ),
      ),
    );

    expect(find.text('Offline — reconnect to update this record.'), findsOneWidget);
    expect(find.text('Confirm receiving'), findsNothing);
    expect(find.text('Create outslip'), findsNothing);
  });
}
