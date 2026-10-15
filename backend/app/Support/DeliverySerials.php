<?php

namespace App\Support;

class DeliverySerials
{
    /**
     * @return list<string>
     */
    public static function decode(?string $raw): array
    {
        if ($raw === null || trim($raw) === '') {
            return [];
        }

        $trimmed = trim($raw);
        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map(
                    static fn ($value) => trim((string) $value),
                    $decoded,
                )));
            }
        }

        return array_values(array_filter(array_map(
            static fn ($part) => trim($part),
            explode(',', $raw),
        )));
    }

    /**
     * @param  list<string>  $serials
     */
    public static function encode(array $serials): string
    {
        $clean = array_values(array_filter(array_map(
            static fn ($value) => trim((string) $value),
            $serials,
        )));

        return implode(', ', $clean);
    }

    public static function formatForPrint(?string $raw): string
    {
        return self::encode(self::decode($raw));
    }

    /**
     * @param  iterable<\App\Models\DeliveryDetail>  $details
     */
    public static function deliveryComplete(iterable $details): bool
    {
        foreach ($details as $line) {
            $needed = (int) round((float) $line->qty);
            if ($needed <= 0) {
                continue;
            }

            if (count(self::decode($line->serial_no)) < $needed) {
                return false;
            }
        }

        return true;
    }
}
