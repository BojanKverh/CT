import { describe, expect, test, vi } from "vitest";
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