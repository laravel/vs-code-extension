<?php

$pestConfig = new class {
    protected $expectations = [];
    protected $testCaseExtensions = [];
    protected $pestPhpPath = null;

    public function analyze()
    {
        $this->pestPhpPath = base_path('tests/Pest.php');

        if (!file_exists($this->pestPhpPath)) {
            return $this->result();
        }

        $content = file_get_contents($this->pestPhpPath);

        $this->parseExpectations($content);
        $this->parseTestCaseExtensions($content);

        return $this->result();
    }

    protected function parseExpectations(string $content): void
    {
        // Match expect()->extend('methodName', function ...)
        preg_match_all(
            "/expect\s*\(\s*\)\s*->\s*extend\s*\(\s*['\"]([^'\"]+)['\"]/",
            $content,
            $matches
        );

        if (!empty($matches[1])) {
            $this->expectations = array_values(array_unique($matches[1]));
        }
    }

    protected function parseTestCaseExtensions(string $content): void
    {
        // Match pest()->extend(Class::class) with optional ->use(Trait::class) and ->in('directory')
        preg_match_all(
            "/pest\s*\(\s*\)\s*->\s*extend\s*\(\s*([^)]+)\s*\)(?:\s*->\s*use\s*\(\s*([^)]+)\s*\))?(?:\s*->\s*in\s*\(\s*['\"]([^'\"]+)['\"]\s*\))?/",
            $content,
            $matches,
            PREG_SET_ORDER
        );

        foreach ($matches as $match) {
            $testCase = $this->resolveClassName(trim($match[1]));
            $traits = isset($match[2]) ? $this->parseTraits(trim($match[2])) : [];
            $directory = isset($match[3]) ? trim($match[3]) : null;

            if ($testCase) {
                $this->testCaseExtensions[] = [
                    'testCase' => $testCase,
                    'traits' => $traits,
                    'directory' => $directory,
                ];
            }
        }
    }

    protected function parseTraits(string $traitString): array
    {
        $traits = [];

        // Handle multiple traits separated by commas or chained ->use() calls
        $traitParts = preg_split('/\s*,\s*/', $traitString);

        foreach ($traitParts as $trait) {
            $resolved = $this->resolveClassName(trim($trait));
            if ($resolved) {
                $traits[] = $resolved;
            }
        }

        return $traits;
    }

    protected function resolveClassName(string $classRef): ?string
    {
        // Handle ::class syntax
        if (preg_match('/^([a-zA-Z_\\\\][a-zA-Z0-9_\\\\]*)::class$/', $classRef, $match)) {
            return $match[1];
        }

        // Handle quoted string
        if (preg_match('/^[\'"]([^\'"]+)[\'"]$/', $classRef, $match)) {
            return $match[1];
        }

        return null;
    }

    protected function result(): array
    {
        return [
            'hasPest' => $this->pestPhpPath !== null && file_exists($this->pestPhpPath),
            'expectations' => $this->expectations,
            'testCaseExtensions' => $this->testCaseExtensions,
        ];
    }
};

echo json_encode($pestConfig->analyze());
