import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CTableView } from "../../src/widgets/CTableView.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CAbstractItemModel } from "../../src/models/CAbstractItemModel.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CAbstractItemDelegate } from "../../src/widgets/CAbstractItemDelegate.js";
import { CItemDelegate } from "../../src/widgets/CItemDelegate.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CIntItemDelegate } from "../../src/widgets/CIntItemDelegate.js";
import { CDoubleItemDelegate } from "../../src/widgets/CDoubleItemDelegate.js";
import { CSpinBox } from "../../src/widgets/CSpinBox.js";
import { CDoubleSpinBox } from "../../src/widgets/CDoubleSpinBox.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CDateEdit } from "../../src/widgets/CDateEdit.js";
import { CTimeEdit } from "../../src/widgets/CTimeEdit.js";
import { CDateTimeEdit } from "../../src/widgets/CDateTimeEdit.js";
import { CDateItemDelegate } from "../../src/widgets/CDateItemDelegate.js";
import { CTimeItemDelegate } from "../../src/widgets/CTimeItemDelegate.js";
import { CDateTimeItemDelegate } from "../../src/widgets/CDateTimeItemDelegate.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import { CComboBoxItemDelegate } from "../../src/widgets/CComboBoxItemDelegate.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
import { CSortFilterProxyModel } from "../../src/models/CSortFilterProxyModel.js";
import { CMemorySqlTableAdapter } from "../../src/models/CMemorySqlTableAdapter.js";
import { CSqlTableModel } from "../../src/models/CSqlTableModel.js";
import { CSqlEditStrategy } from "../../src/models/CSqlEditStrategy.js";
import { CSqlRelation } from "../../src/models/CSqlRelation.js";
import { CSqlRelationalTableModel } from "../../src/models/CSqlRelationalTableModel.js";
import { CSqlRelationalDelegate } from "../../src/widgets/CSqlRelationalDelegate.js";

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

class EditableTableModel extends TestTableModel {
	#m_editable = true;

	setEditable(editable: boolean): void {
		this.#m_editable = editable;
	}

	override isEditable(_index: CModelIndex): boolean {
		return this.#m_editable;
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid())
			return false;

		this.setData(index.row(), index.column(), String(value));
		return true;
	}
}

class SortableTableModel extends TestTableModel {
	readonly sortCalls: Array<{
		column: number;
		order: CSortOrder;
	}> = [];

	override sort(
		column: number,
		order: CSortOrder = CSortOrder.AscendingOrder
	): void {
		this.sortCalls.push({ column, order });
	}
}

class FetchMoreTableModel extends TestTableModel {
	fetchCalls = 0;
	#m_remainingRows: string[][];

	constructor(initialRows: string[][], remainingRows: string[][]) {
		super(initialRows);
		this.#m_remainingRows = remainingRows;
	}

	override canFetchMore(): boolean {
		return this.#m_remainingRows.length > 0;
	}

	override async fetchMore(): Promise<boolean> {
		++this.fetchCalls;
		if (this.#m_remainingRows.length === 0)
			return false;

		const current = Array.from(
			{ length: this.rowCount() },
			(_, row) => [String(this.data(this.index(row, 0)))]
		);
		current.push(this.#m_remainingRows.shift()!);
		this.setTable(current);
		return true;
	}
}

class PendingFetchTableModel extends TestTableModel {
	fetchCalls = 0;
	#m_resolve: (() => void) | null = null;

	override canFetchMore(): boolean {
		return true;
	}

	override async fetchMore(): Promise<boolean> {
		++this.fetchCalls;
		await new Promise<void>(resolve => {
			this.#m_resolve = resolve;
		});
		return false;
	}

	finishFetch(): void {
		this.#m_resolve?.();
		this.#m_resolve = null;
	}
}

class NumericEditableTableModel extends CAbstractTableModel {
	#m_data: unknown[][] = [
		["Alice", 30, 1250.5, true, new Date(2026, 9, 6)],
		["Bob", 40, 980.25, false, new Date(2027, 2, 14)]
	];

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_data.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_data[0]?.length ?? 0;
	}

	override data(index: CModelIndex): unknown {
		return index.isValid()
			? this.#m_data[index.row()]?.[index.column()] ?? null
			: null;
	}

	override headerData(
		_section: number,
		_orientation: COrientation
	): null {
		return null;
	}

	override isEditable(_index: CModelIndex): boolean {
		return true;
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		const row = this.#m_data[index.row()];
		if (!index.isValid() || row === undefined)
			return false;

		row[index.column()] = value;
		this.emitDataChanged(index, index);
		return true;
	}
}

class TestItemDelegate extends CAbstractItemDelegate {
	createEditorCalls: Array<{ parent: CWidget; index: CModelIndex }> = [];
	setEditorDataCalls: Array<{ editor: CWidget; index: CModelIndex }> = [];
	setModelDataCalls: Array<{
		editor: CWidget;
		model: CAbstractItemModel;
		index: CModelIndex;
	}> = [];
	updateEditorGeometryCalls: Array<{ editor: CWidget; rect: CRect }> = [];
	lastEditor: CWidget | null = null;
	createEditorResult = true;

	override createEditor(parent: CWidget, index: CModelIndex): CWidget | null {
		this.createEditorCalls.push({ parent, index });

		if (!this.createEditorResult)
			return null;

		this.lastEditor = new CWidget(parent);
		this.lastEditor.setFocusPolicy(CFocusPolicy.StrongFocus);
		return this.lastEditor;
	}

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		this.setEditorDataCalls.push({ editor, index });
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		this.setModelDataCalls.push({ editor, model, index });
	}

	override updateEditorGeometry(editor: CWidget, rect: CRect): void {
		this.updateEditorGeometryCalls.push({ editor, rect });
		super.updateEditorGeometry(editor, rect);
	}
}

