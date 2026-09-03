import { describe, expect, test } from "vitest";
import { CModelIndex } from "../../src/models/CModelIndex.js";

describe("CModelIndex", () => {
	test("default index is invalid", () => {
		const index = new CModelIndex();

		expect(index.isValid()).toBe(false);
		expect(index.row()).toBe(-1);
		expect(index.column()).toBe(-1);
		expect(index.data()).toBeNull();
	});

	test("stores row and column but no model", () => {
		const index = new CModelIndex(2, 3);

		expect(index.row()).toBe(2);
		expect(index.column()).toBe(3);
		expect(index.isValid()).toBe(false);
	});

	test("stores data", () => {
		const data = {};
		const index = new CModelIndex(1, 2, data);

		expect(index.data()).toBe(data);
	});

	test("stores primitive data", () => {
		const index = new CModelIndex(1, 2, "hello");

		expect(index.data()).toBe("hello");
	});

	test("index with negative row is invalid", () => {
		const index = new CModelIndex(-1, 0);

		expect(index.isValid()).toBe(false);
	});

	test("index with negative column is invalid", () => {
		const index = new CModelIndex(0, -1);

		expect(index.isValid()).toBe(false);
	});

	test("index with zero row and column and no model is invalid", () => {
		const index = new CModelIndex(0, 0);

		expect(index.isValid()).toBe(false);
	});

	test("indexes with equal values are equal", () => {
		const data = {};
		const index1 = new CModelIndex(1, 2, data);
		const index2 = new CModelIndex(1, 2, data);

		expect(index1.equals(index2)).toBe(true);
	});

	test("default indexes are equal", () => {
		const index1 = new CModelIndex();
		const index2 = new CModelIndex();

		expect(index1.equals(index2)).toBe(true);
	});

	test("indexes with different rows are not equal", () => {
		const index1 = new CModelIndex(1, 2);
		const index2 = new CModelIndex(2, 2);

		expect(index1.equals(index2)).toBe(false);
	});

	test("indexes with different columns are not equal", () => {
		const index1 = new CModelIndex(1, 2);
		const index2 = new CModelIndex(1, 3);

		expect(index1.equals(index2)).toBe(false);
	});

	test("indexes with different data are not equal", () => {
		const index1 = new CModelIndex(1, 2, {});
		const index2 = new CModelIndex(1, 2, {});

		expect(index1.equals(index2)).toBe(false);
	});

	test("indexes with equal primitive data are equal", () => {
		const index1 = new CModelIndex(1, 2, "hello");
		const index2 = new CModelIndex(1, 2, "hello");

		expect(index1.equals(index2)).toBe(true);
	});

	test("data participates in equality", () => {
		const index1 = new CModelIndex(1, 2, "one");
		const index2 = new CModelIndex(1, 2, "two");

		expect(index1.equals(index2)).toBe(false);
	});
});