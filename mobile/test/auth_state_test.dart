import 'package:flutter_test/flutter_test.dart';
import 'package:rts_erp_mobile/services/api_client.dart';
import 'package:rts_erp_mobile/state/auth_state.dart';

void main() {
  test('handleSessionExpired clears authenticated state and sets error', () {
    final api = ApiClient();
    final auth = AuthState(api);

    api.onSessionExpired = auth.handleSessionExpired;

    api.onSessionExpired!.call('Session expired. Please sign in again.');

    expect(auth.isAuthenticated, isFalse);
    expect(auth.error, 'Session expired. Please sign in again.');
    expect(auth.busy, isFalse);
    expect(auth.bootstrapping, isFalse);
  });
}
