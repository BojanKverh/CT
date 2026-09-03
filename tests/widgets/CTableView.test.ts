import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CTableView } from "../../src/widgets/CTableView.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestTableModel extends CAbstractTableModel {
	#m_data: string[][];

	constructor(data: string[][] = [
		["Alice", "Slovenia", "30"],
		["Bob", "Austria", "40"],
		["Carol", "Italy", "50"]
	]) {
		super();
		this.#m_data = data;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_data.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_data[0]?.length ?? 0;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_data[index.row()]?.[index.column()] ?? null;
	}

	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		if (orientation === COrientation.Horizontal)
			return ["Name", "Country", "Age"][section] ?? null;

		return section + 1;
	}

	setData(row: number, column: number, value: string): void {
		const dataRow = this.#m_data[row];

		if (dataRow === undefined || column < 0
			|| column >= dataRow.length)
			return;

		dataRow[column] = value;

		const index = this.index(row, column);
		this.emitDataChanged(index, index);
	}

	setTable(data: string[][]): void {
		this.#m_data = data;
		this.resetModel();
	}
}

describe("CTableView", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("constructs without a model", () => {
		const view = new CTableView();

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("has expected size hint", () => {
		const view = new CTableView();
		const hint = view.sizeHint();

		expect(hint.width()).toBe(400);
		expect(hint.height()).toBe(240);
	});

	test("has horizontal header", () => {
		const view = new CTableView();

		expect(view.horizontalHeader().orientation())
			.toBe(COrientation.Horizontal);
	});

	test("has vertical header", () => {
		const view = new CTableView();

		expect(view.verticalHeader().orientation())
			.toBe(COrientation.Vertical);
	});

	test("headers initially have no model", () => {
		const view = new CTableView();

		expect(view.horizontalHeader().model()).toBeNull();
		expect(view.verticalHeader().model()).toBeNull();
	});

	test("sets model", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		expect(view.model()).toBe(model);
	});

	test("sets model on both headers", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		expect(view.horizontalHeader().model()).toBe(model);
		expect(view.verticalHeader().model()).toBe(model);
	});

	test("creates selection model when model is set", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		expect(view.selectionModel()).not.toBeNull();
		expect(view.selectionModel()?.model()).toBe(model);
	});

	test("setting null model removes selection model", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setModel(null);

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
		expect(view.horizontalHeader().model()).toBeNull();
		expect(view.verticalHeader().model()).toBeNull();
	});

	test("setting same model keeps selection model", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		const selectionModel = view.selectionModel();

		view.setModel(model);

		expect(view.selectionModel()).toBe(selectionModel);
	});

	test("changing model creates new selection model", () => {
		const view = new CTableView();
		const model1 = new TestTableModel();
		const model2 = new TestTableModel();

		view.setModel(model1);

		const selectionModel = view.selectionModel();

		view.setModel(model2);

		expect(view.model()).toBe(model2);
		expect(view.selectionModel()).not.toBe(selectionModel);
		expect(view.selectionModel()?.model()).toBe(model2);
		expect(view.horizontalHeader().model()).toBe(model2);
		expect(view.verticalHeader().model()).toBe(model2);
	});

	test("current index is initially invalid", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("sets current index", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		const index = model.index(1, 2);

		view.setCurrentIndex(index);

		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("does not set current index from another model", () => {
		const view = new CTableView();
		const model1 = new TestTableModel();
		const model2 = new TestTableModel();

		view.setModel(model1);

		const index = model2.index(1, 2);

		view.setCurrentIndex(index);

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("can clear current index", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 2));
		view.setCurrentIndex(new CModelIndex());

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("selection model can select cell", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		const index = model.index(1, 2);

		view.selectionModel()?.select(index);

		expect(view.selectionModel()?.isSelected(index)).toBe(true);
	});

	test("model reset clears selection and current index", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		const index = model.index(1, 2);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model.setTable([
			["One", "Two"],
			["Three", "Four"]
		]);

		expect(view.selectionModel()?.hasSelection()).toBe(false);
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("old model reset does not affect new selection", () => {
		const view = new CTableView();
		const model1 = new TestTableModel();
		const model2 = new TestTableModel();

		view.setModel(model1);
		view.setModel(model2);

		const index = model2.index(1, 2);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model1.setTable([["Changed"]]);

		expect(view.selectionModel()?.isSelected(index)).toBe(true);
		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("old model data change does not affect current model", () => {
		const view = new CTableView();
		const model1 = new TestTableModel();
		const model2 = new TestTableModel();

		view.setModel(model1);
		view.setModel(model2);

		expect(() => {
			model1.setData(0, 0, "Changed");
		}).not.toThrow();

		expect(view.model()).toBe(model2);
	});

	test("viewport exists", () => {
		const view = new CTableView();

		expect(view.viewport()).not.toBeNull();
	});

	test("horizontal scrollbar is hidden for small table", () => {
		const view = new CTableView();
		const model = new TestTableModel([
			["A", "B"],
			["C", "D"]
		]);

		view.resize(400, 240);
		view.setModel(model);

		expect(view.horizontalScrollBar().isVisible()).toBe(false);
	});

	test("vertical scrollbar is hidden for small table", () => {
		const view = new CTableView();
		const model = new TestTableModel([
			["A", "B"],
			["C", "D"]
		]);

		view.resize(400, 240);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(false);
	});

	test("horizontal scrollbar appears for wide table", () => {
		const view = new CTableView();

		const model = new TestTableModel([
			Array.from(
				{ length: 10 },
				(_, index) => `Column ${index}`
			)
		]);

		view.resize(400, 240);
		view.setModel(model);

		expect(view.horizontalScrollBar().isVisible()).toBe(true);
	});

	test("vertical scrollbar appears for tall table", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("both scrollbars appear for large table", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => Array.from(
					{ length: 10 },
					(_, column) => `${row},${column}`
				)
			)
		);

		view.resize(400, 120);
		view.setModel(model);

		expect(view.horizontalScrollBar().isVisible()).toBe(true);
		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("horizontal scroll updates horizontal header offset", () => {
		const view = new CTableView();

		const model = new TestTableModel([
			Array.from(
				{ length: 10 },
				(_, index) => `Column ${index}`
			)
		]);

		view.resize(400, 240);
		view.setModel(model);

		view.setScrollX(100);

		expect(view.scrollX()).toBe(100);
		expect(view.horizontalHeader().offset()).toBe(100);
	});

	test("vertical scroll updates vertical header offset", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);

		view.setScrollY(50);

		expect(view.scrollY()).toBe(50);
		expect(view.verticalHeader().offset()).toBe(50);
	});

	test("horizontal scroll does not move vertical header", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => Array.from(
					{ length: 10 },
					(_, column) => `${row},${column}`
				)
			)
		);

		view.resize(400, 120);
		view.setModel(model);

		view.setScrollX(100);

		expect(view.horizontalHeader().offset()).toBe(100);
		expect(view.verticalHeader().offset()).toBe(0);
	});

	test("vertical scroll does not move horizontal header", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => Array.from(
					{ length: 10 },
					(_, column) => `${row},${column}`
				)
			)
		);

		view.resize(400, 120);
		view.setModel(model);

		view.setScrollY(50);

		expect(view.horizontalHeader().offset()).toBe(0);
		expect(view.verticalHeader().offset()).toBe(50);
	});

	test("model reset updates horizontal scrollbar", () => {
		const view = new CTableView();
		const model = new TestTableModel([["A"]]);

		view.resize(400, 240);
		view.setModel(model);

		expect(view.horizontalScrollBar().isVisible()).toBe(false);

		model.setTable([
			Array.from(
				{ length: 10 },
				(_, index) => `Column ${index}`
			)
		]);

		expect(view.horizontalScrollBar().isVisible()).toBe(true);
	});

	test("model reset updates vertical scrollbar", () => {
		const view = new CTableView();
		const model = new TestTableModel([["A"]]);

		view.resize(400, 120);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(false);

		model.setTable(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});
});