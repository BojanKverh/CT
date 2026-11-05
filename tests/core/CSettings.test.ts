import { afterEach, describe, expect, test, vi } from "vitest";
import { CSettings } from "../../src/core/CSettings.js";

class TestStorage implements Storage {
    readonly data = new Map<string, string>();
    failRead = false; failWrite = false; failRemove = false;
    get length(): number { return this.data.size; }
    key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
    clear(): void { this.data.clear(); }
    getItem(key: string): string | null {
        if (this.failRead) throw new Error("Read denied");
        return this.data.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        if (this.failWrite) throw new Error("Quota exceeded");
        this.data.set(key, value);
    }
    removeItem(key: string): void {
        if (this.failRemove) throw new Error("Remove denied");
        this.data.delete(key);
    }
}

describe("CSettings", () => {
    afterEach(() => { vi.unstubAllGlobals(); });

    test("returns the fallback or null when missing", () => {
        const settings = new CSettings("demo", new TestStorage());
        expect(settings.value("missing")).toBe(null);
        expect(settings.value("missing", "light")).toBe("light");
        expect(settings.contains("missing")).toBe(false);
    });
    for (const value of ["dark", "", 42, 0, false, true, null, [1, "two", null], { width: 800, nested: { open: true } }]) {
        test(`round-trips ${JSON.stringify(value)}`, () => {
            const settings = new CSettings("demo", new TestStorage());
            settings.setValue("value", value);
            expect(settings.contains("value")).toBe(true);
            expect(settings.value("value", "fallback")).toEqual(value);
        });
    }
    test("new instances read persisted values", () => {
        const storage = new TestStorage(); new CSettings("demo", storage).setValue("theme", "dark");
        expect(new CSettings("demo", storage).value("theme", "light")).toBe("dark");
    });
    test("namespaces and separator-containing names do not collide", () => {
        const storage = new TestStorage();
        const a = new CSettings("a:b", storage), b = new CSettings("a", storage);
        a.setValue("c", 1); b.setValue("b:c", 2);
        expect(a.value("c")).toBe(1); expect(b.value("b:c")).toBe(2);
        expect(b.contains("c")).toBe(false);
    });
    test("supports Unicode and empty keys", () => {
        const settings = new CSettings("čebelar", new TestStorage());
        settings.setValue("", "nič"); settings.setValue("širina", 1200);
        expect(settings.value("")).toBe("nič"); expect(settings.value("širina")).toBe(1200);
    });
    test("removes only its own key and namespace", () => {
        const storage = new TestStorage(), a = new CSettings("a", storage), b = new CSettings("b", storage);
        a.setValue("x", 1); a.setValue("y", 2); b.setValue("x", 3); a.remove("x"); a.remove("absent");
        expect(a.contains("x")).toBe(false); expect(a.value("y")).toBe(2); expect(b.value("x")).toBe(3);
    });
    test("rejects empty namespaces", () => {
        expect(() => new CSettings("", null)).toThrow(RangeError);
        expect(() => new CSettings("   ", null)).toThrow(RangeError);
    });
    test("input and output objects are independent JSON snapshots", () => {
        const settings = new CSettings("demo", null), input = { rows: [1, 2] };
        settings.setValue("x", input); input.rows.push(3);
        const read = settings.value("x", { rows: [] as number[] }); read.rows.push(4);
        expect(settings.value("x")).toEqual({ rows: [1, 2] });
    });
    test("corrupted JSON returns the fallback and can be replaced", () => {
        const storage = new TestStorage(), settings = new CSettings("demo", storage);
        settings.setValue("x", 1); storage.data.set(storage.key(0)!, "{bad");
        expect(settings.contains("x")).toBe(true); expect(settings.value("x", 7)).toBe(7);
        settings.setValue("x", 2); expect(settings.value("x")).toBe(2);
    });
    test("sees changes and deletion by another instance", () => {
        const storage = new TestStorage(), a = new CSettings("demo", storage), b = new CSettings("demo", storage);
        a.setValue("x", 1); expect(b.value("x")).toBe(1);
        a.setValue("x", 2); expect(b.value("x")).toBe(2);
        a.remove("x"); expect(b.contains("x")).toBe(false);
    });
    test("explicit null storage provides instance-local memory", () => {
        const settings = new CSettings("demo", null); settings.setValue("x", 1);
        expect(settings.isPersistent()).toBe(false); expect(settings.value("x")).toBe(1);
        expect(new CSettings("demo", null).contains("x")).toBe(false);
        settings.remove("x"); expect(settings.contains("x")).toBe(false);
    });
    test("works outside a browser", () => {
        vi.stubGlobal("window", undefined);
        const settings = new CSettings("demo"); settings.setValue("theme", "dark");
        expect(settings.value("theme")).toBe("dark"); expect(settings.isPersistent()).toBe(false);
    });
    test("blocked localStorage getter falls back to memory", () => {
        vi.stubGlobal("window", { get localStorage(): Storage { throw new Error("Denied"); } });
        const settings = new CSettings("demo"); settings.setValue("x", false);
        expect(settings.value("x", true)).toBe(false); expect(settings.isPersistent()).toBe(false);
    });
    test("uses browser localStorage by default", () => {
        const storage = new TestStorage(); vi.stubGlobal("window", { localStorage: storage });
        const settings = new CSettings("demo"); settings.setValue("theme", "dark");
        expect(storage.length).toBe(1); expect(settings.isPersistent()).toBe(true);
    });
    test("quota failure retains earlier known values and the new value in memory", () => {
        const storage = new TestStorage(), settings = new CSettings("demo", storage);
        settings.setValue("old", 1); storage.failWrite = true; settings.setValue("new", 2);
        expect(settings.isPersistent()).toBe(false); expect(settings.value("old")).toBe(1);
        expect(settings.value("new")).toBe(2);
        settings.setValue("old", 3); expect(settings.value("old")).toBe(3);
    });
    test("read failure uses the last successfully read snapshot", () => {
        const storage = new TestStorage(); new CSettings("demo", storage).setValue("x", 9);
        const settings = new CSettings("demo", storage); expect(settings.value("x")).toBe(9);
        storage.failRead = true; expect(settings.value("x")).toBe(9);
        expect(settings.value("unknown", 5)).toBe(5); expect(settings.isPersistent()).toBe(false);
    });
    test("failed removal does not resurrect stale persisted data in this instance", () => {
        const storage = new TestStorage(), settings = new CSettings("demo", storage);
        settings.setValue("x", 1); storage.failRemove = true; settings.remove("x");
        expect(settings.contains("x")).toBe(false); expect(settings.value("x", 5)).toBe(5);
        storage.failRemove = false; expect(settings.contains("x")).toBe(false);
        expect(settings.isPersistent()).toBe(false);
    });
    for (const value of [undefined, NaN, Infinity, -Infinity, () => 1, Symbol("x"), BigInt(1), { x: undefined }, [NaN], new Map()]) {
        test(`rejects non-JSON value ${String(value)} without changing saved data`, () => {
            const settings = new CSettings("demo", null); settings.setValue("x", "before");
            expect(() => settings.setValue("x", value)).toThrow(TypeError);
            expect(settings.value("x")).toBe("before");
        });
    }
    test("rejects circular values without altering the old value", () => {
        const settings = new CSettings("demo", null); settings.setValue("x", "before");
        const cycle: { self?: unknown } = {}; cycle.self = cycle;
        expect(() => settings.setValue("x", cycle)).toThrow(TypeError);
        expect(settings.value("x")).toBe("before");
    });
});
