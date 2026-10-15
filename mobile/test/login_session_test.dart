import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:rts_erp_mobile/screens/login_page.dart';
import 'package:rts_erp_mobile/services/api_client.dart';
import 'package:rts_erp_mobile/state/auth_state.dart';

void main() {
  testWidgets('login page shows session expiry message from auth state', (tester) async {
    final api = ApiClient();
    final auth = AuthState(api);
    auth.handleSessionExpired('Session expired. Please sign in again.');

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<AuthState>.value(
          value: auth,
          child: const LoginPage(),
        ),
      ),
    );

    expect(find.text('Session expired. Please sign in again.'), findsOneWidget);
  });
}