function mouseDoubleClick(x: number, y: number): CMouseEvent {
	return new CMouseEvent(CEventType.MouseDoubleClick, x, y,
		CMouseButton.LeftButton);
}

function mousePress(x: number, y: number): CMouseEvent {
	return new CMouseEvent(CEventType.MousePress, x, y,
		CMouseButton.LeftButton);
}

function clickHeaderSection(view: CTableView, section: number): void {
	const x = view.horizontalHeader().sectionPosition(section) + 10;
	const header = view.horizontalHeader();

	header.event(new CMouseEvent(
		CEventType.MousePress,
		x,
		10,
		CMouseButton.LeftButton
	));
	header.event(new CMouseEvent(
		CEventType.MouseRelease,
		x,
		10,
		CMouseButton.LeftButton
	));
}

function findEditor<T extends CWidget>(
	root: CWidget,
	editorType: new (...args: never[]) => T
): T | null {
	for (const child of root.children()) {
		if (!(child instanceof CWidget))
			continue;

		if (child instanceof editorType)
			return child;

		const descendant = findEditor(child, editorType);
		if (descendant !== null)
			return descendant;
	}

	return null;
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

	test("sorting is disabled by default", () => {
		const view = new CTableView();

		expect(view.isSortingEnabled()).toBe(false);
		expect(view.horizontalHeader().isSortIndicatorShown()).toBe(false);
	});

	test("enabling sorting shows the header sort indicator", () => {
		const view = new CTableView();

		view.setSortingEnabled(true);

		expect(view.isSortingEnabled()).toBe(true);
		expect(view.horizontalHeader().isSortIndicatorShown()).toBe(true);
	});

	test("disabling sorting hides the header sort indicator", () => {
		const view = new CTableView();
		view.setSortingEnabled(true);

		view.setSortingEnabled(false);

		expect(view.isSortingEnabled()).toBe(false);
		expect(view.horizontalHeader().isSortIndicatorShown()).toBe(false);
	});

	test("a header click does not sort when sorting is disabled", () => {
		const view = new CTableView();
		const model = new SortableTableModel();
		view.setModel(model);

		clickHeaderSection(view, 1);

		expect(model.sortCalls).toEqual([]);
	});

	test("first header click sorts the column in ascending order", () => {
		const view = new CTableView();
		const model = new SortableTableModel();
		view.setModel(model);
		view.setSortingEnabled(true);

		clickHeaderSection(view, 1);

		expect(model.sortCalls).toEqual([{
			column: 1,
			order: CSortOrder.AscendingOrder
		}]);
		expect(view.horizontalHeader().sortIndicatorSection()).toBe(1);
		expect(view.horizontalHeader().sortIndicatorOrder())
			.toBe(CSortOrder.AscendingOrder);
	});

	test("a header click reloads an SQL model using server-side sorting", async () => {
		const adapter = new CMemorySqlTableAdapter({
			employees: [
				{ id: 1, name: "Carol" },
				{ id: 2, name: "Alice" },
				{ id: 3, name: "Bob" }
			]
		});
		const model = new CSqlTableModel(adapter);
		model.setTable("employees");
		model.setColumns(["id", "name"]);
		await model.select();

		const view = new CTableView();
		view.setModel(model);
		view.setSortingEnabled(true);
		clickHeaderSection(view, 1);
		await model.whenIdle();

		expect(model.data(model.index(0, 1))).toBe("Alice");
		expect(model.data(model.index(1, 1))).toBe("Bob");
		expect(model.data(model.index(2, 1))).toBe("Carol");
	});

	test("repeated header clicks toggle the sort order", () => {
		const view = new CTableView();
		const model = new SortableTableModel();
		view.setModel(model);
		view.setSortingEnabled(true);

		clickHeaderSection(view, 1);
		clickHeaderSection(view, 1);
		clickHeaderSection(view, 1);

		expect(model.sortCalls.map(call => call.order)).toEqual([
			CSortOrder.AscendingOrder,
			CSortOrder.DescendingOrder,
			CSortOrder.AscendingOrder
		]);
	});

	test("clicking another column starts with ascending order", () => {
		const view = new CTableView();
		const model = new SortableTableModel();
		view.setModel(model);
		view.setSortingEnabled(true);

		clickHeaderSection(view, 1);
		clickHeaderSection(view, 1);
		clickHeaderSection(view, 2);

		expect(model.sortCalls[2]).toEqual({
			column: 2,
			order: CSortOrder.AscendingOrder
		});
		expect(view.horizontalHeader().sortIndicatorSection()).toBe(2);
	});

	test("sortByColumn sorts directly and updates the indicator", () => {
		const view = new CTableView();
		const model = new SortableTableModel();
		view.setModel(model);

		view.sortByColumn(2, CSortOrder.DescendingOrder);

		expect(model.sortCalls).toEqual([{
			column: 2,
			order: CSortOrder.DescendingOrder
		}]);
		expect(view.horizontalHeader().sortIndicatorSection()).toBe(2);
		expect(view.horizontalHeader().sortIndicatorOrder())
			.toBe(CSortOrder.DescendingOrder);
	});

	test("sortByColumn ignores invalid columns and a missing model", () => {
		const view = new CTableView();

		view.sortByColumn(0);

		const model = new SortableTableModel();
		view.setModel(model);
		view.sortByColumn(-1);
		view.sortByColumn(model.columnCount());

		expect(model.sortCalls).toEqual([]);
	});

	test("header clicks sort a proxy without modifying its source model", () => {
		const source = new TestTableModel([
			["Carol", "Italy", "50"],
			["Alice", "Slovenia", "30"],
			["Bob", "Austria", "40"]
		]);
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		view.setModel(proxy);
		view.setSortingEnabled(true);

		clickHeaderSection(view, 0);

		expect(proxy.data(proxy.index(0, 0))).toBe("Alice");
		expect(proxy.data(proxy.index(1, 0))).toBe("Bob");
		expect(proxy.data(proxy.index(2, 0))).toBe("Carol");
		expect(source.data(source.index(0, 0))).toBe("Carol");
		expect(source.data(source.index(1, 0))).toBe("Alice");
		expect(source.data(source.index(2, 0))).toBe("Bob");
	});

	test("a second proxy header click reverses the displayed order", () => {
		const source = new TestTableModel([
			["Carol", "Italy", "50"],
			["Alice", "Slovenia", "30"],
			["Bob", "Austria", "40"]
		]);
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		view.setModel(proxy);
		view.setSortingEnabled(true);

		clickHeaderSection(view, 0);
		clickHeaderSection(view, 0);

		expect(proxy.data(proxy.index(0, 0))).toBe("Carol");
		expect(proxy.data(proxy.index(1, 0))).toBe("Bob");
		expect(proxy.data(proxy.index(2, 0))).toBe("Alice");
		expect(view.horizontalHeader().sortIndicatorOrder())
			.toBe(CSortOrder.DescendingOrder);
	});

	test("proxy filtering updates the table row geometry", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		view.setModel(proxy);

		proxy.setFilterKeyColumn(1);
		proxy.setFilterFixedString("Slovenia");

		expect(proxy.rowCount()).toBe(1);
		expect(view.verticalHeader().length()).toBe(CTableView.RowHeight);
		expect(proxy.data(proxy.index(0, 0))).toBe("Alice");
	});

	test("selection follows the same source item when a proxy is sorted", () => {
		const source = new TestTableModel([
			["Carol", "Italy", "50"],
			["Alice", "Slovenia", "30"],
			["Bob", "Austria", "40"]
		]);
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		view.setModel(proxy);
		const oldIndex = proxy.index(1, 0);
		view.selectionModel()?.select(oldIndex);
		view.setCurrentIndex(oldIndex);

		proxy.sort(0);

		const newIndex = proxy.index(0, 0);
		expect(proxy.data(newIndex)).toBe("Alice");
		expect(view.currentIndex().equals(newIndex)).toBe(true);
		expect(view.selectionModel()?.isSelected(newIndex)).toBe(true);
	});

	test("filtering preserves a selected item that remains visible", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		view.setModel(proxy);
		const oldIndex = proxy.index(0, 0);
		view.selectionModel()?.select(oldIndex);
		view.setCurrentIndex(oldIndex);

		proxy.setFilterFixedString("Slovenia");

		const newIndex = proxy.index(0, 0);
		expect(proxy.data(newIndex)).toBe("Alice");
		expect(view.currentIndex().equals(newIndex)).toBe(true);
		expect(view.selectionModel()?.isSelected(newIndex)).toBe(true);
	});

	test("filtering clears selection when the selected item is hidden", () => {
		const source = new TestTableModel();
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		view.setModel(proxy);
		const index = proxy.index(0, 0);
		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		proxy.setFilterFixedString("Austria");

		expect(view.currentIndex().isValid()).toBe(false);
		expect(view.selectionModel()?.hasSelection()).toBe(false);
	});

	test("editing a sorted proxy row commits to the mapped source row", () => {
		const source = new EditableTableModel([
			["Carol", "Italy", "50"],
			["Alice", "Slovenia", "30"],
			["Bob", "Austria", "40"]
		]);
		const proxy = new CSortFilterProxyModel();
		const view = new CTableView();
		proxy.setSourceModel(source);
		proxy.sort(0);
		view.setModel(proxy);

		const aliceProxyIndex = proxy.index(0, 0);
		expect(view.edit(aliceProxyIndex)).toBe(true);
		const editor = findEditor(view, CLineEdit)!;
		editor.setText("Alicia");
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(source.data(source.index(1, 0))).toBe("Alicia");
		expect(source.data(source.index(0, 0))).toBe("Carol");
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

	test("scrolling near the bottom fetches more rows", () => {
		const view = new CTableView();
		const model = new FetchMoreTableModel(
			Array.from({ length: 10 }, (_, row) => [`Row ${row}`]),
			[["Fetched row"]]
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setScrollY(1000);

		expect(model.fetchCalls).toBe(1);
		expect(model.rowCount()).toBe(11);
		expect(model.data(model.index(10, 0))).toBe("Fetched row");
	});

	test("scrolling away from the bottom does not fetch rows", () => {
		const view = new CTableView();
		const model = new FetchMoreTableModel(
			Array.from({ length: 20 }, (_, row) => [`Row ${row}`]),
			[["Fetched row"]]
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setScrollY(10);

		expect(model.fetchCalls).toBe(0);
		expect(model.rowCount()).toBe(20);
	});

	test("does not start duplicate fetches while one is pending", async () => {
		const view = new CTableView();
		const model = new PendingFetchTableModel(
			Array.from({ length: 10 }, (_, row) => [`Row ${row}`])
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setScrollY(1000);
		view.setScrollY(0);
		view.setScrollY(1000);

		expect(model.fetchCalls).toBe(1);

		model.finishFetch();
		await Promise.resolve();
	});

	test("table view fetches another SQL model page near the bottom", async () => {
		const rows = Array.from({ length: 12 }, (_, index) => ({
			id: index + 1,
			name: `Employee ${index + 1}`
		}));
		const adapter = new CMemorySqlTableAdapter({ employees: rows });
		const model = new CSqlTableModel(adapter);
		model.setTable("employees");
		model.setColumns(["id", "name"]);
		model.setFetchSize(4);
		await model.select();

		const view = new CTableView();
		view.resize(400, 90);
		view.setModel(model);
		view.setScrollY(1000);

		for (let i = 0; i < 4; ++i)
			await Promise.resolve();

		expect(model.rowCount()).toBe(8);
		expect(model.data(model.index(7, 1))).toBe("Employee 8");
		expect(model.canFetchMore()).toBe(true);
	});

	test("SQL row removal keeps selection on the same remaining item", async () => {
		const adapter = new CMemorySqlTableAdapter({
			employees: [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Carol" }
			]
		});
		const model = new CSqlTableModel(adapter);
		model.setTable("employees");
		model.setColumns(["id", "name"]);
		await model.select();
		const view = new CTableView();
		view.setModel(model);
		const carol = model.index(2, 1);
		view.setCurrentIndex(carol);
		view.selectionModel()!.select(carol);

		await model.removeRow(0);

		const movedCarol = model.index(1, 1);
		expect(model.data(movedCarol)).toBe("Carol");
		expect(view.currentIndex().equals(movedCarol)).toBe(true);
		expect(view.selectionModel()!.isSelected(movedCarol)).toBe(true);
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

	test("first arrow key selects first cell", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowRight")
		);

		const current = view.currentIndex();

		expect(current.row()).toBe(0);
		expect(current.column()).toBe(0);
		expect(view.selectionModel()?.isSelected(current)).toBe(true);
	});

	test("arrow right moves current cell right", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 1));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowRight")
		);

		expect(view.currentIndex().row()).toBe(1);
		expect(view.currentIndex().column()).toBe(2);
	});

	test("arrow left moves current cell left", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 1));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowLeft")
		);

		expect(view.currentIndex().row()).toBe(1);
		expect(view.currentIndex().column()).toBe(0);
	});

	test("arrow down moves current cell down", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 1));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);

		expect(view.currentIndex().row()).toBe(2);
		expect(view.currentIndex().column()).toBe(1);
	});

	test("arrow up moves current cell up", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 1));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowUp")
		);

		expect(view.currentIndex().row()).toBe(0);
		expect(view.currentIndex().column()).toBe(1);
	});

	test("arrow left stops at first column", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowLeft")
		);

		expect(view.currentIndex().row()).toBe(1);
		expect(view.currentIndex().column()).toBe(0);
	});

	test("arrow right stops at last column", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 2));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowRight")
		);

		expect(view.currentIndex().row()).toBe(1);
		expect(view.currentIndex().column()).toBe(2);
	});

	test("arrow up stops at first row", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 1));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowUp")
		);

		expect(view.currentIndex().row()).toBe(0);
		expect(view.currentIndex().column()).toBe(1);
	});

	test("arrow down stops at last row", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(2, 1));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);

		expect(view.currentIndex().row()).toBe(2);
		expect(view.currentIndex().column()).toBe(1);
	});

	test("keyboard navigation selects new current cell", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		const oldIndex = model.index(1, 1);

		view.selectionModel()?.select(oldIndex);
		view.setCurrentIndex(oldIndex);

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowRight")
		);

		const newIndex = model.index(1, 2);

		expect(view.currentIndex().equals(newIndex)).toBe(true);
		expect(view.selectionModel()?.isSelected(newIndex)).toBe(true);
		expect(view.selectionModel()?.isSelected(oldIndex)).toBe(false);
	});

	test("non-arrow key does not change current cell", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);

		const index = model.index(1, 1);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		const event =
			new CKeyEvent(CEventType.KeyPress, "A");

		view.contentKeyPressEvent(event);

		expect(view.currentIndex().equals(index)).toBe(true);
		expect(view.selectionModel()?.isSelected(index)).toBe(true);
		expect(event.isAccepted()).toBe(false);
	});

	test("arrow key is accepted", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 1));

		const event =
			new CKeyEvent(CEventType.KeyPress, "ArrowRight");

		view.contentKeyPressEvent(event);

		expect(event.isAccepted()).toBe(true);
	});

	test("keyboard navigation scrolls horizontally to current cell", () => {
		const view = new CTableView();

		const model = new TestTableModel([
			Array.from(
				{ length: 10 },
				(_, column) => `Column ${column}`
			)
		]);

		view.resize(400, 240);
		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		for (let i = 0; i < 9; i++) {
			view.contentKeyPressEvent(
				new CKeyEvent(
					CEventType.KeyPress,
					"ArrowRight"
				)
			);
		}

		expect(view.currentIndex().column()).toBe(9);
		expect(view.scrollX()).toBeGreaterThan(0);
		expect(view.horizontalHeader().offset())
			.toBe(view.scrollX());
	});

	test("keyboard navigation scrolls vertically to current cell", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		for (let i = 0; i < 19; i++) {
			view.contentKeyPressEvent(
				new CKeyEvent(
					CEventType.KeyPress,
					"ArrowDown"
				)
			);
		}

		expect(view.currentIndex().row()).toBe(19);
		expect(view.scrollY()).toBeGreaterThan(0);
		expect(view.verticalHeader().offset())
			.toBe(view.scrollY());
	});

	test("keyboard navigation scrolls back to first column", () => {
		const view = new CTableView();

		const model = new TestTableModel([
			Array.from(
				{ length: 10 },
				(_, column) => `Column ${column}`
			)
		]);

		view.resize(400, 240);
		view.setModel(model);
		view.setCurrentIndex(model.index(0, 9));

		for (let i = 0; i < 9; i++) {
			view.contentKeyPressEvent(
				new CKeyEvent(
					CEventType.KeyPress,
					"ArrowLeft"
				)
			);
		}

		expect(view.currentIndex().column()).toBe(0);
		expect(view.scrollX()).toBe(0);
		expect(view.horizontalHeader().offset()).toBe(0);
	});

	test("keyboard navigation scrolls back to first row", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setCurrentIndex(model.index(19, 0));

		for (let i = 0; i < 19; i++) {
			view.contentKeyPressEvent(
				new CKeyEvent(
					CEventType.KeyPress,
					"ArrowUp"
				)
			);
		}

		expect(view.currentIndex().row()).toBe(0);
		expect(view.scrollY()).toBe(0);
		expect(view.verticalHeader().offset()).toBe(0);
	});

	test("home moves to first column", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 2));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "Home")
		);

		expect(view.currentIndex().row()).toBe(1);
		expect(view.currentIndex().column()).toBe(0);
	});

	test("end moves to last column", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "End")
		);

		expect(view.currentIndex().row()).toBe(1);
		expect(view.currentIndex().column()).toBe(2);
	});

	test("ctrl home moves to first cell", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(2, 2));

		view.contentKeyPressEvent(
			new CKeyEvent(
				CEventType.KeyPress,
				"Home",
				true
			)
		);

		expect(view.currentIndex().row()).toBe(0);
		expect(view.currentIndex().column()).toBe(0);
	});

	test("ctrl end moves to last cell", () => {
		const view = new CTableView();
		const model = new TestTableModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		view.contentKeyPressEvent(
			new CKeyEvent(
				CEventType.KeyPress,
				"End",
				true
			)
		);

		expect(view.currentIndex().row()).toBe(2);
		expect(view.currentIndex().column()).toBe(2);
	});

	test("page down moves by visible page", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		const pageRows = Math.floor(
			view.viewport().height()
				/ CTableView.RowHeight
		);

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "PageDown")
		);

		expect(view.currentIndex().row()).toBe(pageRows);
		expect(view.currentIndex().column()).toBe(0);
	});

	test("page up moves by visible page", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);

		const pageRows = Math.floor(
			view.viewport().height()
				/ CTableView.RowHeight
		);

		view.setCurrentIndex(
			model.index(pageRows + 2, 0)
		);

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "PageUp")
		);

		expect(view.currentIndex().row()).toBe(2);
		expect(view.currentIndex().column()).toBe(0);
	});

	test("page down stops at last row", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setCurrentIndex(model.index(18, 0));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "PageDown")
		);

		expect(view.currentIndex().row()).toBe(19);
	});

	test("page up stops at first row", () => {
		const view = new CTableView();

		const model = new TestTableModel(
			Array.from(
				{ length: 20 },
				(_, row) => [`Row ${row}`]
			)
		);

		view.resize(400, 120);
		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "PageUp")
		);

		expect(view.currentIndex().row()).toBe(0);
	});

	test("has a default item delegate", () => {
		const view = new CTableView();

		expect(view.itemDelegate()).toBeInstanceOf(CItemDelegate);
	});

	test("sets the default item delegate", () => {
		const view = new CTableView();
		const delegate = new TestItemDelegate();

		view.setItemDelegate(delegate);

		expect(view.itemDelegate()).toBe(delegate);
	});

	test("setting the same default delegate keeps it", () => {
		const view = new CTableView();
		const delegate = new TestItemDelegate();

		view.setItemDelegate(delegate);
		view.setItemDelegate(delegate);

		expect(view.itemDelegate()).toBe(delegate);
	});

	test("uses a row delegate for an index in that row", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegateForRow(1, delegate);

		expect(view.itemDelegateForIndex(model.index(1, 2))).toBe(delegate);
	});

	test("uses a column delegate for an index in that column", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegateForColumn(2, delegate);

		expect(view.itemDelegateForIndex(model.index(1, 2))).toBe(delegate);
	});

	test("row delegate has priority over column delegate", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const rowDelegate = new TestItemDelegate();
		const columnDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegateForRow(1, rowDelegate);
		view.setItemDelegateForColumn(2, columnDelegate);

		expect(view.itemDelegateForIndex(model.index(1, 2)))
			.toBe(rowDelegate);
	});

	test("removing a row delegate reveals the column delegate", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const rowDelegate = new TestItemDelegate();
		const columnDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegateForRow(1, rowDelegate);
		view.setItemDelegateForColumn(2, columnDelegate);
		view.setItemDelegateForRow(1, null);

		expect(view.itemDelegateForIndex(model.index(1, 2)))
			.toBe(columnDelegate);
	});

	test("removing a column delegate restores the default delegate", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const defaultDelegate = new TestItemDelegate();
		const columnDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(defaultDelegate);
		view.setItemDelegateForColumn(2, columnDelegate);
		view.setItemDelegateForColumn(2, null);

		expect(view.itemDelegateForIndex(model.index(1, 2)))
			.toBe(defaultDelegate);
	});

	test("row delegate does not affect another row", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const defaultDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(defaultDelegate);
		view.setItemDelegateForRow(1, new TestItemDelegate());

		expect(view.itemDelegateForIndex(model.index(0, 2)))
			.toBe(defaultDelegate);
	});

	test("column delegate does not affect another column", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const defaultDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(defaultDelegate);
		view.setItemDelegateForColumn(2, new TestItemDelegate());

		expect(view.itemDelegateForIndex(model.index(1, 1)))
			.toBe(defaultDelegate);
	});

	test("cannot edit without a model", () => {
		const view = new CTableView();

		expect(view.edit(new CModelIndex())).toBe(false);
	});

	test("cannot edit an invalid index", () => {
		const view = new CTableView();
		const model = new EditableTableModel();

		view.setModel(model);

		expect(view.edit(new CModelIndex())).toBe(false);
	});

	test("cannot edit an index from another model", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const otherModel = new EditableTableModel();

		view.setModel(model);

		expect(view.edit(otherModel.index(0, 0))).toBe(false);
	});

	test("cannot edit a non-editable index", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		model.setEditable(false);
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(model.index(0, 0))).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(0);
	});

	test("edit fails when the delegate creates no editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		delegate.createEditorResult = false;
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(model.index(0, 0))).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(1);
	});

	test("edit asks the selected delegate to create an editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 2);

		view.setModel(model);
		view.setItemDelegateForRow(1, delegate);
		view.edit(index);

		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.index.equals(index)).toBe(true);
	});

	test("editor is parented to the table content widget", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		expect(delegate.lastEditor?.parent()).not.toBeNull();
		expect(delegate.lastEditor?.parent()?.parent()).toBe(view.viewport());
	});

	test("edit asks the delegate to populate the editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 1);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);

		expect(delegate.setEditorDataCalls).toHaveLength(1);
		expect(delegate.setEditorDataCalls[0]?.editor).toBe(delegate.lastEditor);
		expect(delegate.setEditorDataCalls[0]?.index.equals(index)).toBe(true);
	});

	test("edit sets editor geometry to the visual rectangle", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 2);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);

		const editor = delegate.lastEditor;
		const rect = view.visualRect(index);

		expect(editor?.x()).toBe(rect.x());
		expect(editor?.y()).toBe(rect.y());
		expect(editor?.width()).toBe(rect.width());
		expect(editor?.height()).toBe(rect.height());
	});

	test("edit shows the editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		expect(delegate.lastEditor?.isVisible()).toBe(true);
	});

	test("edit gives focus to the editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		expect(delegate.lastEditor?.hasFocus()).toBe(true);
	});

	test("editing the same index reuses the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const index = model.index(0, 0);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);
		view.edit(index);

		expect(delegate.createEditorCalls).toHaveLength(1);
	});

	test("editing another index commits and replaces the editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const firstEditor = delegate.lastEditor;

		view.edit(model.index(1, 1));

		expect(delegate.setModelDataCalls).toHaveLength(1);
		expect(firstEditor?.parent()).toBeNull();
		expect(delegate.createEditorCalls).toHaveLength(2);
		expect(delegate.lastEditor).not.toBe(firstEditor);
	});

	test("delegate commitData writes editor data to the model", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 1);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);

		const editor = delegate.lastEditor!;
		delegate.commitData.emit(editor);

		expect(delegate.setModelDataCalls).toHaveLength(1);
		expect(delegate.setModelDataCalls[0]?.editor).toBe(editor);
		expect(delegate.setModelDataCalls[0]?.model).toBe(model);
		expect(delegate.setModelDataCalls[0]?.index.equals(index)).toBe(true);
	});

	test("delegate closeEditor destroys the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		delegate.closeEditor.emit(editor);

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("model reset closes the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		model.setTable([["Changed"]]);

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("changing the default delegate closes the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		view.setItemDelegate(new TestItemDelegate());

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("commitData from another editor is ignored", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const otherEditor = new CWidget();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		delegate.commitData.emit(otherEditor);

		expect(delegate.setModelDataCalls).toHaveLength(0);
	});

	test("closeEditor from another editor is ignored", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const otherEditor = new CWidget();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		delegate.closeEditor.emit(otherEditor);

		expect(editor.parent()).not.toBeNull();
		expect(editor.isVisible()).toBe(true);
	});

	test("changing model closes the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		view.setModel(new EditableTableModel());

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("setting null model closes the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		view.setModel(null);

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("changing a row delegate closes the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		view.setItemDelegateForRow(1, new TestItemDelegate());

		expect(editor.parent()).toBeNull();
	});

	test("changing a column delegate closes the current editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		view.setItemDelegateForColumn(1, new TestItemDelegate());

		expect(editor.parent()).toBeNull();
	});

	test("resizing a section updates current editor geometry", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);

		const callsBeforeResize = delegate.updateEditorGeometryCalls.length;
		view.horizontalHeader().resizeSection(1, 175);

		expect(delegate.updateEditorGeometryCalls)
			.toHaveLength(callsBeforeResize + 1);
		expect(delegate.lastEditor?.width()).toBe(175);
	});

	test("commitData after editor was closed is ignored", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		const editor = delegate.lastEditor!;
		delegate.closeEditor.emit(editor);
		delegate.commitData.emit(editor);

		expect(delegate.setModelDataCalls).toHaveLength(0);
	});

	test("delegate signals are connected only once", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.setItemDelegateForRow(0, delegate);
		view.setItemDelegateForColumn(0, delegate);
		view.edit(model.index(0, 0));
		delegate.commitData.emit(delegate.lastEditor!);

		expect(delegate.setModelDataCalls).toHaveLength(1);
	});

	test("F2 opens a spin box supplied by the column delegate", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const delegate = new CIntItemDelegate();
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.setCurrentIndex(index);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "F2")
		);

		const editor = findEditor(view, CSpinBox);
		expect(editor).not.toBeNull();
		expect(editor?.value()).toBe(30);
		expect(editor?.hasFocus()).toBe(true);
	});

	test("double click opens a double spin box for its column", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const delegate = new CDoubleItemDelegate();
		delegate.setRange(0, 2000);
		const x = view.horizontalHeader().sectionPosition(2) + 10;

		view.setModel(model);
		view.setItemDelegateForColumn(2, delegate);
		view.contentMouseDoubleClickEvent(mouseDoubleClick(x, 5));

		const editor = findEditor(view, CDoubleSpinBox);
		expect(editor).not.toBeNull();
		expect(editor?.value()).toBe(1250.5);
		expect(view.currentIndex().equals(model.index(0, 2))).toBe(true);
	});

	test("Enter commits an integer as a number and closes the editor", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const delegate = new CIntItemDelegate();
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.edit(index);

		const editor = findEditor(view, CSpinBox)!;
		editor.setValue(73);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(model.data(index)).toBe(73);
		expect(typeof model.data(index)).toBe("number");
		expect(editor.parent()).toBeNull();
	});

	test("Enter commits a double as a number and closes the editor", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const delegate = new CDoubleItemDelegate();
		delegate.setRange(0, 2000);
		const index = model.index(0, 2);

		view.setModel(model);
		view.setItemDelegateForColumn(2, delegate);
		view.edit(index);

		const editor = findEditor(view, CDoubleSpinBox)!;
		editor.setValue(1444.75);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(model.data(index)).toBe(1444.75);
		expect(typeof model.data(index)).toBe("number");
		expect(editor.parent()).toBeNull();
	});

	test("Escape closes a numeric editor without changing the model", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const delegate = new CIntItemDelegate();
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.edit(index);

		const editor = findEditor(view, CSpinBox)!;
		editor.setValue(73);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));

		expect(model.data(index)).toBe(30);
		expect(editor.parent()).toBeNull();
	});

	test("a numeric row delegate takes priority over a column delegate", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const rowDelegate = new CIntItemDelegate();
		const columnDelegate = new CDoubleItemDelegate();
		rowDelegate.setRange(0, 2000);
		columnDelegate.setRange(0, 2000);

		view.setModel(model);
		view.setItemDelegateForColumn(2, columnDelegate);
		view.setItemDelegateForRow(1, rowDelegate);
		view.edit(model.index(1, 2));

		expect(findEditor(view, CSpinBox)).not.toBeNull();
		expect(findEditor(view, CDoubleSpinBox)).toBeNull();
	});

	test("removing a numeric column delegate restores automatic selection", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();

		view.setModel(model);
		view.setItemDelegateForColumn(1, new CIntItemDelegate());
		view.setItemDelegateForColumn(1, null);
		view.edit(model.index(0, 1));

		expect(view.itemDelegateForIndex(model.index(0, 1)))
			.toBe(view.itemDelegate());
		expect(findEditor(view, CSpinBox)).not.toBeNull();
		expect(findEditor(view, CDoubleSpinBox)).toBeNull();
	});

	test("F2 does not open an editor for boolean data", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 3);

		view.setModel(model);
		view.setCurrentIndex(index);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "F2")
		);

		expect(model.data(index)).toBe(true);
	});

	test("clicking a boolean indicator toggles its value", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 3);

		view.setModel(model);
		view.contentMousePressEvent(mousePress(420, 12));

		expect(model.data(index)).toBe(false);
		expect(typeof model.data(index)).toBe("boolean");
		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("Space toggles boolean data in the current cell", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 3);

		view.setModel(model);
		view.setCurrentIndex(index);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, " ")
		);

		expect(model.data(index)).toBe(false);
	});

	test("F2 automatically opens a date edit for Date data", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);

		view.setModel(model);
		view.setCurrentIndex(index);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "F2")
		);

		const editor = findEditor(view, CDateEdit);
		expect(editor).not.toBeNull();
		expect(editor?.date().getTime())
			.toBe((model.data(index) as Date).getTime());
		expect(editor?.lineEdit().hasFocus()).toBe(true);
	});

	test("Enter commits a Date and closes its automatic editor", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);
		const date = new Date(2028, 6, 21);

		view.setModel(model);
		view.edit(index);

		const editor = findEditor(view, CDateEdit)!;
		editor.setDate(date);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(model.data(index)).toBeInstanceOf(Date);
		expect((model.data(index) as Date).getTime()).toBe(date.getTime());
		expect(editor.parent()).toBeNull();
	});

	test("Escape closes a date editor without changing the model", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);
		const originalTime = (model.data(index) as Date).getTime();

		view.setModel(model);
		view.edit(index);

		const editor = findEditor(view, CDateEdit)!;
		editor.setDate(new Date(2030, 0, 1));
		editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));

		expect((model.data(index) as Date).getTime()).toBe(originalTime);
		expect(editor.parent()).toBeNull();
	});

	test("a date column delegate opens CDateEdit and commits its value", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);
		const value = new Date(2031, 4, 17);

		view.setModel(model);
		view.setItemDelegateForColumn(4, new CDateItemDelegate());
		view.edit(index);

		const editor = findEditor(view, CDateEdit)!;
		expect(editor.lineEdit().hasFocus()).toBe(true);
		editor.setDate(value);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect((model.data(index) as Date).getTime()).toBe(value.getTime());
		expect(editor.parent()).toBeNull();
	});

	test("a time column delegate opens CTimeEdit and commits its value", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);
		const value = new Date(1970, 0, 1, 14, 35, 20);

		view.setModel(model);
		view.setItemDelegateForColumn(4, new CTimeItemDelegate());
		view.edit(index);

		const editor = findEditor(view, CTimeEdit)!;
		expect(editor.lineEdit().hasFocus()).toBe(true);
		editor.setTime(value);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		const result = model.data(index) as Date;
		expect([result.getHours(), result.getMinutes(), result.getSeconds()])
			.toEqual([14, 35, 20]);
		expect(editor.parent()).toBeNull();
	});

	test("a date-time column delegate opens CDateTimeEdit and commits its value", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);
		const value = new Date(2032, 8, 21, 16, 45, 30);

		view.setModel(model);
		view.setItemDelegateForColumn(4, new CDateTimeItemDelegate());
		view.edit(index);

		const editor = findEditor(view, CDateTimeEdit)!;
		expect(editor.dateLineEdit().hasFocus()).toBe(true);
		editor.setDateTime(value);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect((model.data(index) as Date).getTime()).toBe(value.getTime());
		expect(editor.parent()).toBeNull();
	});

	test("a date-time delegate commits a value entered with numeric keys", () => {
		const view = new CTableView();
		const model = new NumericEditableTableModel();
		const index = model.index(0, 4);

		view.setModel(model);
		view.setItemDelegateForColumn(4, new CDateTimeItemDelegate());
		view.edit(index);

		const editor = findEditor(view, CDateTimeEdit)!;
		editor.dateLineEdit().setCurrentSection(0);
		for (const key of ["2", "5", "1", "2", "2", "0", "3", "1"])
			editor.dateLineEdit().event(new CKeyEvent(CEventType.KeyPress, key));
		for (const key of ["1", "4", "4", "5"])
			editor.timeLineEdit().event(new CKeyEvent(CEventType.KeyPress, key));
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		const result = model.data(index) as Date;
		expect([
			result.getFullYear(), result.getMonth(), result.getDate(),
			result.getHours(), result.getMinutes()
		]).toEqual([2031, 11, 25, 14, 45]);
		expect(editor.parent()).toBeNull();
	});

	test("F2 opens a combo box supplied by the column delegate", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new CComboBoxItemDelegate([
			"Slovenia",
			"Austria",
			"Italy"
		]);
		const index = model.index(1, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.setCurrentIndex(index);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "F2")
		);

		const editor = findEditor(view, CComboBox);
		expect(editor).not.toBeNull();
		expect(editor?.currentText()).toBe("Austria");
		expect(editor?.popup().isOpen()).toBe(true);
		expect(editor?.listWidget().hasFocus()).toBe(true);
	});

	test("a combo-box editor displays a missing value without adding it", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new CComboBoxItemDelegate(["Austria", "Italy"]);
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.edit(index);

		const editor = findEditor(view, CComboBox)!;
		expect(editor.currentText()).toBe("Slovenia");
		expect(editor.findText("Slovenia")).toBe(-1);
		expect(editor.count()).toBe(2);
		expect(editor.popup().isOpen()).toBe(true);
	});

	test("Enter commits a combo-box value and closes the editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new CComboBoxItemDelegate([
			"Slovenia",
			"Austria",
			"Italy"
		]);
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.edit(index);

		const editor = findEditor(view, CComboBox)!;
		editor.setCurrentText("Italy");
		editor.hidePopup();
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(model.data(index)).toBe("Italy");
		expect(editor.parent()).toBeNull();
	});

	test("Escape closes a combo-box editor without changing the model", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new CComboBoxItemDelegate([
			"Slovenia",
			"Austria",
			"Italy"
		]);
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.edit(index);

		const editor = findEditor(view, CComboBox)!;
		editor.setCurrentText("Italy");
		editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));

		expect(model.data(index)).toBe("Slovenia");
		expect(editor.parent()).toBeNull();
	});

	test("activating a combo-box item commits it immediately", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new CComboBoxItemDelegate([
			"Slovenia",
			"Austria",
			"Italy"
		]);
		const index = model.index(0, 1);

		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);
		view.edit(index);

		const editor = findEditor(view, CComboBox)!;
		editor.setCurrentIndex(2);
		editor.activated.emit(2);

		expect(model.data(index)).toBe("Italy");
		expect(editor.parent()).toBeNull();
	});

	test("double click selects and starts editing the cell", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const x = view.horizontalHeader().sectionPosition(1) + 10;
		const y = CTableView.RowHeight + 5;
		const event = mouseDoubleClick(x, y);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		const index = model.index(1, 1);
		expect(view.currentIndex().equals(index)).toBe(true);
		expect(view.selectionModel()?.isSelected(index)).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.index.equals(index)).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("double click on a non-editable cell selects it without an editor", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();

		model.setEditable(false);
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(mouseDoubleClick(10, 10));

		expect(view.currentIndex().equals(model.index(0, 0))).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(0);
	});

	test("double click outside the table is ignored", () => {
		const view = new CTableView();
		const model = new EditableTableModel();
		const delegate = new TestItemDelegate();
		const event = mouseDoubleClick(10, 20 * CTableView.RowHeight);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		expect(view.currentIndex().isValid()).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(0);
		expect(event.isAccepted()).toBe(false);
	});

	test("a relational SQL delegate edits a foreign key through a combo box", async () => {
		const adapter = new CMemorySqlTableAdapter({
			employees: [{ id: 1, name: "Alice", country_id: 2 }],
			countries: [
				{ id: 1, name: "Slovenia" },
				{ id: 2, name: "Austria" }
			]
		});
		const model = new CSqlRelationalTableModel(adapter);
		model.setTable("employees");
		model.setColumns(["id", "name", "country_id"]);
		model.setRelation(2, new CSqlRelation("countries", "id", "name"));
		model.setEditStrategy(CSqlEditStrategy.OnManualSubmit);
		await model.select();
		const view = new CTableView();
		view.setModel(model);
		view.setItemDelegate(new CSqlRelationalDelegate());
		const index = model.index(0, 2);

		expect(view.edit(index)).toBe(true);
		const editor = findEditor(view, CComboBox)!;
		expect(editor.currentText()).toBe("Austria");
		expect(editor.popup().isOpen()).toBe(true);

		editor.setCurrentIndex(0);
		editor.activated.emit(0);

		expect(model.rawData(index)).toBe(1);
		expect(model.data(index)).toBe("Slovenia");
		expect(editor.parent()).toBeNull();
	});
});
