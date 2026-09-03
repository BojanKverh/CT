import { describe, expect, test } from "vitest";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";

class TestTableModel extends CAbstractTableModel {
	#m_data = [
		["A", "B", "C"],
		["D", "E", "F"]
	];

	override rowCount(): number {
		return this.#m_data.length;
	}

	override columnCount(): number {
		return this.#m_data[0]?.length ?? 0;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_data[index.row()]?.[index.column()] ?? null;
	}
}

describe("CAbstractTableModel", () => {
	test("returns row count", () => {
		const model = new TestTableModel();

		expect(model.rowCount()).toBe(2);
	});

	test("returns column count", () => {
		const model = new TestTableModel();

		expect(model.columnCount()).toBe(3);
	});

	test("creates valid index", () => {
		const model = new TestTableModel();
		const index = model.index(1, 2);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(1);
		expect(index.column()).toBe(2);
	});

	test("creates index at first cell", () => {
		const model = new TestTableModel();
		const index = model.index(0, 0);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(0);
		expect(index.column()).toBe(0);
	});

	test("creates index at last cell", () => {
		const model = new TestTableModel();
		const index = model.index(1, 2);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(1);
		expect(index.column()).toBe(2);
	});

	test("row outside model creates invalid index", () => {
		const model = new TestTableModel();

		expect(model.index(2, 0).isValid()).toBe(false);
	});

	test("column outside model creates invalid index", () => {
		const model = new TestTableModel();

		expect(model.index(0, 3).isValid()).toBe(false);
	});

	test("negative row creates invalid index", () => {
		const model = new TestTableModel();

		expect(model.index(-1, 0).isValid()).toBe(false);
	});

	test("negative column creates invalid index", () => {
		const model = new TestTableModel();

		expect(model.index(0, -1).isValid()).toBe(false);
	});

	test("returns data for index", () => {
		const model = new TestTableModel();

		expect(model.data(model.index(0, 0))).toBe("A");
		expect(model.data(model.index(0, 2))).toBe("C");
		expect(model.data(model.index(1, 0))).toBe("D");
		expect(model.data(model.index(1, 2))).toBe("F");
	});

	test("parentIndex is invalid", () => {
		const model = new TestTableModel();
		const index = model.index(1, 2);

		expect(model.parentIndex(index).isValid()).toBe(false);
	});
});