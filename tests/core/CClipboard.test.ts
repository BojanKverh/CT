import { afterEach, describe, expect, test, vi } from "vitest";
import { CClipboard } from "../../src/core/CClipboard.js";
import { CMimeData } from "../../src/core/CMimeData.js";

describe("CClipboard", () => {
	test("is initially empty", () => {
		const clipboard = new CClipboard();

		expect(clipboard.mimeData()).toBeNull();
		expect(clipboard.text()).toBe("");
	});

	test("sets text", () => {
		const clipboard = new CClipboard();

		clipboard.setText("Hello");

		expect(clipboard.text()).toBe("Hello");
		expect(clipboard.mimeData()?.hasText()).toBe(true);
	});

	test("sets mime data", () => {
		const clipboard = new CClipboard();
		const mimeData = new CMimeData();

		mimeData.setText("Hello");
		clipboard.setMimeData(mimeData);

		expect(clipboard.mimeData()).toBe(mimeData);
		expect(clipboard.text()).toBe("Hello");
		expect(mimeData.parent()).toBe(clipboard);
	});

	test("replaces mime data", () => {
		const clipboard = new CClipboard();
		const first = new CMimeData();
		const second = new CMimeData();

		first.setText("First");
		second.setText("Second");

		clipboard.setMimeData(first);
		clipboard.setMimeData(second);

		expect(clipboard.mimeData()).toBe(second);
		expect(clipboard.text()).toBe("Second");
		expect(second.parent()).toBe(clipboard);
	});

	test("clears clipboard", () => {
		const clipboard = new CClipboard();

		clipboard.setText("Hello");
		clipboard.clear();

		expect(clipboard.mimeData()).toBeNull();
		expect(clipboard.text()).toBe("");
	});

	test("emits signals when data changes", () => {
		const clipboard = new CClipboard();
		const changed = vi.fn();
		const dataChanged = vi.fn();

		clipboard.changed.connect(changed);
		clipboard.dataChanged.connect(dataChanged);

		clipboard.setText("Hello");

		expect(changed).toHaveBeenCalledOnce();
		expect(dataChanged).toHaveBeenCalledOnce();
	});

	test("does not emit when setting same mime data", () => {
		const clipboard = new CClipboard();
		const mimeData = new CMimeData();
		const changed = vi.fn();

		clipboard.setMimeData(mimeData);
		clipboard.changed.connect(changed);

		clipboard.setMimeData(mimeData);

		expect(changed).not.toHaveBeenCalled();
	});

	test("clear emits signals", () => {
		const clipboard = new CClipboard();
		const changed = vi.fn();

		clipboard.setText("Hello");
		clipboard.changed.connect(changed);

		clipboard.clear();

		expect(changed).toHaveBeenCalledOnce();
	});
});

describe("CClipboard system text", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    afterEach(() => {
        if (original) Object.defineProperty(globalThis, "navigator", original);
        else Reflect.deleteProperty(globalThis, "navigator");
        CClipboard.destroy();
    });
    function system(api: { readText?: () => Promise<string>; writeText?: (text: string) => Promise<void> }) {
        Object.defineProperty(globalThis, "navigator", { value: { clipboard: api }, configurable: true });
    }
    test("setText immediately updates CT and starts a system write", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined); system({ writeText });
        const clipboard = new CClipboard(); clipboard.setText("Hello system");
        expect(clipboard.text()).toBe("Hello system");
        expect(writeText).toHaveBeenCalledWith("Hello system");
        await Promise.resolve(); expect(clipboard.lastError()).toBe("");
    });
    test("native clipboard events do not cause a second API write", () => {
        const writeText = vi.fn().mockResolvedValue(undefined); system({ writeText });
        const clipboard = new CClipboard();
        clipboard.withNativeClipboard(() => clipboard.setText("Native"));
        expect(clipboard.text()).toBe("Native"); expect(writeText).not.toHaveBeenCalled();
    });
    test("reads external text and updates the cache without writing it back", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        const readText = vi.fn().mockResolvedValue("External"); system({ readText, writeText });
        const clipboard = new CClipboard();
        expect(await clipboard.readSystemText()).toBe("External");
        expect(clipboard.text()).toBe("External"); expect(writeText).not.toHaveBeenCalled();
    });
    test("an empty system clipboard replaces old cached text", async () => {
        system({ readText: vi.fn().mockResolvedValue("") });
        const clipboard = new CClipboard(); clipboard.setText("Old");
        expect(await clipboard.readSystemText()).toBe(""); expect(clipboard.text()).toBe("");
    });
    test("a denied read reports an error instead of returning stale text", async () => {
        system({ readText: vi.fn().mockRejectedValue(new Error("Denied")) });
        const clipboard = new CClipboard(); clipboard.setText("Old");
        const errors = vi.fn(); clipboard.errorOccurred.connect(errors);
        expect(await clipboard.readSystemText()).toBeNull();
        expect(errors).toHaveBeenCalledWith("Denied"); expect(clipboard.lastError()).toBe("Denied");
    });
    test("failed writes are reported and do not reject", async () => {
        system({ writeText: vi.fn().mockRejectedValue(new Error("Denied")) });
        const clipboard = new CClipboard(); const errors = vi.fn(); clipboard.errorOccurred.connect(errors);
        expect(await clipboard.writeSystemText("Text")).toBe(false);
        expect(errors).toHaveBeenCalledWith("Denied");
    });
    test("absence of the browser API preserves internal clipboard use", async () => {
        system({}); const clipboard = new CClipboard(); clipboard.setText("Internal");
        expect(clipboard.canReadSystemText()).toBe(false);
        expect(await clipboard.readSystemText()).toBe("Internal");
    });
    test("a delayed system read does not overwrite a newer clipboard change", async () => {
        let resolve!: (value: string) => void;
        system({ readText: () => new Promise<string>(done => { resolve = done; }) });
        const clipboard = new CClipboard(); const pending = clipboard.readSystemText();
        clipboard.withNativeClipboard(() => clipboard.setText("Newer")); resolve("Older");
        expect(await pending).toBeNull(); expect(clipboard.text()).toBe("Newer");
    });
});
