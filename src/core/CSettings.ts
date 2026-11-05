/** Namespaced JSON settings backed by localStorage.
 * Storage errors switch this instance to an in-memory cache of values already
 * read or written. Those changes last for this instance's lifetime only.
 * Pass null as storage to explicitly use memory (also the default outside browsers).
 */
export class CSettings {
    #m_namespace: string;
    #m_storage: Storage | null;
    #m_cache = new Map<string, string>();

    constructor(namespace: string, storage: Storage | null = CSettings.#browserStorage()) {
        if (namespace.trim() === "") throw new RangeError("Settings namespace must not be empty.");
        this.#m_namespace = namespace;
        this.#m_storage = storage;
    }

    /** Whether this instance still uses persistent storage. Access errors turn this off. */
    isPersistent(): boolean { return this.#m_storage !== null; }

    /** Reads JSON or returns null when absent/corrupt. */
    value(key: string): unknown;
    /** The caller supplies the expected type; JSON content is not schema-validated. */
    value<T>(key: string, defaultValue: T): T;
    value(key: string, defaultValue: unknown = null): unknown {
        const raw = this.#read(key);
        if (raw === null) return defaultValue;
        try { return JSON.parse(raw) as unknown; }
        catch { return defaultValue; }
    }

    /** Stores an independent JSON snapshot. Invalid/non-JSON values throw before
     * changing anything; storage failures are handled by the memory fallback. */
    setValue(key: string, value: unknown): void {
        const raw = JSON.stringify(value, (_key, item: unknown) => {
            if (typeof item === "undefined" || typeof item === "function" ||
                typeof item === "symbol" || typeof item === "bigint" ||
                (typeof item === "number" && !Number.isFinite(item)))
                throw new TypeError("Settings values must be finite JSON data.");
            if (item !== null && typeof item === "object" && !Array.isArray(item)) {
                const prototype: unknown = Object.getPrototypeOf(item);
                if (prototype !== Object.prototype && prototype !== null)
                    throw new TypeError("Settings values must be JSON objects or arrays.");
            }
            return item;
        });
        if (raw === undefined) throw new TypeError("Settings value is not JSON data.");
        const storageKey = this.#key(key);
        if (this.#m_storage !== null) {
            try { this.#m_storage.setItem(storageKey, raw); }
            catch { this.#m_storage = null; }
        }
        this.#m_cache.set(storageKey, raw);
    }

    /** Includes stored null and false; corrupted JSON counts as an existing key. */
    contains(key: string): boolean { return this.#read(key) !== null; }

    remove(key: string): void {
        const storageKey = this.#key(key);
        if (this.#m_storage !== null) {
            try { this.#m_storage.removeItem(storageKey); }
            catch { this.#m_storage = null; }
        }
        this.#m_cache.delete(storageKey);
    }

    #read(key: string): string | null {
        const storageKey = this.#key(key);
        if (this.#m_storage !== null) {
            try {
                const raw = this.#m_storage.getItem(storageKey);
                if (raw === null) this.#m_cache.delete(storageKey);
                else this.#m_cache.set(storageKey, raw);
                return raw;
            } catch { this.#m_storage = null; }
        }
        return this.#m_cache.get(storageKey) ?? null;
    }

    #key(key: string): string {
        // A tuple avoids collisions even when names or keys contain separators.
        return "ct-settings:" + JSON.stringify([this.#m_namespace, key]);
    }

    static #browserStorage(): Storage | null {
        try { return typeof window === "undefined" ? null : window.localStorage; }
        catch { return null; }
    }
}
