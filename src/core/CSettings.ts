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

    /**
     * Checks whether the instance still uses persistent storage. An access error switches it to its in-memory cache.
     * @returns `true` if persistent storage is still active.
     */
    isPersistent(): boolean { return this.#m_storage !== null; }

    /**
     * Reads and parses a namespaced setting.
     * @param key Setting key within this instance's namespace.
     * @returns Parsed JSON value, or `null` for a missing or corrupt entry.
     */
    value(key: string): unknown;
    /**
     * Reads a namespaced setting using a typed fallback. The stored JSON is returned without schema validation.
     * @param key Setting key within this instance's namespace.
     * @param defaultValue Fallback used when the stored entry is missing or corrupt.
     * @returns Parsed JSON value or the supplied fallback.
     */
    value<T>(key: string, defaultValue: T): T;
    /**
     * Reads a namespaced setting and parses its JSON representation.
     * @param key Setting key within this instance's namespace.
     * @param defaultValue Fallback for a missing or corrupt entry. Defaults to `null`.
     * @returns Parsed JSON value or the fallback.
     */
    value(key: string, defaultValue: unknown = null): unknown {
        const raw = this.#read(key);
        if (raw === null) return defaultValue;
        try { return JSON.parse(raw) as unknown; }
        catch { return defaultValue; }
    }

    /**
     * Stores a JSON snapshot. Serialization errors propagate before storage changes. A storage error switches the instance to memory.
     * @param key Setting key within this instance's namespace.
     * @param value JSON-compatible value to serialize. Unsupported values such as functions and nonfinite numbers are rejected.
     */
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

    /**
     * Checks whether any raw value is stored, including JSON `null`, `false` and corrupt entries.
     * @param key Setting key within this instance's namespace.
     * @returns `true` if the underlying entry exists.
     */
    contains(key: string): boolean { return this.#read(key) !== null; }

    /**
     * Deletes the setting from storage and the local cache. A storage error switches the instance to memory.
     * @param key Setting key within this instance's namespace.
     */
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
