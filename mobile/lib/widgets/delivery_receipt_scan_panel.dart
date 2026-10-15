import 'package:flutter/material.dart';

import '../navigation/app_navigation.dart';
import '../services/api_client.dart';
import '../services/api_errors.dart';
import '../services/transaction_actions.dart';
import '../theme/app_theme.dart';
import 'barcode_camera_scan_page.dart';
import 'field_ui.dart';
import 'print_document_button.dart';
import 'transaction_workflows.dart';

List<Map<String, dynamic>> cloneDeliveryItems(List<Map<String, dynamic>> items) {
  return items
      .map(
        (item) => {
          ...item,
          'serialNumbers': (item['serialNumbers'] as List<dynamic>? ?? const [])
              .map((value) => value.toString())
              .toList(),
        },
      )
      .toList();
}

/// Full delivery-receipt detail layout when serial scanning is active.
class DeliveryScanDetailView extends StatefulWidget {
  const DeliveryScanDetailView({
    super.key,
    required this.api,
    required this.delivery,
    required this.onSaved,
    this.popAfterMutations = true,
    this.onSetStatus,
    this.onCreateBilling,
    this.workflowNotice,
    this.workflowNoticeLoading = false,
    this.offline = false,
    this.onCloseScan,
  });

  final ApiClient api;
  final Map<String, dynamic> delivery;
  final ValueChanged<Map<String, dynamic>> onSaved;
  final bool popAfterMutations;
  final Future<void> Function(String status)? onSetStatus;
  final Future<void> Function()? onCreateBilling;
  final String? workflowNotice;
  final bool workflowNoticeLoading;
  final bool offline;
  final VoidCallback? onCloseScan;

  @override
  State<DeliveryScanDetailView> createState() => _DeliveryScanDetailViewState();
}

class _DeliveryScanDetailViewState extends State<DeliveryScanDetailView> {
  static const _bottomBarHeight = 88.0;

  late List<Map<String, dynamic>> _items;
  late Map<String, dynamic> _delivery;
  final _productController = TextEditingController();
  final _serialController = TextEditingController();
  final _serialFocus = FocusNode();
  int _activeIndex = 0;
  bool _saving = false;
  String? _error;
  bool _manualEntryExpanded = false;

  @override
  void initState() {
    super.initState();
    _delivery = Map<String, dynamic>.from(widget.delivery);
    _items = _deliveryItems(_delivery);
  }

