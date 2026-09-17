import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/api_errors.dart';
import '../services/offline_cache.dart';
import '../navigation/mobile_modules.dart';
import '../navigation/transaction_detail_host.dart';
import '../navigation/transaction_navigation.dart';
import '../services/transaction_actions.dart';
import '../services/transaction_lists.dart';
import '../widgets/field_ui.dart';
import '../widgets/print_document_button.dart';
import '../widgets/transaction_workflows.dart';

class DeliveriesPage extends StatefulWidget {
  const DeliveriesPage({super.key, required this.api});

  final ApiClient api;

  @override
  State<DeliveriesPage> createState() => _DeliveriesPageState();
}

class _DeliveriesPageState extends State<DeliveriesPage> {
  bool _loading = true;
  bool _fromCache = false;
  String? _busyId;
  String? _error;
  String? _offlineLabel;
  String _filter = 'active';
  List<Map<String, dynamic>> _rows = [];
  TransactionLists _lists = const TransactionLists();

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<Map<String, dynamic>> get _visible {
    switch (_filter) {
      case 'active':
        return _rows
            .where((r) => r['status'] == 'active' || r['status'] == 'out_for_delivery')
            .toList();
      case 'delivered':
        return _rows.where((r) => r['status'] == 'delivered').toList();
      default:
        return _rows;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _fromCache = false;
      _offlineLabel = null;
    });
    try {
      final results = await Future.wait([
        widget.api.getList('/delivery-receipts'),
        TransactionLists.load(widget.api),
      ]);
      final data = results[0] as List<dynamic>;
      final lists = results[1] as TransactionLists;
      await OfflineCache.saveList(OfflineCache.deliveries, data);
      if (!mounted) return;
      setState(() {
        _rows = data.cast<Map<String, dynamic>>();
        _lists = lists;
        _loading = false;
      });
    } catch (error) {
      final cached = await OfflineCache.loadList(OfflineCache.deliveries);
      final lists = await TransactionLists.fromCache();
      if (!mounted) return;
      if (cached.rows.isNotEmpty) {
        setState(() {
          _rows = cached.rows;
          _lists = lists;
          _fromCache = true;
          _offlineLabel = OfflineCache.staleLabel(cached.savedAt);
          _error = friendlyApiError(error);
          _loading = false;
        });
      } else {
        setState(() {
          _error = friendlyApiError(error);
          _loading = false;
        });
      }
    }
  }

  Future<void> _setStatus(Map<String, dynamic> row, String status) async {
    if (_fromCache) {
      fieldShowOfflineBlocked(context);
      return;
    }

    final id = row['dbId']?.toString() ?? row['id']?.toString();
    if (id == null || _busyId != null) return;
    if (!canUpdateDeliveryStatus(row, status)) return;

    setState(() => _busyId = id);
    try {
      final updated = await updateDeliveryStatus(context, widget.api, row, status);
      if (updated != null) await _load();
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _createBilling(Map<String, dynamic> row, {bool popCurrentRoute = false}) async {
    if (_fromCache) {
    fieldShowOfflineBlocked(context);
      return;
    }
    final id = fieldDbId(row);
    if (id.isEmpty || _busyId != null) return;
    if (!canCreateBillingFromDelivery(row, _lists)) return;
    setState(() => _busyId = id);
    try {
      final created = await confirmCreateBilling(context, widget.api, row);
      if (created != null) {
        await _load();
        if (!mounted) return;
        await openCreatedTransaction(
          context,
          widget.api,
          MobileModule.billing,
          created,
          popCurrentRoute: popCurrentRoute,
        );
      }
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _rows.isEmpty && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final visible = _visible;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        children: [
          FieldFilterBar(
            value: _filter,
            options: const [
              (id: 'active', label: 'Active'),
              (id: 'delivered', label: 'Delivered'),
              (id: 'all', label: 'All'),
            ],
            onChanged: (value) => setState(() => _filter = value),
          ),
          if (_fromCache && _offlineLabel != null) FieldOfflineBanner(label: _offlineLabel!),
          if (_error != null && !_fromCache) FieldErrorBanner(message: _error!, onRetry: _load),
          if (visible.isEmpty && (_error == null || _fromCache))
            FieldEmptyState(
              icon: Icons.local_shipping_outlined,
              title: _filter == 'active' ? 'No active deliveries' : 'No deliveries',
            ),
          ...visible.map((row) {
            final id = row['dbId']?.toString() ?? row['id']?.toString() ?? '';
            final status = row['status']?.toString() ?? '';
            final itemCount = (row['items'] as List<dynamic>? ?? const []).length;
            final busy = _busyId == id;
            final showOut = canMarkDeliveryOut(row);
            final showDelivered = canMarkDeliveryDelivered(row);
            final showBilling =
                _lists.crossModuleRulesReliable && canCreateBillingFromDelivery(row, _lists);

            return Card(
              child: InkWell(
                onTap: () async {
                  await pushTransactionDetail(
                    context,
                    widget.api,
                    MobileModule.deliveries,
                    row,
                    offline: _fromCache,
                  );
                  await _load();
                },
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              row['id']?.toString() ?? 'DR',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                            ),
                          ),
                          FieldStatusChip(status),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(row['customerName']?.toString().isNotEmpty == true
                          ? row['customerName'].toString()
                          : 'Customer —'),
                      Text(
                        '${row['displayDate'] ?? row['date'] ?? '—'} · '
                        'Outslip: ${row['referenceOutslipId'] ?? '—'} · '
                        '$itemCount item(s)',
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (showOut)
                            FilledButton(
                              onPressed: busy || _fromCache
                                  ? null
                                  : () => _setStatus(row, 'out_for_delivery'),
                              child: Text(busy ? 'Updating…' : 'Out for delivery'),
                            ),
                          if (showDelivered)
                            FilledButton.tonal(
                              onPressed:
                                  busy || _fromCache ? null : () => _setStatus(row, 'delivered'),
                              child: const Text('Mark delivered'),
                            ),
                          if (showBilling)
                            FilledButton(
                              onPressed: busy || _fromCache ? null : () => _createBilling(row),
                              child: Text(busy ? 'Working…' : 'Create billing'),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class DeliveryDetailPage extends StatelessWidget {
  const DeliveryDetailPage({
    super.key,
    required this.api,
    required this.delivery,
    this.popAfterMutations = true,
    this.onSetStatus,
    this.onCreateBilling,
    this.workflowNotice,
    this.workflowNoticeLoading = false,
  });

  final ApiClient api;
  final Map<String, dynamic> delivery;
  final bool popAfterMutations;
  final Future<void> Function(String status)? onSetStatus;
  final Future<void> Function()? onCreateBilling;
  final String? workflowNotice;
  final bool workflowNoticeLoading;

  @override
  Widget build(BuildContext context) {
    final status = delivery['status']?.toString() ?? '';
    final items = (delivery['items'] as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final customer = delivery['customerName']?.toString().isNotEmpty == true
        ? delivery['customerName'].toString()
        : 'Customer —';

    return FieldDetailScaffold(
      title: delivery['id']?.toString() ?? 'Delivery',
      subtitle: customer,
      status: status,
      workflowNotice: workflowNotice,
      workflowNoticeLoading: workflowNoticeLoading,
      secondaryActions: [
        PrintDocumentButton(
          onPrint: () => printDeliveryReceipt(context, api, delivery),
          label: 'Print PDF',
        ),
      ],
      primaryActions: [
        if (onSetStatus != null && canMarkDeliveryOut(delivery))
          FilledButton(
            onPressed: () async {
              await onSetStatus!('out_for_delivery');
              if (popAfterMutations && context.mounted) Navigator.pop(context);
            },
            child: const Text('Out for delivery'),
          ),
        if (onSetStatus != null && canMarkDeliveryDelivered(delivery))
          FilledButton.tonal(
            onPressed: () async {
              await onSetStatus!('delivered');
              if (popAfterMutations && context.mounted) Navigator.pop(context);
            },
            child: const Text('Mark delivered'),
          ),
        if (onCreateBilling != null)
          FilledButton(
            onPressed: () async => onCreateBilling!(),
            child: const Text('Create billing'),
          ),
      ],
      children: [
        FieldDetailMeta(
          rows: [
            (label: 'Date', value: '${delivery['displayDate'] ?? delivery['date'] ?? '—'}'),
            (label: 'Outslip', value: '${delivery['referenceOutslipId'] ?? '—'}'),
            if (delivery['total'] != null)
              (label: 'Total', value: '${delivery['total']}'),
          ],
        ),
        const SizedBox(height: 16),
        const FieldSectionTitle('Line items'),
        FieldLineItems(items: items),
      ],
    );
  }
}
