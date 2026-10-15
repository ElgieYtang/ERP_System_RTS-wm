<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SetupPresenter;
use App\Models\SetupItem;
use App\Support\LegacyPassword;
use App\Support\SetupStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SetupController extends Controller
{
    public function index(string $resource): JsonResponse
    {
        $config = $this->config($resource);
        $modelClass = $config['model'];

        $query = $modelClass::query();

        if ($resource === 'branches') {
            $query->with('company');
        }

        if ($resource === 'models') {
            $query->with('brand');
        }

        if ($resource === 'items') {
            $query->with(['brand', 'model', 'unitMeasure']);
        }

        $records = $query->orderBy('id')->get();

        return response()->json([
            'data' => SetupPresenter::collection($resource, $records),
        ]);
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        $payload = $this->validatePayload($request, $resource, false);
        $modelClass = $this->config($resource)['model'];

        /** @var Model $record */
        $record = $modelClass::query()->create($payload);

        $record = $this->reload($resource, $record);

        return response()->json([
            'message' => 'Record created successfully.',
            'data' => SetupPresenter::present($resource, $record),
        ], 201);
    }

    public function update(Request $request, string $resource, string $id): JsonResponse
    {
        $record = $this->find($resource, $id);
        $payload = $this->validatePayload($request, $resource, true, $record);
        $record->fill($payload)->save();

        $record = $this->reload($resource, $record->fresh());

        return response()->json([
            'message' => 'Record updated successfully.',
            'data' => SetupPresenter::present($resource, $record),
        ]);
    }

    public function destroy(string $resource, string $id): JsonResponse
    {
        $record = $this->find($resource, $id);
        $record->forceFill(['status' => SetupStatus::toDb('Inactive')])->save();

        return response()->json([
            'message' => 'Record deactivated successfully.',
        ]);
    }

    public function showItemByBarcode(string $barcode): JsonResponse
    {
        $code = trim($barcode);
        if ($code === '') {
            return response()->json([
                'message' => 'Barcode is required.',
            ], 422);
        }

        $item = SetupItem::query()
            ->with(['brand', 'model', 'unitMeasure'])
            ->whereRaw('LOWER(TRIM(barcode)) = ?', [strtolower($code)])
            ->where('status', SetupStatus::toDb('Active'))
            ->first();

        if (! $item) {
            return response()->json([
                'message' => 'No item found for this barcode.',
            ], 404);
        }

        return response()->json([
            'data' => SetupPresenter::present('items', $item),
        ]);
    }

    private function config(string $resource): array
    {
        $resources = config('erp_setup', []);
        $config = $resources[$resource] ?? null;

        if (! $config) {
            abort(404, 'Setup resource not found.');
        }

        return $config;
    }

    private function find(string $resource, string $id): Model
    {
        $modelClass = $this->config($resource)['model'];
        $numericId = $this->resolveNumericId($resource, $id);

        return $modelClass::query()->findOrFail($numericId);
    }

    private function resolveNumericId(string $resource, string $id): int
    {
        if (is_numeric($id)) {
            return (int) $id;
        }

        if ($resource === 'users' && preg_match('/^USR-(\d+)$/i', $id, $matches)) {
            return (int) $matches[1];
        }

        abort(422, 'Invalid record identifier.');
    }

    private function reload(string $resource, Model $record): Model
    {
        if ($resource === 'branches') {
            return $record->load('company');
        }

        if ($resource === 'models') {
            return $record->load('brand');
        }

        if ($resource === 'items') {
            return $record->load(['brand', 'model', 'unitMeasure']);
        }

        return $record;
    }

    private function validatePayload(Request $request, string $resource, bool $isUpdate, ?Model $record = null): array
    {
        $rules = $this->rules($resource, $isUpdate, $record);
        $validated = Validator::make($request->all(), $rules)->validate();

        return $this->mapToDatabase($resource, $validated, $isUpdate);
    }

    private function rules(string $resource, bool $isUpdate, ?Model $record): array
    {
        return match ($resource) {
            'companies' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
                'address' => [$isUpdate ? 'sometimes' : 'required', 'string'],
                'contactNo' => ['nullable', 'string', 'max:255'],
                'tinNo' => ['nullable', 'string', 'max:255'],
            ],
            'branches' => [
                'companyId' => [$isUpdate ? 'sometimes' : 'required', 'integer', Rule::exists('setup_company', 'id')],
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            ],
            'users' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string'],
                'username' => [
                    $isUpdate ? 'sometimes' : 'required',
                    'string',
                    'max:255',
                    Rule::unique('setup_users', 'username')->ignore($record?->id),
                ],
                'password' => [$isUpdate ? 'nullable' : 'required', 'string', 'min:6'],
                'type' => [$isUpdate ? 'sometimes' : 'required', Rule::in(['ADMIN', 'USER'])],
                'positionId' => ['nullable', 'integer', Rule::exists('setup_position', 'id')],
            ],
            'positions' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            ],
            'projects' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string'],
                'address' => ['nullable', 'string'],
            ],
            'categories' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            ],
            'brands' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            ],
            'models' => [
                'brandId' => [$isUpdate ? 'sometimes' : 'required', 'integer', Rule::exists('setup_brand', 'id')],
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            ],
            'units' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            ],
            'items' => [
                'brandId' => [$isUpdate ? 'sometimes' : 'required', 'integer', Rule::exists('setup_brand', 'id')],
                'modelId' => [$isUpdate ? 'sometimes' : 'required', 'integer', Rule::exists('setup_model', 'id')],
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string'],
                'barcode' => [
                    'nullable',
                    'string',
                    'max:64',
                    Rule::unique('setup_items', 'barcode')->ignore($record?->id),
                ],
                'unitId' => ['nullable', 'integer', Rule::exists('setup_unit_measure', 'id')],
            ],
            'suppliers' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string'],
                'address' => ['nullable', 'string'],
                'tinNo' => ['nullable', 'string', 'max:255'],
                'contact' => ['nullable', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:255'],
            ],
            'customers' => [
                'name' => [$isUpdate ? 'sometimes' : 'required', 'string'],
                'address' => ['nullable', 'string'],
                'tin' => ['nullable', 'string', 'max:255'],
                'terms' => ['nullable', 'numeric', 'min:0'],
                'termsType' => ['nullable', 'string', 'max:20'],
            ],
            default => abort(404, 'Setup resource not found.'),
        };
    }

    private function mapToDatabase(string $resource, array $payload, bool $isUpdate): array
    {
        $mapped = match ($resource) {
            'companies' => array_filter([
                'name' => $payload['name'] ?? null,
                'address' => $payload['address'] ?? null,
                'contact_no' => $payload['contactNo'] ?? null,
                'tin_no' => $payload['tinNo'] ?? null,
            ], fn ($value) => $value !== null),
            'branches' => array_filter([
                'company_id' => isset($payload['companyId']) ? (int) $payload['companyId'] : null,
                'name' => $payload['name'] ?? null,
            ], fn ($value) => $value !== null),
            'users' => $this->mapUserPayload($payload, $isUpdate),
            'positions' => array_filter([
                'name' => $payload['name'] ?? null,
            ], fn ($value) => $value !== null),
            'projects' => array_filter([
                'name' => $payload['name'] ?? null,
                'address' => $payload['address'] ?? null,
            ], fn ($value) => $value !== null),
            'categories' => array_filter([
                'name' => $payload['name'] ?? null,
            ], fn ($value) => $value !== null),
            'brands' => array_filter([
                'name' => $payload['name'] ?? null,
            ], fn ($value) => $value !== null),
            'models' => array_filter([
                'brand_id' => isset($payload['brandId']) ? (int) $payload['brandId'] : null,
                'name' => $payload['name'] ?? null,
            ], fn ($value) => $value !== null),
            'units' => array_filter([
                'name' => $payload['name'] ?? null,
            ], fn ($value) => $value !== null),
            'items' => array_filter([
                'brand_id' => isset($payload['brandId']) ? (int) $payload['brandId'] : null,
                'model_id' => isset($payload['modelId']) ? (int) $payload['modelId'] : null,
                'item_name' => $payload['name'] ?? null,
                'barcode' => array_key_exists('barcode', $payload)
                    ? (($payload['barcode'] ?? '') !== '' ? trim((string) $payload['barcode']) : null)
                    : null,
                'unit_measure_id' => isset($payload['unitId']) && $payload['unitId'] !== ''
                    ? (int) $payload['unitId']
                    : null,
            ], fn ($value) => $value !== null),
            'suppliers' => array_filter([
                'name' => $payload['name'] ?? null,
                'address' => $payload['address'] ?? null,
                'tin_no' => $payload['tinNo'] ?? null,
                'contact_person' => $payload['contact'] ?? null,
                'contact_person_no' => $payload['phone'] ?? null,
            ], fn ($value) => $value !== null),
            'customers' => array_filter([
                'name' => $payload['name'] ?? null,
                'address' => $payload['address'] ?? null,
                'tin_no' => $payload['tin'] ?? null,
                'terms' => isset($payload['terms']) && $payload['terms'] !== ''
                    ? (int) $payload['terms']
                    : null,
                'terms_type' => $payload['termsType'] ?? null,
            ], fn ($value) => $value !== null),
            default => [],
        };

        if (! $isUpdate && $resource !== 'users') {
            $mapped['status'] = SetupStatus::toDb('Active');
        }

        return $mapped;
    }

    private function mapUserPayload(array $payload, bool $isUpdate): array
    {
        $mapped = array_filter([
            'name' => $payload['name'] ?? null,
            'username' => $payload['username'] ?? null,
            'type' => isset($payload['type']) ? strtoupper($payload['type']) : null,
            'position_id' => array_key_exists('positionId', $payload)
                ? ($payload['positionId'] !== '' ? (int) $payload['positionId'] : 0)
                : null,
        ], fn ($value) => $value !== null);

        if (! empty($payload['password'])) {
            $mapped['password'] = LegacyPassword::hash($payload['password']);
        }

        if (! $isUpdate) {
            $mapped['status'] = SetupStatus::toDb('Active');
        }

        return $mapped;
    }
}
