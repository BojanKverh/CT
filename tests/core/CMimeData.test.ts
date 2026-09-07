import { describe, expect, test } from "vitest";
import { CMimeData } from "../../src/core/CMimeData.js";
import { CObject } from "../../src/core/CObject.js";

describe("CMimeData", () => {
	test("is empty by default", () => {
		const mimeData = new CMimeData();

		expect(mimeData.formats()).toEqual([]);
		expect(mimeData.hasText()).toBe(false);
		expect(mimeData.text()).toBe("");
	});

	test("stores data for MIME type", () => {
		const mimeData = new CMimeData();
		const data = new Uint8Array([1, 2, 3]);

		mimeData.setData("application/test", data);

		expect(mimeData.hasFormat("application/test")).toBe(true);
		expect(mimeData.data("application/test")).toEqual(data);
	});

	test("returns empty data for unknown MIME type", () => {
		const mimeData = new CMimeData();

		expect(mimeData.data("application/test")).toEqual(
			new Uint8Array());
	});

	test("returns stored formats", () => {
		const mimeData = new CMimeData();

		mimeData.setData("application/a", new Uint8Array([1]));
		mimeData.setData("application/b", new Uint8Array([2]));

		expect(mimeData.formats()).toEqual([
			"application/a",
			"application/b"
		]);
	});

	test("replaces existing data", () => {
		const mimeData = new CMimeData();

		mimeData.setData("application/test", new Uint8Array([1]));
		mimeData.setData("application/test", new Uint8Array([2]));

		expect(mimeData.formats()).toEqual(["application/test"]);
		expect(mimeData.data("application/test")).toEqual(
			new Uint8Array([2]));
	});

	test("copies data when storing it", () => {
		const mimeData = new CMimeData();
		const data = new Uint8Array([1, 2, 3]);

		mimeData.setData("application/test", data);
		data[0] = 9;

		expect(mimeData.data("application/test")).toEqual(
			new Uint8Array([1, 2, 3]));
	});

	test("returns a copy of stored data", () => {
		const mimeData = new CMimeData();

		mimeData.setData("application/test",
			new Uint8Array([1, 2, 3]));

		const data = mimeData.data("application/test");
		data[0] = 9;

		expect(mimeData.data("application/test")).toEqual(
			new Uint8Array([1, 2, 3]));
	});

	test("removes format", () => {
		const mimeData = new CMimeData();

		mimeData.setData("application/test", new Uint8Array([1]));
		mimeData.removeFormat("application/test");

		expect(mimeData.hasFormat("application/test")).toBe(false);
		expect(mimeData.formats()).toEqual([]);
	});

	test("clear removes all formats", () => {
		const mimeData = new CMimeData();

		mimeData.setData("application/a", new Uint8Array([1]));
		mimeData.setData("application/b", new Uint8Array([2]));

		mimeData.clear();

		expect(mimeData.formats()).toEqual([]);
	});

	test("ignores empty MIME type", () => {
		const mimeData = new CMimeData();

		mimeData.setData("", new Uint8Array([1]));

		expect(mimeData.formats()).toEqual([]);
	});

	test("stores text", () => {
		const mimeData = new CMimeData();

		mimeData.setText("Hello world");

		expect(mimeData.hasText()).toBe(true);
		expect(mimeData.hasFormat("text/plain")).toBe(true);
		expect(mimeData.text()).toBe("Hello world");
	});

	test("supports Unicode text", () => {
		const mimeData = new CMimeData();

		mimeData.setText("Čmrlj 🐝");

		expect(mimeData.text()).toBe("Čmrlj 🐝");
	});

	test("setText replaces existing text", () => {
		const mimeData = new CMimeData();

		mimeData.setText("one");
		mimeData.setText("two");

		expect(mimeData.text()).toBe("two");
	});

	test("text uses generic MIME data", () => {
		const mimeData = new CMimeData();

		mimeData.setData("text/plain",
			new TextEncoder().encode("Hello"));

		expect(mimeData.hasText()).toBe(true);
		expect(mimeData.text()).toBe("Hello");
	});

	test("supports a parent", () => {
		const parent = new CObject();
		const mimeData = new CMimeData(parent);

		expect(mimeData.parent()).toBe(parent);
	});
});