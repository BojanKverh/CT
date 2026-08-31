// @vitest-environment jsdom

import {
	afterEach,
	describe,
	expect,
	test,
	vi
} from "vitest";

import { CFileDialog } from "../../src/dialogs/CFileDialog.js";

describe("CFileDialog", () =>
{
	afterEach(() =>
	{
		document.querySelectorAll(
			'input[type="file"]'
		).forEach(input => input.remove());

		vi.restoreAllMocks();
	});

	test("getOpenFile creates file input", () =>
	{
		CFileDialog.getOpenFile();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		expect(input).not.toBeNull();
		expect(input.type).toBe("file");
		expect(input.multiple).toBe(false);
	});

	test("getOpenFile sets accept filter", () =>
	{
		CFileDialog.getOpenFile(".txt,.json");

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		expect(input.accept).toBe(".txt,.json");
	});

	test("getOpenFile has empty accept filter by default", () =>
	{
		CFileDialog.getOpenFile();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		expect(input.accept).toBe("");
	});

	test("getOpenFile clicks file input", () =>
	{
		const click = vi.spyOn(
			HTMLInputElement.prototype,
			"click"
		);

		CFileDialog.getOpenFile();

		expect(click).toHaveBeenCalledTimes(1);
	});

	test("getOpenFile resolves selected file", async () =>
	{
		const result = CFileDialog.getOpenFile();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		const file = new File(
			["Hello"],
			"hello.txt",
			{ type: "text/plain" }
		);

		Object.defineProperty(input, "files", {
			value: {
				0: file,
				length: 1,
				item: (index: number) =>
					index === 0 ? file : null
			},
			configurable: true
		});

		input.dispatchEvent(new Event("change"));

		await expect(result).resolves.toBe(file);
	});

	test("getOpenFile resolves null when no file is selected", async () =>
	{
		const result = CFileDialog.getOpenFile();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		Object.defineProperty(input, "files", {
			value: {
				length: 0,
				item: () => null
			},
			configurable: true
		});

		input.dispatchEvent(new Event("change"));

		await expect(result).resolves.toBeNull();
	});

	test("getOpenFile removes input after selection", async () =>
	{
		const result = CFileDialog.getOpenFile();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		const file = new File(
			["Hello"],
			"hello.txt",
			{ type: "text/plain" }
		);

		Object.defineProperty(input, "files", {
			value: {
				0: file,
				length: 1,
				item: () => file
			},
			configurable: true
		});

		input.dispatchEvent(new Event("change"));

		await result;

		expect(input.isConnected).toBe(false);
	});

	test("getOpenFile resolves null and removes input when cancelled",
		async () =>
	{
		const result = CFileDialog.getOpenFile();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		input.dispatchEvent(new Event("cancel"));

		await expect(result).resolves.toBeNull();
		expect(input.isConnected).toBe(false);
	});

	test("getOpenFiles creates multiple file input", () =>
	{
		CFileDialog.getOpenFiles();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		expect(input).not.toBeNull();
		expect(input.type).toBe("file");
		expect(input.multiple).toBe(true);
	});

	test("getOpenFiles sets accept filter", () =>
	{
		CFileDialog.getOpenFiles("image/*");

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		expect(input.accept).toBe("image/*");
	});

	test("getOpenFiles has empty accept filter by default", () =>
	{
		CFileDialog.getOpenFiles();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		expect(input.accept).toBe("");
	});

	test("getOpenFiles clicks file input", () =>
	{
		const click = vi.spyOn(
			HTMLInputElement.prototype,
			"click"
		);

		CFileDialog.getOpenFiles();

		expect(click).toHaveBeenCalledTimes(1);
	});

	test("getOpenFiles resolves selected files", async () =>
	{
		const result = CFileDialog.getOpenFiles();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		const file1 = new File(
			["First"],
			"first.txt",
			{ type: "text/plain" }
		);

		const file2 = new File(
			["Second"],
			"second.txt",
			{ type: "text/plain" }
		);

		Object.defineProperty(input, "files", {
			value: {
				0: file1,
				1: file2,
				length: 2,
				item: (index: number) =>
					[file1, file2][index] ?? null,
				[Symbol.iterator]: function* ()
				{
					yield file1;
					yield file2;
				}
			},
			configurable: true
		});

		input.dispatchEvent(new Event("change"));

		await expect(result).resolves.toEqual([
			file1,
			file2
		]);
	});

	test("getOpenFiles resolves empty array when no files are selected",
		async () =>
	{
		const result = CFileDialog.getOpenFiles();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		Object.defineProperty(input, "files", {
			value: null,
			configurable: true
		});

		input.dispatchEvent(new Event("change"));

		await expect(result).resolves.toEqual([]);
	});

	test("getOpenFiles removes input after selection", async () =>
	{
		const result = CFileDialog.getOpenFiles();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		Object.defineProperty(input, "files", {
			value: null,
			configurable: true
		});

		input.dispatchEvent(new Event("change"));

		await result;

		expect(input.isConnected).toBe(false);
	});

	test("getOpenFiles resolves empty array and removes input when cancelled",
		async () =>
	{
		const result = CFileDialog.getOpenFiles();

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;

		input.dispatchEvent(new Event("cancel"));

		await expect(result).resolves.toEqual([]);
		expect(input.isConnected).toBe(false);
	});
});