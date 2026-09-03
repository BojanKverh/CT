import { describe, expect, test } from "vitest";
import { CAbstractListModel } from "../../src/models/CAbstractListModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";

class TestListModel extends CAbstractListModel {
	#m_data = ["A", "B", "C"];

	override rowCount(): number {
		return this.#m_data.length;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_data[index.row()] ?? null;
	}
}

describe("CAbstractListModel", () => {
	test("returns one column", () => {
		const model = new TestListModel();

		expect(model.columnCount()).toBe(1);
	});

	test("returns one column for parent index", () => {
		const model = new TestListModel();
		const parent = model.index(0, 0);

		expect(model.columnCount(parent)).toBe(1);
	});

	test("returns row count from implementation", () => {
		const model = new TestListModel();

		expect(model.rowCount()).toBe(3);
	});

	test("creates valid index in first column", () => {
		const model = new TestListModel();
		const index = model.index(1, 0);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(1);
		expect(index.column()).toBe(0);
	});

	test("second column creates invalid index", () => {
		const model = new TestListModel();

		expect(model.index(0, 1).isValid()).toBe(false);
	});

	test("negative column creates invalid index", () => {
		const model = new TestListModel();

		expect(model.index(0, -1).isValid()).toBe(false);
	});

	test("row outside model creates invalid index", () => {
		const model = new TestListModel();

		expect(model.index(3, 0).isValid()).toBe(false);
	});

	test("returns data for index", () => {
		const model = new TestListModel();

		expect(model.data(model.index(0, 0))).toBe("A");
		expect(model.data(model.index(1, 0))).toBe("B");
		expect(model.data(model.index(2, 0))).toBe("C");
	});

	test("parentIndex is invalid", () => {
		const model = new TestListModel();
		const index = model.index(1, 0);

		expect(model.parentIndex(index).isValid()).toBe(false);
	});
});