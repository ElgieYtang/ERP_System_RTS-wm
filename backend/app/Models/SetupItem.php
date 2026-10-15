<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SetupItem extends Model
{
    protected $table = 'setup_items';

    public $timestamps = false;

    protected $fillable = [
        'brand_id',
        'model_id',
        'item_name',
        'barcode',
        'unit_measure_id',
        'status',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(SetupBrand::class, 'brand_id');
    }

    public function model(): BelongsTo
    {
        return $this->belongsTo(SetupModel::class, 'model_id');
    }

    public function unitMeasure(): BelongsTo
    {
        return $this->belongsTo(SetupUnitMeasure::class, 'unit_measure_id');
    }
}
