import * as fs from "fs";

export class Cache<K, V> {
    private maxSize: number;
    private cache: Map<K, V>;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);

        if (value !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, value);
        }

        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;

            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, value);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

export class BoundedFileCache {
    private cache = new Map<string, string>();
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: string): string | undefined {
        return this.cache.get(key);
    }

    set(key: string, filePath: string): void {
        if (this.cache.has(key)) {
            return;
        }

        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                const oldFilePath = this.cache.get(oldestKey);
                if (oldFilePath && fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch (e) {
                        // File might already be deleted, ignore
                    }
                }
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, filePath);
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    delete(key: string): void {
        const filePath = this.cache.get(key);

        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                // File might already be deleted, ignore
            }
        }

        this.cache.delete(key);
    }

    clear(): void {
        for (const [key] of this.cache.entries()) {
            this.delete(key);
        }

        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    deleteByFilePath(filePath: string): void {
        for (const [key, value] of this.cache.entries()) {
            if (value === filePath) {
                this.cache.delete(key);
                break;
            }
        }
    }
}
