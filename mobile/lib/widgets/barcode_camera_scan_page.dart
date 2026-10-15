import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../theme/app_theme.dart';

/// Full-screen camera barcode scanner.
///
/// Single-scan mode pops with the first detected value.
/// Continuous mode keeps scanning and calls [onContinuousScan]; pop when it
/// returns false or the user taps Done.
class BarcodeCameraScanPage extends StatefulWidget {
  const BarcodeCameraScanPage({
    super.key,
    required this.title,
    this.hint,
    this.continuous = false,
    this.onContinuousScan,
  });

  final String title;
  final String? hint;
  final bool continuous;
  final Future<bool> Function(String value)? onContinuousScan;

  static Future<String?> scan(BuildContext context, {required String title, String? hint}) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => BarcodeCameraScanPage(title: title, hint: hint),
      ),
    );
  }

  static Future<void> scanContinuous(
    BuildContext context, {
    required String title,
    String? hint,
    required Future<bool> Function(String value) onScan,
  }) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => BarcodeCameraScanPage(
          title: title,
          hint: hint,
          continuous: true,
          onContinuousScan: onScan,
        ),
      ),
    );
  }

  @override
  State<BarcodeCameraScanPage> createState() => _BarcodeCameraScanPageState();
}

class _BarcodeCameraScanPageState extends State<BarcodeCameraScanPage> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  String? _lastValue;
  DateTime? _lastAt;
  String? _recentScan;
  bool _processing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool _isDuplicate(String value) {
    final now = DateTime.now();
    if (_lastValue == value &&
        _lastAt != null &&
        now.difference(_lastAt!) < const Duration(seconds: 2)) {
      return true;
    }
    _lastValue = value;
    _lastAt = now;
    return false;
  }

  Future<void> _handleDetect(BarcodeCapture capture) async {
    if (_processing) return;

    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value == null || value.isEmpty) continue;
      if (_isDuplicate(value)) return;

      if (!widget.continuous) {
        if (!mounted) return;
        Navigator.of(context).pop(value);
        return;
      }

      final handler = widget.onContinuousScan;
      if (handler == null) return;

      setState(() {
        _processing = true;
        _recentScan = value;
      });

      final keepScanning = await handler(value);
      if (!mounted) return;

      setState(() => _processing = false);
      if (!keepScanning) {
        Navigator.of(context).pop();
      }
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title),
        actions: [
          IconButton(
            tooltip: 'Toggle torch',
            onPressed: () => _controller.toggleTorch(),
            icon: const Icon(Icons.flash_on_outlined),
          ),
          if (widget.continuous)
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Done', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _handleDetect,
            errorBuilder: (context, error) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _cameraErrorMessage(error),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ),
          ),
          IgnorePointer(
            child: Center(
              child: Container(
                width: 260,
                height: 160,
                decoration: BoxDecoration(
                  border: Border.all(color: AppTheme.maroon, width: 3),
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              color: Colors.black54,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.hint ?? 'Align the barcode inside the frame.',
                    style: const TextStyle(color: Colors.white, height: 1.35),
                  ),
                  if (widget.continuous) ...[
                    const SizedBox(height: 8),
                    Text(
                      _processing
                          ? 'Saving…'
                          : _recentScan == null
                              ? 'Each scan adds a serial. Tap Done when finished.'
                              : 'Last scan: $_recentScan',
                      style: TextStyle(
                        color: _processing ? AppTheme.brandOrange : Colors.white70,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _cameraErrorMessage(MobileScannerException error) {
    switch (error.errorCode) {
      case MobileScannerErrorCode.permissionDenied:
        return 'Camera permission is required to scan barcodes. Enable it in device settings.';
      case MobileScannerErrorCode.unsupported:
        return 'Camera scanning is not supported on this device.';
      default:
        return 'Could not open the camera. ${error.errorDetails?.message ?? ''}'.trim();
    }
  }
}
