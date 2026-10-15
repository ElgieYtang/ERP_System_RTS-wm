<?php

namespace App\Http\Resources;

use App\Models\SetupBranch;
use App\Models\SetupBrand;
use App\Models\SetupCategory;
use App\Models\SetupCompany;
use App\Models\SetupCustomer;
use App\Models\SetupItem;
use App\Models\SetupModel;
use App\Models\SetupPosition;
use App\Models\SetupProject;
use App\Models\SetupSupplier;
use App\Models\SetupUnitMeasure;
use App\Models\SetupUser;
use App\Support\InventoryStock;
use App\Support\SetupStatus;
use Illuminate\Database\Eloquent\Model;

class SetupPresenter
{
    public static function present(string $resource, Model $model): array
    {
        return match ($resource) {
            'companies' => self::company($model),
            'branches' => self::branch($model),
            'users' => self::user($model),
            'positions' => self::position($model),
            'projects' => self::project($model),
            'categories' => self::category($model),
            'brands' => self::brand($model),
            'models' => self::modelRecord($model),
            'units' => self::unit($model),
            'items' => self::item($model),
            'suppliers' => self::supplier($model),
            'customers' => self::customer($model),
            default => $model->toArray(),
        };
    }

    /** @param  iterable<Model>  $models */
    public static function collection(string $resource, iterable $models): array
    {
        $stockByItemId = $resource === 'items' ? InventoryStock::quantitiesByItemId() : null;

        return collect($models)
            ->map(function (Model $model) use ($resource, $stockByItemId) {
                if ($resource === 'items' && $model instanceof SetupItem) {
                    return self::item($model, $stockByItemId);
                }

                return self::present($resource, $model);
            })
            ->values()
            ->all();
    }

    private static function company(SetupCompany $company): array
    {
        return [
            'id' => (string) $company->id,
            'name' => $company->name,
            'address' => $company->address,
            'contactNo' => $company->contact_no,
            'tinNo' => $company->tin_no,
            'status' => SetupStatus::toFrontend($company->status),
        ];
    }

    private static function branch(SetupBranch $branch): array
    {
        return [
            'id' => (string) $branch->id,
            'companyId' => (string) $branch->company_id,
            'companyName' => $branch->company?->name ?? '',
            'name' => $branch->name,
            'status' => SetupStatus::toFrontend($branch->status),
        ];
    }

    private static function user(SetupUser $user): array
    {
        $position = SetupPosition::query()->find($user->position_id);

        return [
            'id' => 'USR-'.str_pad((string) $user->id, 3, '0', STR_PAD_LEFT),
            'dbId' => (string) $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'type' => strtoupper((string) $user->type),
            'positionId' => (string) ($user->position_id ?: ''),
            'position' => $position?->name ?? '—',
            'status' => SetupStatus::toFrontend($user->status),
        ];
    }

    private static function position(SetupPosition $position): array
    {
        return [
            'id' => (string) $position->id,
            'name' => $position->name,
            'status' => SetupStatus::toFrontend($position->status),
        ];
    }

    private static function project(SetupProject $project): array
    {
        return [
            'id' => (string) $project->id,
            'name' => $project->name,
            'address' => $project->address,
            'status' => SetupStatus::toFrontend($project->status),
        ];
    }

    private static function category(SetupCategory $category): array
    {
        return [
            'id' => (string) $category->id,
            'code' => 'CAT-'.str_pad((string) $category->id, 3, '0', STR_PAD_LEFT),
            'name' => $category->name,
            'status' => SetupStatus::toFrontend($category->status),
        ];
    }

    private static function brand(SetupBrand $brand): array
    {
        return [
            'id' => (string) $brand->id,
            'code' => 'BRD-'.str_pad((string) $brand->id, 3, '0', STR_PAD_LEFT),
            'name' => $brand->name,
            'status' => SetupStatus::toFrontend($brand->status),
        ];
    }

    private static function modelRecord(SetupModel $model): array
    {
        return [
            'id' => (string) $model->id,
            'brandId' => (string) $model->brand_id,
            'brand' => $model->brand?->name ?? '',
            'name' => $model->name,
            'status' => SetupStatus::toFrontend($model->status),
        ];
    }

    private static function unit(SetupUnitMeasure $unit): array
    {
        return [
            'id' => (string) $unit->id,
            'code' => 'UOM-'.str_pad((string) $unit->id, 3, '0', STR_PAD_LEFT),
            'name' => $unit->name,
            'status' => SetupStatus::toFrontend($unit->status),
        ];
    }

    private static function item(SetupItem $item, ?array $stockByItemId = null): array
    {
        $stock = $stockByItemId !== null
            ? (float) ($stockByItemId[(int) $item->id] ?? 0)
            : InventoryStock::quantityForItem((int) $item->id);

        return [
            'id' => (string) $item->id,
            'code' => 'ITM-'.str_pad((string) $item->id, 4, '0', STR_PAD_LEFT),
            'brandId' => (string) $item->brand_id,
            'brand' => $item->brand?->name ?? '',
            'modelId' => (string) $item->model_id,
            'model' => $item->model?->name ?? '',
            'name' => $item->item_name,
            'barcode' => $item->barcode ?? '',
            'unitId' => (string) ($item->unit_measure_id ?? ''),
            'unit' => $item->unitMeasure?->name ?? '',
            'stock' => $stock,
            'stockStatus' => InventoryStock::statusLabel($stock),
            'status' => SetupStatus::toFrontend($item->status),
        ];
    }

    private static function supplier(SetupSupplier $supplier): array
    {
        return [
            'id' => (string) $supplier->id,
            'code' => 'SUP-'.str_pad((string) $supplier->id, 3, '0', STR_PAD_LEFT),
            'name' => $supplier->name,
            'address' => $supplier->address,
            'tinNo' => $supplier->tin_no,
            'contact' => $supplier->contact_person,
            'phone' => $supplier->contact_person_no,
            'status' => SetupStatus::toFrontend($supplier->status),
        ];
    }

    private static function customer(SetupCustomer $customer): array
    {
        return [
            'id' => (string) $customer->id,
            'code' => 'CUS-'.str_pad((string) $customer->id, 3, '0', STR_PAD_LEFT),
            'name' => $customer->name,
            'address' => $customer->address,
            'tin' => $customer->tin_no,
            'terms' => $customer->terms !== null ? (string) $customer->terms : '',
            'termsType' => $customer->terms_type ?? 'IN DAYS',
            'status' => SetupStatus::toFrontend($customer->status),
        ];
    }
}
