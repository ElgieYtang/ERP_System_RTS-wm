<?php

namespace App\Support;

use App\Models\Billing;

class BillingAmounts
{
    public static function statementTotal(Billing $billing): float
    {
        $billing->loadMissing(['delivery.details']);

        $attrs = $billing->getAttributes();
        $stored = round((float) ($attrs['billing_total'] ?? $attrs['total'] ?? 0), 2);
        if ($stored > 0) {
            return $stored;
        }

        $delivery = $billing->delivery;
        if (! $delivery) {
            return 0.0;
        }

        $fromDr = round((float) ($delivery->dr_total ?? 0), 2);
        if ($fromDr > 0) {
            return $fromDr;
        }

        return round((float) $delivery->details->sum(fn ($line) => (float) $line->amount), 2);
    }

    public static function paidTotal(Billing $billing): float
    {
        $billing->loadMissing('payments');

        $fromPayments = round(
            (float) $billing->payments->sum(fn ($payment) => (float) $payment->amount),
            2
        );
        $fromColumn = round((float) ($billing->paid_amount ?? 0), 2);

        return max($fromPayments, $fromColumn);
    }

    public static function remainingDue(Billing $billing): float
    {
        return max(0, round(self::statementTotal($billing) - self::paidTotal($billing), 2));
    }

    /**
     * Keep stored billing_total / paid_amount aligned with delivery lines and payment rows.
     */
    public static function syncStoredTotals(Billing $billing): void
    {
        $total = self::statementTotal($billing);
        $paid = self::paidTotal($billing);

        $dirty = false;
        if ($total > 0 && round((float) ($billing->billing_total ?? 0), 2) !== $total) {
            $billing->billing_total = $total;
            $dirty = true;
        }
        if (round((float) ($billing->paid_amount ?? 0), 2) !== $paid) {
            $billing->paid_amount = $paid;
            $dirty = true;
        }

        if ($dirty) {
            $billing->save();
        }
    }
}
