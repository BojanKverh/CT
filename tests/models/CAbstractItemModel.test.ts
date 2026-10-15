import { describe, expect, test } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CAbstractItemModel } from "../../src/models/CAbstractItemModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";

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

	changeTestLayout(
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): void {
		this.beginLayoutChange();
		this.endLayoutChange(oldIndexes, newIndexes);
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

	test("layout change signals are emitted in order", () => {
		const model = new TestModel();
		const oldIndexes = [model.index(0, 0), model.index(1, 0)];
		const newIndexes = [model.index(1, 0), model.index(0, 0)];
		const events: string[] = [];
		let emittedOld: CModelIndex[] = [];
		let emittedNew: CModelIndex[] = [];

		model.layoutAboutToBeChanged.connect(() => {
			events.push("about");
		});
		model.layoutChanged.connect((oldValues, newValues) => {
			events.push("changed");
			emittedOld = oldValues;
			emittedNew = newValues;
		});

		model.changeTestLayout(oldIndexes, newIndexes);

		expect(events).toEqual(["about", "changed"]);
		expect(emittedOld).toBe(oldIndexes);
		expect(emittedNew).toBe(newIndexes);
	});

	test("layoutChanged rejects mapping lists of different lengths", () => {
		const model = new TestModel();
		let changedCount = 0;
		model.layoutChanged.connect(() => {
			changedCount++;
		});

		model.changeTestLayout(
			[model.index(0, 0)],
			[model.index(1, 0), model.index(2, 0)]
		);

		expect(changedCount).toBe(0);
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

	test("horizontal header data defaults to section number", () => {
		const model = new TestModel();

		expect(
			model.headerData(0, COrientation.Horizontal)
		).toBe(1);

		expect(
			model.headerData(3, COrientation.Horizontal)
		).toBe(4);
	});

	test("vertical header data defaults to section number", () => {
		const model = new TestModel();

		expect(
			model.headerData(0, COrientation.Vertical)
		).toBe(1);

		expect(
			model.headerData(5, COrientation.Vertical)
		).toBe(6);
	});

	test("headerData can be overridden", () => {
		class HeaderModel extends TestModel {
			override headerData(section: number, orientation: COrientation): string | number | null {
				if (orientation === COrientation.Horizontal)
					return ["Name", "Country"][section] ?? null;

				return section + 1;
			}
		}

		const model = new HeaderModel();

		expect(
			model.headerData(0, COrientation.Horizontal)
		).toBe("Name");

		expect(
			model.headerData(1, COrientation.Horizontal)
		).toBe("Country");

		expect(
			model.headerData(2, COrientation.Vertical)
		).toBe(3);
	});

	test("sort does not modify or reset the model by default", () => {
		const model = new TestModel();
		let resetCount = 0;

		model.modelReset.connect(() => {
			resetCount++;
		});

		model.sort(0);
		model.sort(1, CSortOrder.DescendingOrder);

		expect(model.data(model.index(0, 0))).toBe("A");
		expect(model.data(model.index(2, 1))).toBe("F");
		expect(resetCount).toBe(0);
	});

	test("cannot fetch more data by default", () => {
		const model = new TestModel();

		expect(model.canFetchMore()).toBe(false);
	});

	test("fetchMore does nothing by default", async () => {
		const model = new TestModel();
		let resetCount = 0;
		model.modelReset.connect(() => resetCount++);

		expect(await model.fetchMore()).toBe(false);
		expect(model.rowCount()).toBe(3);
		expect(resetCount).toBe(0);
	});
});