  @override
  void didUpdateWidget(covariant DeliveryScanDetailView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.delivery != widget.delivery) {
      _delivery = Map<String, dynamic>.from(widget.delivery);
      _items = _deliveryItems(_delivery);
    }
  }

  List<Map<String, dynamic>> _deliveryItems(Map<String, dynamic> delivery) {
    return (delivery['items'] as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
  }

  @override
  void dispose() {
    _productController.dispose();
    _serialController.dispose();
    _serialFocus.dispose();
    super.dispose();
  }

  bool get _disabled => widget.offline || _saving;

  Map<String, dynamic>? get _activeLine =>
      _items.isEmpty ? null : _items[_activeIndex.clamp(0, _items.length - 1)];

  void _applyLocalItems(List<Map<String, dynamic>> nextItems) {
    _items = cloneDeliveryItems(nextItems);
    _delivery = {..._delivery, 'items': nextItems};
  }

  Future<void> _persistItems(List<Map<String, dynamic>> nextItems) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final updated = await updateDeliverySerials(widget.api, _delivery, nextItems);
      if (!mounted) return;
      if (updated == null) {
        setState(() {
          _items = cloneDeliveryItems(_deliveryItems(_delivery));
          _error = 'Could not save serial numbers.';
        });
        return;
      }
      final savedItems = (updated['items'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((entry) => Map<String, dynamic>.from(entry))
          .toList();
      final merged = Map<String, dynamic>.from(updated);
      if (savedItems.isNotEmpty) {
        merged['items'] = savedItems;
      } else {
        merged['items'] = nextItems;
      }
      setState(() {
        _delivery = merged;
        _items = cloneDeliveryItems(_deliveryItems(merged));
      });
      widget.onSaved(merged);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _items = cloneDeliveryItems(_deliveryItems(_delivery));
        _error = error is FormatException
            ? error.message
            : friendlyApiError(error);
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _selectProductWithCode(String code) async {
    if (_disabled) return;
    if (code.isEmpty) return;

    try {
      final item = await fetchSetupItemByBarcode(widget.api, code);
      if (!mounted) return;
      if (item == null) {
        setState(() => _error = 'Barcode not found.');
        return;
      }

      final index = _items.indexWhere(
        (line) => line['productId']?.toString() == item['id']?.toString(),
      );
      if (index < 0) {
        setState(
          () => _error = '${item['name'] ?? 'Item'} is not on this delivery receipt.',
        );
        return;
      }

      setState(() {
        _activeIndex = index;
        _error = null;
        _productController.clear();
      });
      _serialFocus.requestFocus();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = friendlyApiError(error));
    }
  }

  Future<void> _openProductCamera() async {
    if (_disabled) return;
    final code = await BarcodeCameraScanPage.scan(
      context,
      title: 'Scan product barcode',
      hint: 'Point at the barcode on the box or packaging.',
    );
    if (!mounted || code == null || code.isEmpty) return;
    await _selectProductWithCode(code);
  }

  int _resolveSerialLineIndex() {
    final active = _activeLine;
    if (active != null && !deliveryLineSerialProgress(active).complete) {
      return _activeIndex;
    }
    for (var index = 0; index < _items.length; index++) {
      if (!deliveryLineSerialProgress(_items[index]).complete) {
        return index;
      }
    }
    return -1;
  }

  Future<bool> _addSerialWithCode(String serial) async {
    if (_disabled) return false;

    if (serial.isEmpty) return true;

    final lineIndex = _resolveSerialLineIndex();
    if (lineIndex < 0) {
      setState(() {
        _error = 'All serial numbers are already captured.';
        _serialController.clear();
      });
      return false;
    }

    final line = _items[lineIndex];
    final progress = deliveryLineSerialProgress(line);
    if (progress.complete) {
      setState(() {
        _error = '${line['productName'] ?? 'Item'} already has all serial numbers captured.';
        _serialController.clear();
      });
      return false;
    }

    setState(() => _activeIndex = lineIndex);

    final nextItems = _items.asMap().entries.map((entry) {
      if (entry.key != lineIndex) return entry.value;
      final serials = [
        ...(entry.value['serialNumbers'] as List<dynamic>? ?? const [])
            .map((value) => value.toString()),
        serial,
      ];
      return {...entry.value, 'serialNumbers': serials};
    }).toList();

    setState(() {
      _applyLocalItems(nextItems);
      _serialController.clear();
      _error = null;
    });
    await _persistItems(nextItems);
    if (!mounted) return false;
    _serialFocus.requestFocus();
    final updatedLine = _activeLine;
    if (updatedLine == null) return false;
    return !deliveryLineSerialProgress(updatedLine).complete;
  }

  Future<void> _openSerialCamera() async {
    if (_disabled) return;
    final line = _activeLine;
    if (line == null) {
      setState(() => _error = 'Scan a product barcode first to choose a line.');
      return;
    }

    await BarcodeCameraScanPage.scanContinuous(
      context,
      title: 'Scan serial sticker',
      hint: '${line['productName'] ?? 'Item'} — scan each unit sticker.',
      onScan: _addSerialWithCode,
    );
  }

  Future<void> _removeSerial(int lineIndex, int serialIndex) async {
    if (_disabled) return;

    final nextItems = _items.asMap().entries.map((entry) {
      if (entry.key != lineIndex) return entry.value;
      final serials = [
        ...(entry.value['serialNumbers'] as List<dynamic>? ?? const [])
            .map((value) => value.toString()),
      ];
      if (serialIndex >= 0 && serialIndex < serials.length) {
        serials.removeAt(serialIndex);
      }
      return {...entry.value, 'serialNumbers': serials};
    }).toList();

    setState(() => _applyLocalItems(nextItems));
    await _persistItems(nextItems);
  }

  Future<void> _setStatus(String status) async {
    final handler = widget.onSetStatus;
    if (handler == null) return;
    await handler(status);
    if (widget.popAfterMutations && mounted) Navigator.pop(context);
  }

  Widget _buildProgressCard() {
    final overall = deliveryOverallSerialProgress({..._delivery, 'items': _items});
    final fraction = overall.needed == 0 ? 1.0 : overall.captured / overall.needed;

    return Card(
      color: AppTheme.maroonLight,
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  overall.complete ? Icons.check_circle_outline : Icons.qr_code_scanner,
                  color: overall.complete ? AppTheme.successText : AppTheme.maroon,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    overall.complete
                        ? 'All serial numbers captured'
                        : '${overall.captured} of ${overall.needed} units scanned',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
              ],
            ),
            if (overall.needed > 0) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: fraction.clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor: Colors.white,
                  color: overall.complete ? AppTheme.successText : AppTheme.maroon,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActiveLineHint() {
    final line = _activeLine;
    if (line == null) {
      return Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: AppTheme.maroon.withValues(alpha: 0.12),
            child: const Icon(Icons.inventory_2_outlined, color: AppTheme.maroon, size: 20),
          ),
          title: const Text('Choose a line', style: TextStyle(fontWeight: FontWeight.w600)),
          subtitle: const Text(
            'Scan the product barcode on the box to start capturing serial stickers.',
            style: TextStyle(height: 1.35),
          ),
        ),
      );
    }

    final progress = deliveryLineSerialProgress(line);
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.maroon, width: 1.5),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.maroon,
          child: Text(
            '${_activeIndex + 1}',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ),
        title: Text(
          line['productName']?.toString() ?? 'Item',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          progress.complete
              ? 'All ${progress.needed} serials captured'
              : 'Scan ${progress.needed - progress.captured} more serial sticker${progress.needed - progress.captured == 1 ? '' : 's'}',
          style: TextStyle(
            color: progress.complete ? AppTheme.successText : AppTheme.textSecondary,
            height: 1.35,
          ),
        ),
        trailing: progress.complete
            ? const Icon(Icons.check_circle, color: AppTheme.successText)
            : const Icon(Icons.chevron_right, color: AppTheme.maroon),
      ),
    );
  }

  Widget _buildManualEntry() {
    final activeLine = _activeLine;
    final activeProgress = activeLine == null ? null : deliveryLineSerialProgress(activeLine);

    return Card(
      margin: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
          childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          initiallyExpanded: _manualEntryExpanded,
          onExpansionChanged: (expanded) => setState(() => _manualEntryExpanded = expanded),
          leading: const Icon(Icons.keyboard_outlined, color: AppTheme.maroon, size: 22),
          title: const Text('Type instead', style: TextStyle(fontWeight: FontWeight.w600)),
          subtitle: const Text(
            'For a handheld scanner or manual entry',
            style: TextStyle(fontSize: 12),
          ),
          children: [
            TextField(
              controller: _productController,
              enabled: !_disabled,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Product barcode',
                hintText: 'Scan or type product barcode',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onSubmitted: (value) => _selectProductWithCode(value.trim()),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _serialController,
              focusNode: _serialFocus,
              enabled: !_disabled && activeLine != null,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: activeLine == null
                    ? 'Serial number'
                    : 'Serial — ${activeLine['productName'] ?? 'Item'} '
                        '(${activeProgress?.captured ?? 0}/${activeProgress?.needed ?? 0})',
                hintText: 'Scan or type serial sticker',
                border: const OutlineInputBorder(),
                isDense: true,
              ),
              onSubmitted: (value) => _addSerialWithCode(value.trim()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLineCard(int index) {
    final item = _items[index];
    final progress = deliveryLineSerialProgress(item);
    final serials = (item['serialNumbers'] as List<dynamic>? ?? const [])
        .map((value) => value.toString())
        .where((value) => value.trim().isNotEmpty)
        .toList();
    final active = index == _activeIndex;
    final qty = item['quantity'] ?? '—';

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: active ? AppTheme.maroon : AppTheme.border,
          width: active ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        onTap: _disabled ? null : () => setState(() => _activeIndex = index),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: active
                    ? AppTheme.maroon
                    : AppTheme.maroon.withValues(alpha: 0.12),
                child: Text(
                  '${index + 1}',
                  style: TextStyle(
                    color: active ? Colors.white : AppTheme.maroon,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['productName']?.toString() ?? 'Item',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Qty $qty · Serials ${progress.captured}/${progress.needed}',
                      style: TextStyle(
                        fontSize: 12,
                        color: progress.complete ? AppTheme.successText : AppTheme.textSecondary,
                      ),
                    ),
                    if (serials.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (var i = 0; i < serials.length; i++)
                            InputChip(
                              label: Text(serials[i], style: const TextStyle(fontSize: 11)),
                              visualDensity: VisualDensity.compact,
                              backgroundColor: AppTheme.maroonLight,
                              side: BorderSide.none,
                              onDeleted: _disabled ? null : () => _removeSerial(index, i),
                              deleteIconColor: AppTheme.errorText,
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              if (progress.complete)
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(Icons.check_circle, color: AppTheme.successText, size: 20),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget? _buildWorkflowActions() {
    final secondary = <Widget>[
      PrintDocumentButton(
        onPrint: () => printDeliveryReceipt(context, widget.api, _delivery),
        label: 'Print PDF',
        enabled: !widget.offline,
      ),
    ];
    final primary = <Widget>[
      if (widget.onSetStatus != null && canMarkDeliveryOutWithSerials(_delivery))
        FilledButton(
          onPressed: _saving ? null : () => _setStatus('out_for_delivery'),
          child: const Text('Out for delivery'),
        ),
      if (canMarkDeliveryOut(_delivery) && deliverySerialsPending(_delivery))
        Text(
          deliverySerialsBlockedMessage(),
          style: const TextStyle(color: AppTheme.warningText, height: 1.35),
        ),
      if (widget.onSetStatus != null && canMarkDeliveryDeliveredWithSerials(_delivery))
        FilledButton(
          onPressed: _saving ? null : () => _setStatus('delivered'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          child: const Text('Mark as delivered'),
        ),
      if (widget.onCreateBilling != null)
        FilledButton(
          onPressed: _saving ? null : () => widget.onCreateBilling!(),
          child: const Text('Create billing'),
        ),
    ];

    if (secondary.isEmpty && primary.isEmpty) return null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: FieldDetailActions(secondary: secondary, primary: primary),
      ),
    );
  }

  Widget _buildBottomBar() {
    final line = _activeLine;
    final canScanSerial = line != null && !deliveryLineSerialProgress(line).complete;

    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          border: Border(top: BorderSide(color: Colors.black.withValues(alpha: 0.08))),
        ),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_saving)
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: LinearProgressIndicator(minHeight: 3, color: AppTheme.maroon),
              ),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _disabled ? null : _openProductCamera,
                    icon: const Icon(Icons.inventory_2_outlined, size: 20),
                    label: const Text('Product'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _disabled || !canScanSerial ? null : _openSerialCamera,
                    icon: const Icon(Icons.qr_code_scanner, size: 20),
                    label: const Text('Serial'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final status = _delivery['status']?.toString() ?? '';
    final customer = _delivery['customerName']?.toString().isNotEmpty == true
        ? _delivery['customerName'].toString()
        : 'Customer —';
    final title = _delivery['id']?.toString() ?? 'Delivery';
    final workflowActions = _buildWorkflowActions();
    final showCaptureBar = status == 'active';
    final bottomPad = showCaptureBar ? _bottomBarHeight + 16.0 : 24.0;

    return Scaffold(
      appBar: transactionAppBar(
        context,
        title: title,
        showBack: true,
        onBack: widget.onCloseScan,
      ),
      bottomNavigationBar: showCaptureBar ? _buildBottomBar() : null,
      body: ListView(
        padding: EdgeInsets.fromLTRB(16, 16, 16, bottomPad),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          customer,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                          ),
                        ),
                      ),
                      if (status.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        FieldStatusChip(status),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  FieldDetailMeta(
                    rows: [
                      (label: 'Date', value: '${_delivery['displayDate'] ?? _delivery['date'] ?? '—'}'),
                      (label: 'Outslip', value: '${_delivery['referenceOutslipId'] ?? '—'}'),
                      if (_delivery['total'] != null)
                        (label: 'Total', value: '${_delivery['total']}'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          _buildProgressCard(),
          const SizedBox(height: 14),
          _buildActiveLineHint(),
          const SizedBox(height: 16),
          const FieldSectionTitle('Line items'),
          const SizedBox(height: 10),
          for (var index = 0; index < _items.length; index++) ...[
            if (index > 0) const SizedBox(height: 10),
            _buildLineCard(index),
          ],
          const SizedBox(height: 14),
          _buildManualEntry(),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Card(
              color: AppTheme.errorBg,
              margin: EdgeInsets.zero,
              child: ListTile(
                dense: true,
                leading: const Icon(Icons.error_outline, color: AppTheme.errorText),
                title: Text(
                  _error!,
                  style: const TextStyle(color: AppTheme.errorText, fontSize: 13, height: 1.35),
                ),
              ),
            ),
          ],
          if (widget.workflowNotice != null) ...[
            const SizedBox(height: 12),
            Card(
              color: AppTheme.maroonLight,
              child: ListTile(
                dense: true,
                leading: widget.workflowNoticeLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.maroon),
                      )
                    : const Icon(Icons.info_outline_rounded, color: AppTheme.maroon),
                title: Text(
                  widget.workflowNotice!,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.35),
                ),
              ),
            ),
          ],
          if (workflowActions != null) ...[
            const SizedBox(height: 12),
            workflowActions,
          ],
        ],
      ),
    );
  }
}
