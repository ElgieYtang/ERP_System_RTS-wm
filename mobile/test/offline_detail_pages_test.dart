import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/screens/billing_page.dart';
import 'package:rts_erp_mobile/screens/deliveries_page.dart';
import 'package:rts_erp_mobile/screens/purchase_orders_page.dart';
import 'package:rts_erp_mobile/screens/quotations_page.dart';
import 'package:rts_erp_mobile/services/api_client.dart';

const _offlineNotice = 'Offline — reconnect to update this record.';

void main() {
  testWidgets('offline purchase order detail hides receive items and print', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: PurchaseOrderDetailPage(
          api: ApiClient(),
          order: const {
            'id': 'PO-00001',
            'status': 'approved',
            'supplierName': 'Supplier A',
            'items': [],
          },
          canReceive: true,
          offline: true,
          workflowNotice: _offlineNotice,
        ),
      ),
    );

    expect(find.text(_offlineNotice), findsOneWidget);
    expect(find.text('Receive items'), findsNothing);
    expect(find.widgetWithText(OutlinedButton, 'Print PDF'), findsOneWidget);
    final printButton = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Print PDF'),
    );
    expect(printButton.onPressed, isNull);
  });

  testWidgets('offline quotation detail hides workflow buttons', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: QuotationDetailPage(
          api: ApiClient(),
          quotation: const {
            'id': 'QTN-00001',
            'status': 'pending',
            'customerName': 'Customer A',
            'items': [],
          },
          workflowNotice: _offlineNotice,
        ),
      ),
    );

    expect(find.text(_offlineNotice), findsOneWidget);
    expect(find.text('Approve'), findsNothing);
    expect(find.text('Convert to PO'), findsNothing);
    expect(find.text('Cancel quotation'), findsNothing);
    expect(find.text('Edit'), findsNothing);
  });

  testWidgets('offline delivery detail hides status and billing actions', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: DeliveryDetailPage(
          api: ApiClient(),
          delivery: const {
            'id': 'DR-00001',
            'status': 'pending',
            'customerName': 'Customer A',
            'items': [],
          },
          workflowNotice: _offlineNotice,
        ),
      ),
    );

    expect(find.text(_offlineNotice), findsOneWidget);
    expect(find.text('Out for delivery'), findsNothing);
    expect(find.text('Mark delivered'), findsNothing);
    expect(find.text('Create billing'), findsNothing);
  });

  testWidgets('offline billing detail hides record payment', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BillingDetailPage(
          billing: const {
            'id': 'BS-00001',
            'paymentStatus': 'unpaid',
            'customerName': 'Customer A',
            'total': 1000,
            'paidAmount': 0,
          },
          workflowNotice: _offlineNotice,
        ),
      ),
    );

    expect(find.text(_offlineNotice), findsOneWidget);
    expect(find.text('Record payment'), findsNothing);
  });
}
