<?php

use App\Models\User;

class ReturnTypeHelper
{
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

    public function exampleStatic(): static
    {
        return $this;
    }

    public function exampleModel(): User
    {
        return new User();
    }

    public function exmpleWithoutType()
    {
        return [];
    }

    public function exampleAnotherMissing()
    {
        return "missing";
    }
}
