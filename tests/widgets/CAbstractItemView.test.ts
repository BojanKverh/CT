import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CAbstractItemView } from "../../src/widgets/CAbstractItemView.js";
import { CAbstractItemDelegate } from "../../src/widgets/CAbstractItemDelegate.js";
import { CItemDelegate } from "../../src/widgets/CItemDelegate.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CAbstractItemModel } from "../../src/models/CAbstractItemModel.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CRect } from "../../src/geometry/CRect.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestModel extends CAbstractTableModel {
	#m_data = [["A", "B"], ["C", "D"]];
	#m_editable = true;

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
		return this.#m_editable;
	}

	setEditable(editable: boolean): void {
		this.#m_editable = editable;
	}

	change(row: number, column: number, value: string): void {
		this.#m_data[row]![column] = value;
		const index = this.index(row, column);
		this.emitDataChanged(index, index);
	}

	reset(): void {
		this.resetModel();
	}

	changeLayout(
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): void {
		this.beginLayoutChange();
		this.endLayoutChange(oldIndexes, newIndexes);
	}
}

class TestDelegate extends CAbstractItemDelegate {
	createEditorCalls = 0;
	setEditorDataCalls = 0;
	setModelDataCalls = 0;
	updateGeometryCalls = 0;
	lastEditor: CWidget | null = null;
	lastIndex = new CModelIndex();
	createEditorResult = true;

	override createEditor(parent: CWidget, index: CModelIndex): CWidget | null {
		++this.createEditorCalls;
		this.lastIndex = index;

		if (!this.createEditorResult)
			return null;

		this.lastEditor = new CWidget(parent);
		this.lastEditor.setFocusPolicy(CFocusPolicy.StrongFocus);
		return this.lastEditor;
	}

	override setEditorData(_editor: CWidget, index: CModelIndex): void {
		++this.setEditorDataCalls;
		this.lastIndex = index;
	}

	override setModelData(
		_editor: CWidget,
		_model: CAbstractItemModel,
		index: CModelIndex
	): void {
		++this.setModelDataCalls;
		this.lastIndex = index;
	}

	override updateEditorGeometry(editor: CWidget, rect: CRect): void {
		++this.updateGeometryCalls;
		super.updateEditorGeometry(editor, rect);
	}
}

class TestItemView extends CAbstractItemView {
	readonly host: CWidget;
	modelChangedCalls: Array<{
		oldModel: CAbstractItemModel | null;
		newModel: CAbstractItemModel | null;
	}> = [];
	modelDataChangedCalls = 0;
	modelResetCalls = 0;
	modelLayoutChangedCalls = 0;
	currentIndexChangedCalls: CModelIndex[] = [];
	editorClosedCalls = 0;

	constructor(parent: CWidget | null = null) {
		super(parent);
		this.host = new CWidget(this);
	}

	override visualRect(index: CModelIndex): CRect {
		if (!index.isValid() || index.model() !== this.model())
			return new CRect();

		return new CRect(index.column() * 100, index.row() * 25, 100, 25);
	}

	refreshEditorGeometry(): void {
		this.updateEditorGeometry();
	}

	protected override editorParent(): CWidget {
		return this.host;
	}

	protected override modelChanged(
		oldModel: CAbstractItemModel | null,
		newModel: CAbstractItemModel | null
	): void {
		this.modelChangedCalls.push({ oldModel, newModel });
	}

	protected override modelDataChanged(): void {
		++this.modelDataChangedCalls;
	}

	protected override modelReset(): void {
		++this.modelResetCalls;
	}

	protected override modelLayoutChanged(): void {
		++this.modelLayoutChangedCalls;
	}

	protected override currentIndexChanged(index: CModelIndex): void {
		this.currentIndexChangedCalls.push(index);
	}

	protected override editorClosed(): void {
		++this.editorClosedCalls;
	}
}

