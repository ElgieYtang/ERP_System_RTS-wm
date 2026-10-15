import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/services/transaction_actions.dart';

void main() {
  group('gate pass unsaved form snapshot', () {
    test('detects changed transport fields', () {
      final saved = buildGatePassPayload(
        destination: 'Site A',
        driverName: 'Juan',
        plateNo: 'ABC123',
        vehicleNo: 'Truck 1',
        remarks: '',
      );
      final edited = buildGatePassPayload(
        destination: 'Site B',
        driverName: 'Juan',
        plateNo: 'ABC123',
        vehicleNo: 'Truck 1',
        remarks: '',
      );

      expect(saved['destination'], isNot(edited['destination']));
    });
  });
}
