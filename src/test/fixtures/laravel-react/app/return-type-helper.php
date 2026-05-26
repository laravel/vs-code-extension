<?php

use App\Models\User;
use Illuminate\Http\BinaryFileResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\View;

$returnTypeFixture = new class {
    public function __construct()
    {
    }

    public function exmple(): array
    {
        return [];
    }

    public function exampleInt(): int
    {
        return 1;
    }

    public function exampleString(): string
    {
        return "test";
    }

    public function exampleUnion(): string|array
    {
        return [];
    }

    public function exampleMixed(): mixed
    {
        return [];
    }

    public function exampleNullable(): ?string
    {
        return null;
    }

    public function exampleIntersection(): Countable&Traversable
    {
        return new ArrayIterator([]);
    }

    public function exampleModel(): User
    {
        return new User();
    }

    public function exampleJsonResponse(): JsonResponse
    {
        return Response::json(['message' => 'test']);
    }

    public function exampleRedirectResponse(): RedirectResponse
    {
        return back()->with(['type' => 'success', 'message' => 'done']);
    }

    public function exampleStreamedResponse(): StreamedResponse
    {
        return Response::stream(function () {
            echo "stream";
        });
    }

    public function exampleBinaryFileResponse(): BinaryFileResponse
    {
        return Response::file(__FILE__);
    }

    public function exampleViewResponse(): \Illuminate\View\View
    {
        return View::make('welcome');
    }

    public function exampleHttpResponse(): HttpResponse
    {
        return response()->noContent();
    }

    public function exampleCollection(): Collection
    {
        return collect([]);
    }

    public function exampleLengthAwarePaginator(): LengthAwarePaginator
    {
        return User::query()->paginate();
    }

    public function examplePaginator(): Paginator
    {
        return User::query()->simplePaginate();
    }

    public function exampleCursorPaginator(): CursorPaginator
    {
        return User::query()->cursorPaginate();
    }

    public function exampleRouteString(): string
    {
        return route('home');
    }

    public function exmpleWithoutType()
    {
        return [];
    }

    public function exampleAnotherMissing()
    {
        return "missing";
    }

    public function exampleJsonResponseMissing()
    {
        return Response::json(['message' => 'test']);
    }

    public function exampleRedirectResponseMissing()
    {
        return back()->with(['type' => 'success', 'message' => 'done']);
    }

    public function exampleStreamedResponseMissing()
    {
        return Response::stream(function () {
            echo "stream";
        });
    }

    public function exampleBinaryFileResponseMissing()
    {
        return Response::file(__FILE__);
    }

    public function exampleViewResponseMissing()
    {
        return View::make('welcome');
    }

    public function exampleHttpResponseMissing()
    {
        return response()->noContent();
    }

    public function exampleCollectionMissing()
    {
        return collect([]);
    }

    public function exampleLengthAwarePaginatorMissing()
    {
        return User::query()->paginate();
    }

    public function examplePaginatorMissing()
    {
        return User::query()->simplePaginate();
    }

    public function exampleCursorPaginatorMissing()
    {
        return User::query()->cursorPaginate();
    }

    public function exampleRouteStringMissing()
    {
        return route('home');
    }
};