describe("CAbstractItemView", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("constructs without model or selection model", () => {
		const view = new TestItemView();

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("has a default item delegate", () => {
		expect(new TestItemView().itemDelegate()).toBeInstanceOf(CItemDelegate);
	});

	test("sets model and creates selection model", () => {
		const view = new TestItemView();
		const model = new TestModel();

		view.setModel(model);

		expect(view.model()).toBe(model);
		expect(view.selectionModel()?.model()).toBe(model);
	});

	test("modelChanged receives old and new model", () => {
		const view = new TestItemView();
		const model1 = new TestModel();
		const model2 = new TestModel();

		view.setModel(model1);
		view.setModel(model2);

		expect(view.modelChangedCalls).toEqual([
			{ oldModel: null, newModel: model1 },
			{ oldModel: model1, newModel: model2 }
		]);
	});

	test("setting same model does nothing", () => {
		const view = new TestItemView();
		const model = new TestModel();

		view.setModel(model);
		const selectionModel = view.selectionModel();
		view.setModel(model);

		expect(view.modelChangedCalls).toHaveLength(1);
		expect(view.selectionModel()).toBe(selectionModel);
	});

	test("setting null removes selection model", () => {
		const view = new TestItemView();
		view.setModel(new TestModel());

		view.setModel(null);

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
	});

	test("data change calls modelDataChanged", () => {
		const view = new TestItemView();
		const model = new TestModel();
		view.setModel(model);

		model.change(0, 0, "X");

		expect(view.modelDataChangedCalls).toBe(1);
	});

	test("old model data change is disconnected", () => {
		const view = new TestItemView();
		const oldModel = new TestModel();
		view.setModel(oldModel);
		view.setModel(new TestModel());

		oldModel.change(0, 0, "X");

		expect(view.modelDataChangedCalls).toBe(0);
	});

	test("model reset calls hook and clears selection", () => {
		const view = new TestItemView();
		const model = new TestModel();
		view.setModel(model);
		const index = model.index(0, 0);
		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model.reset();

		expect(view.modelResetCalls).toBe(1);
		expect(view.selectionModel()?.hasSelection()).toBe(false);
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("old model reset is disconnected", () => {
		const view = new TestItemView();
		const oldModel = new TestModel();
		view.setModel(oldModel);
		view.setModel(new TestModel());

		oldModel.reset();

		expect(view.modelResetCalls).toBe(0);
	});

	test("model layout change remaps current index and selection", () => {
		const view = new TestItemView();
		const model = new TestModel();
		view.setModel(model);
		const oldCurrent = model.index(0, 0);
		const oldSelected = model.index(1, 1);
		const newCurrent = model.index(1, 0);
		const newSelected = model.index(0, 1);
		view.setCurrentIndex(oldCurrent);
		view.selectionModel()?.select(oldSelected);

		model.changeLayout(
			[oldCurrent, oldSelected],
			[newCurrent, newSelected]
		);

		expect(view.currentIndex().equals(newCurrent)).toBe(true);
		expect(view.selectionModel()?.isSelected(newSelected)).toBe(true);
		expect(view.modelLayoutChangedCalls).toBe(1);
		expect(view.modelResetCalls).toBe(0);
	});

	test("old model layout change is disconnected", () => {
		const view = new TestItemView();
		const oldModel = new TestModel();
		view.setModel(oldModel);
		view.setModel(new TestModel());

		oldModel.changeLayout(
			[oldModel.index(0, 0)],
			[oldModel.index(1, 0)]
		);

		expect(view.modelLayoutChangedCalls).toBe(0);
	});

	test("active editor follows its index after a layout change", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		const oldIndex = model.index(0, 1);
		const newIndex = model.index(1, 1);
		view.edit(oldIndex);
		const editor = delegate.lastEditor!;

		model.changeLayout([oldIndex], [newIndex]);

		expect(editor.parent()).toBe(view.host);
		expect(editor.x()).toBe(100);
		expect(editor.y()).toBe(25);
		expect(editor.width()).toBe(100);
		expect(editor.height()).toBe(25);
		expect(delegate.updateGeometryCalls).toBe(2);
	});

	test("active editor closes if its index disappears", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		const index = model.index(0, 0);
		view.edit(index);
		const editor = delegate.lastEditor!;

		model.changeLayout([index], [new CModelIndex()]);

		expect(editor.parent()).toBeNull();
		expect(view.editorClosedCalls).toBe(1);
	});

	test("sets current index and calls hook", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const index = model.index(1, 1);
		view.setModel(model);

		view.setCurrentIndex(index);

		expect(view.currentIndex().equals(index)).toBe(true);
		expect(view.currentIndexChangedCalls[0]?.equals(index)).toBe(true);
	});

	test("rejects current index from another model", () => {
		const view = new TestItemView();
		view.setModel(new TestModel());

		view.setCurrentIndex(new TestModel().index(0, 0));

		expect(view.currentIndex().isValid()).toBe(false);
		expect(view.currentIndexChangedCalls).toHaveLength(0);
	});

	test("sets default delegate", () => {
		const view = new TestItemView();
		const delegate = new TestDelegate();
		view.setItemDelegate(delegate);

		expect(view.itemDelegate()).toBe(delegate);
	});

	test("row delegate overrides column delegate", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const rowDelegate = new TestDelegate();
		const columnDelegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegateForColumn(1, columnDelegate);
		view.setItemDelegateForRow(1, rowDelegate);

		expect(view.itemDelegateForIndex(model.index(1, 1))).toBe(rowDelegate);
	});

	test("removing row delegate reveals column delegate", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const rowDelegate = new TestDelegate();
		const columnDelegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegateForColumn(1, columnDelegate);
		view.setItemDelegateForRow(1, rowDelegate);

		view.setItemDelegateForRow(1, null);

		expect(view.itemDelegateForIndex(model.index(1, 1))).toBe(columnDelegate);
	});

	test("removing column delegate restores default delegate", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegateForColumn(1, delegate);

		view.setItemDelegateForColumn(1, null);

		expect(view.itemDelegateForIndex(model.index(0, 1)))
			.toBe(view.itemDelegate());
	});

	test("cannot edit without model", () => {
		expect(new TestItemView().edit(new CModelIndex())).toBe(false);
	});

	test("cannot edit foreign or invalid index", () => {
		const view = new TestItemView();
		view.setModel(new TestModel());

		expect(view.edit(new CModelIndex())).toBe(false);
		expect(view.edit(new TestModel().index(0, 0))).toBe(false);
	});

	test("cannot edit non-editable index", () => {
		const view = new TestItemView();
		const model = new TestModel();
		model.setEditable(false);
		view.setModel(model);

		expect(view.edit(model.index(0, 0))).toBe(false);
	});

	test("returns false when delegate creates no editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		delegate.createEditorResult = false;
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(model.index(0, 0))).toBe(false);
		expect(delegate.createEditorCalls).toBe(1);
	});

	test("creates, populates, positions and focuses editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		const index = model.index(1, 1);
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(index)).toBe(true);

		const editor = delegate.lastEditor!;
		expect(editor.parent()).toBe(view.host);
		expect(delegate.setEditorDataCalls).toBe(1);
		expect(editor.geometry().x()).toBe(100);
		expect(editor.geometry().y()).toBe(25);
		expect(editor.width()).toBe(100);
		expect(editor.height()).toBe(25);
		expect(editor.hasFocus()).toBe(true);
	});

	test("editing same index reuses editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		const index = model.index(0, 0);
		view.setModel(model);
		view.setItemDelegate(delegate);

		view.edit(index);
		view.edit(index);

		expect(delegate.createEditorCalls).toBe(1);
	});

	test("editing another index commits and replaces editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const oldEditor = delegate.lastEditor!;

		view.edit(model.index(1, 1));

		expect(delegate.setModelDataCalls).toBe(1);
		expect(delegate.createEditorCalls).toBe(2);
		expect(oldEditor.parent()).toBeNull();
		expect(view.editorClosedCalls).toBe(1);
	});

	test("commitData commits only current editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		delegate.commitData.emit(new CWidget());
		expect(delegate.setModelDataCalls).toBe(0);

		delegate.commitData.emit(delegate.lastEditor!);
		expect(delegate.setModelDataCalls).toBe(1);
	});

	test("closeEditor closes only current editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;

		delegate.closeEditor.emit(new CWidget());
		expect(editor.parent()).toBe(view.host);

		delegate.closeEditor.emit(editor);
		expect(editor.parent()).toBeNull();
		expect(view.editorClosedCalls).toBe(1);
	});

	test("model change closes editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;

		view.setModel(new TestModel());

		expect(editor.parent()).toBeNull();
		expect(view.editorClosedCalls).toBe(1);
	});

	test("model reset closes editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;

		model.reset();

		expect(editor.parent()).toBeNull();
		expect(view.editorClosedCalls).toBe(1);
	});

	test("changing delegate closes editor", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;

		view.setItemDelegate(new TestDelegate());

		expect(editor.parent()).toBeNull();
		expect(view.editorClosedCalls).toBe(1);
	});

	test("updates active editor geometry", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));

		view.refreshEditorGeometry();

		expect(delegate.updateGeometryCalls).toBe(2);
	});

	test("connects delegate signals only once", () => {
		const view = new TestItemView();
		const model = new TestModel();
		const delegate = new TestDelegate();
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.setItemDelegateForRow(0, delegate);
		view.setItemDelegateForColumn(0, delegate);
		view.edit(model.index(0, 0));

		delegate.commitData.emit(delegate.lastEditor!);

		expect(delegate.setModelDataCalls).toBe(1);
	});
});
