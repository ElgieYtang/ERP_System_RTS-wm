<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PaginatedJson
{
    /**
     * @param  Builder  $query
     * @param  callable(mixed): array  $mapper
     */
    public static function respond(Request $request, Builder $query, callable $mapper): JsonResponse
    {
        if ($request->boolean('all')) {
            $rows = $query->get()->map($mapper)->values();

            return response()->json([
                'data' => $rows,
                'meta' => [
                    'total' => $rows->count(),
                    'page' => 1,
                    'perPage' => $rows->count(),
                    'totalPages' => 1,
                    'all' => true,
                ],
            ]);
        }

        $perPage = min(max((int) $request->query('per_page', 10), 1), 100);
        $page = max((int) $request->query('page', 1), 1);

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($paginator->items())->map($mapper)->values(),
            'meta' => [
                'total' => $paginator->total(),
                'page' => $paginator->currentPage(),
                'perPage' => $paginator->perPage(),
                'totalPages' => $paginator->lastPage(),
            ],
        ]);
    }
}
