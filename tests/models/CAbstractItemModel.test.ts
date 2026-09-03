import { describe, expect, test } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractItemModel } from "../../src/models/CAbstractItemModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";

class TestModel extends CAbstractItemModel {
	#m_data = [
		["A", "B"],
		["C", "D"],
		["E", "F"]
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

	createTestIndex(row: number, column: number,
		data: unknown = null): CModelIndex {
		return this.createIndex(row, column, data);
	}

	emitTestDataChanged(topLeft: CModelIndex,
		bottomRight: CModelIndex): void {
		this.emitDataChanged(topLeft, bottomRight);
	}

	resetTestModel(): void {
		this.resetModel();
	}
}

describe("CAbstractItemModel", () => {
	test("can be constructed without parent", () => {
		const model = new TestModel();

		expect(model.parent()).toBeNull();
	});

	test("can be constructed with parent", () => {
		const parent = new CObject();
		const model = new TestModel(parent);

		expect(model.parent()).toBe(parent);
	});

	test("returns row count", () => {
		const model = new TestModel();

		expect(model.rowCount()).toBe(3);
	});

	test("returns column count", () => {
		const model = new TestModel();

		expect(model.columnCount()).toBe(2);
	});

	test("returns data", () => {
		const model = new TestModel();

		expect(model.data(model.index(0, 0))).toBe("A");
		expect(model.data(model.index(1, 1))).toBe("D");
		expect(model.data(model.index(2, 1))).toBe("F");
	});

	test("creates valid index", () => {
		const model = new TestModel();
		const index = model.index(1, 1);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(1);
		expect(index.column()).toBe(1);
	});

	test("creates index at first cell", () => {
		const model = new TestModel();
		const index = model.index(0, 0);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(0);
		expect(index.column()).toBe(0);
	});

	test("creates index at last cell", () => {
		const model = new TestModel();
		const index = model.index(2, 1);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(2);
		expect(index.column()).toBe(1);
	});

	test("negative row creates invalid index", () => {
		const model = new TestModel();

		expect(model.index(-1, 0).isValid()).toBe(false);
	});

	test("negative column creates invalid index", () => {
		const model = new TestModel();

		expect(model.index(0, -1).isValid()).toBe(false);
	});

	test("row outside model creates invalid index", () => {
		const model = new TestModel();

		expect(model.index(3, 0).isValid()).toBe(false);
	});

	test("column outside model creates invalid index", () => {
		const model = new TestModel();

		expect(model.index(0, 2).isValid()).toBe(false);
	});

	test("parentIndex returns invalid index by default", () => {
		const model = new TestModel();
		const index = model.index(1, 1);
		const parent = model.parentIndex(index);

		expect(parent.isValid()).toBe(false);
	});

	test("createIndex creates index with data", () => {
		const model = new TestModel();
		const data = {};
		const index = model.createTestIndex(1, 2, data);

		expect(index.row()).toBe(1);
		expect(index.column()).toBe(2);
		expect(index.data()).toBe(data);
	});

	test("createIndex does not validate bounds", () => {
		const model = new TestModel();
		const index = model.createTestIndex(100, 200);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(100);
		expect(index.column()).toBe(200);
	});

	test("dataChanged emits indexes", () => {
		const model = new TestModel();
		const topLeft = model.index(0, 0);
		const bottomRight = model.index(1, 1);

		let emittedTopLeft: CModelIndex | null = null;
		let emittedBottomRight: CModelIndex | null = null;

		model.dataChanged.connect((first, second) => {
			emittedTopLeft = first;
			emittedBottomRight = second;
		});

		model.emitTestDataChanged(topLeft, bottomRight);

		expect(emittedTopLeft).toBe(topLeft);
		expect(emittedBottomRight).toBe(bottomRight);
	});

	test("modelReset is emitted", () => {
		const model = new TestModel();
		let count = 0;

		model.modelReset.connect(() => {
			count++;
		});

		model.resetTestModel();

		expect(count).toBe(1);
	});

	test("modelReset can be emitted repeatedly", () => {
		const model = new TestModel();
		let count = 0;

		model.modelReset.connect(() => {
			count++;
		});

		model.resetTestModel();
		model.resetTestModel();

		expect(count).toBe(2);
	});

	test("invalid index returns no data in test model", () => {
		const model = new TestModel();

		expect(model.data(new CModelIndex())).toBeNull();
	});

	test("index stores its model", () => {
		const model = new TestModel();
		const index = model.index(1, 1);

		expect(index.model()).toBe(model);
	});

	test("invalid index has no model", () => {
		const model = new TestModel();
		const index = model.index(100, 0);

		expect(index.model()).toBeNull();
	});
});