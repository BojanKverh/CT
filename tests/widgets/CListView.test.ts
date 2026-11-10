import { CPushButton } from "../../src/widgets/CPushButton.js";
import { vi } from "vitest";
import { CListViewMode } from "../../src/widgets/CListViewHelper.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import type { CIcon } from "../../src/gui/CIcon.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CAbstractItemModel } from "../../src/models/CAbstractItemModel.js";
import { CAbstractListModel } from "../../src/models/CAbstractListModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CAbstractItemDelegate } from "../../src/widgets/CAbstractItemDelegate.js";
import { CItemDelegate } from "../../src/widgets/CItemDelegate.js";
import { CListView } from "../../src/widgets/CListView.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestListModel extends CAbstractListModel {
	#m_items: string[];

	constructor(items: string[] = ["One", "Two", "Three"]) {
		super();
		this.#m_items = items;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_items.length;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_items[index.row()] ?? null;
	}

	setItem(row: number, text: string): void {
		if (row < 0 || row >= this.#m_items.length)
			return;

		this.#m_items[row] = text;

		const index = this.index(row, 0);
		this.emitDataChanged(index, index);
	}

	setItems(items: string[]): void {
		this.#m_items = items;
		this.resetModel();
	}
}

class EditableListModel extends TestListModel {
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

		this.setItem(index.row(), String(value));
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

describe("CListView", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

    afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

    test.each([CListViewMode.ListMode, CListViewMode.IconMode])(
        "paints only visible items in mode %s", mode => {
            class LargeModel extends CAbstractListModel {
                readonly indexed: number[] = [];
                readonly painted: number[] = [];
                override rowCount(): number { return 100_000; }
                override index(row: number, column: number, parent?: CModelIndex): CModelIndex {
                    this.indexed.push(row);
                    return super.index(row, column, parent);
                }
                override data(index: CModelIndex): string {
                    this.painted.push(index.row());
                    return String(index.row());
                }
            }

            const view = new CListView();
            view.resize(180, 101);
            view.setGridSize(new CSize(70, 80));
            view.setSpacing(10);
            view.setViewMode(mode);
            const model = new LargeModel();
            view.setModel(model);
            const top = mode === CListViewMode.ListMode ? 120_007 : 90_085;
            view.scrollTo(0, top);
            expect(view.scrollY()).toBe(top);
            model.indexed.length = 0;
            view.paintItems(new CPainter(new TestPaintDevice()));

            const first = Math.floor(top / CListView.ItemHeight);
            const end = Math.ceil((top + view.viewport().height()) / CListView.ItemHeight);
            const expected = mode === CListViewMode.ListMode
                ? Array.from({ length: end - first }, (_, offset) => first + offset)
                : [2002, 2003, 2004, 2005];
            expect(model.indexed).toEqual(expected);
            expect(model.painted).toEqual(expected);
        }
    );

	test("constructs without a model", () => {
		const view = new CListView();

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("has expected size hint", () => {
		const view = new CListView();
		const hint = view.sizeHint();

		expect(hint.width()).toBe(200);
		expect(hint.height()).toBe(160);
	});

	test("sets model", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		expect(view.model()).toBe(model);
	});

	test("creates selection model when model is set", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		expect(view.selectionModel()).not.toBeNull();
		expect(view.selectionModel()?.model()).toBe(model);
	});

	test("setting null model removes selection model", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setModel(null);

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("setting same model keeps selection model", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const selectionModel = view.selectionModel();

		view.setModel(model);

		expect(view.selectionModel()).toBe(selectionModel);
	});

	test("changing model creates new selection model", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);

		const selectionModel = view.selectionModel();

		view.setModel(model2);

		expect(view.model()).toBe(model2);
		expect(view.selectionModel()).not.toBe(selectionModel);
		expect(view.selectionModel()?.model()).toBe(model2);
	});

	test("current index is initially invalid", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("sets current index", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const index = model.index(1, 0);

		view.setCurrentIndex(index);

		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("does not set current index from another model", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);

		const index = model2.index(1, 0);

		view.setCurrentIndex(index);

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("can clear current index", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));
		view.setCurrentIndex(new CModelIndex());

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("selection model can select model index", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const index = model.index(1, 0);

		view.selectionModel()?.select(index);

		expect(view.selectionModel()?.isSelected(index)).toBe(true);
	});

	test("model reset clears selection", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const index = model.index(1, 0);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model.setItems(["A", "B"]);

		expect(view.selectionModel()?.hasSelection()).toBe(false);
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("old model reset does not affect new selection", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);
		view.setModel(model2);

		const index = model2.index(1, 0);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model1.setItems(["Changed"]);

		expect(view.selectionModel()?.isSelected(index)).toBe(true);
		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("old model data change does not affect current model", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);
		view.setModel(model2);

		expect(() => {
			model1.setItem(0, "Changed");
		}).not.toThrow();

		expect(view.model()).toBe(model2);
	});

	test("content widget exists", () => {
		const view = new CListView();

		expect(view.widget()).not.toBeNull();
	});

	test("content is at least as high as viewport", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.resize(200, 160);
		view.setModel(model);

		expect(view.widget()!.height())
			.toBeGreaterThanOrEqual(view.viewport().height());
	});

	test("content height grows with item count", () => {
		const view = new CListView();
		const items = Array.from(
			{ length: 20 },
			(_, index) => `Item ${index}`
		);
		const model = new TestListModel(items);

		view.resize(200, 100);
		view.setModel(model);

		expect(view.widget()!.height())
			.toBe(20 * CListView.ItemHeight);
	});

	test("vertical scrollbar appears for long model", () => {
		const view = new CListView();
		const items = Array.from(
			{ length: 20 },
			(_, index) => `Item ${index}`
		);
		const model = new TestListModel(items);

		view.resize(200, 100);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("vertical scrollbar is hidden for short model", () => {
		const view = new CListView();
		const model = new TestListModel(["One", "Two"]);

		view.resize(200, 160);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(false);
	});

	test("model reset updates content height", () => {
		const view = new CListView();
		const model = new TestListModel(["One"]);

		view.resize(200, 100);
		view.setModel(model);

		model.setItems(
			Array.from(
				{ length: 10 },
				(_, index) => `Item ${index}`
			)
		);

		expect(view.widget()!.height())
			.toBe(10 * CListView.ItemHeight);
		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("visual rectangle matches the item row", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.resize(200, 160);
		view.setModel(model);

		const rect = view.visualRect(model.index(2, 0));

		expect(rect.x()).toBe(0);
		expect(rect.y()).toBe(2 * CListView.ItemHeight);
		expect(rect.width()).toBe(view.widget().width());
		expect(rect.height()).toBe(CListView.ItemHeight);
	});

	test("visual rectangle is empty for an invalid index", () => {
		const view = new CListView();
		const rect = view.visualRect(new CModelIndex());

		expect(rect.width()).toBe(0);
		expect(rect.height()).toBe(0);
	});

	test("first navigation key selects the first item", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);

		expect(view.currentIndex().row()).toBe(0);
		expect(view.selectionModel()?.isSelected(view.currentIndex())).toBe(true);
	});

	test("arrow down moves to the next item", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);

		expect(view.currentIndex().row()).toBe(1);
	});

	test("arrow up moves to the previous item", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(2, 0));
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowUp")
		);

		expect(view.currentIndex().row()).toBe(1);
	});

	test("arrow navigation stops at list boundaries", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowUp")
		);
		expect(view.currentIndex().row()).toBe(0);

		view.setCurrentIndex(model.index(2, 0));
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);
		expect(view.currentIndex().row()).toBe(2);
	});

	test("home and end move to the first and last item", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));
		view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress, "End"));
		expect(view.currentIndex().row()).toBe(2);

		view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress, "Home"));
		expect(view.currentIndex().row()).toBe(0);
	});

	test("page down and page up move by a visible page", () => {
		const view = new CListView();
		const model = new TestListModel(
			Array.from({ length: 20 }, (_, row) => `Row ${row}`)
		);

		view.resize(200, 120);
		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		const pageItems = Math.floor(
			view.viewport().height() / CListView.ItemHeight
		);

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "PageDown")
		);
		expect(view.currentIndex().row()).toBe(pageItems);

		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "PageUp")
		);
		expect(view.currentIndex().row()).toBe(0);
	});

	test("navigation selects only the new current item", () => {
		const view = new CListView();
		const model = new TestListModel();
		const oldIndex = model.index(0, 0);

		view.setModel(model);
		view.selectionModel()?.select(oldIndex);
		view.setCurrentIndex(oldIndex);
		view.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);

		const newIndex = model.index(1, 0);
		expect(view.selectionModel()?.isSelected(oldIndex)).toBe(false);
		expect(view.selectionModel()?.isSelected(newIndex)).toBe(true);
	});

	test("navigation scrolls to the current item", () => {
		const view = new CListView();
		const model = new TestListModel(
			Array.from({ length: 20 }, (_, row) => `Row ${row}`)
		);

		view.resize(200, 100);
		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		for (let row = 1; row < 20; row++) {
			view.contentKeyPressEvent(
				new CKeyEvent(CEventType.KeyPress, "ArrowDown")
			);
		}

		expect(view.currentIndex().row()).toBe(19);
		expect(view.scrollY()).toBeGreaterThan(0);
	});

	test("setting a current index scrolls it into view", () => {
		const view = new CListView();
		const model = new TestListModel(
			Array.from({ length: 20 }, (_, row) => `Row ${row}`)
		);

		view.resize(200, 100);
		view.setModel(model);
		view.setCurrentIndex(model.index(19, 0));

		expect(view.scrollY()).toBeGreaterThan(0);
	});

	test("unhandled key is ignored", () => {
		const view = new CListView();
		const model = new TestListModel();
		const event = new CKeyEvent(CEventType.KeyPress, "A");

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));
		view.contentKeyPressEvent(event);

		expect(event.isAccepted()).toBe(false);
		expect(view.currentIndex().row()).toBe(1);
	});

	test("has a default item delegate", () => {
		const view = new CListView();

		expect(view.itemDelegate()).toBeInstanceOf(CItemDelegate);
	});

	test("sets and resolves row and column delegates", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const defaultDelegate = new TestItemDelegate();
		const rowDelegate = new TestItemDelegate();
		const columnDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(defaultDelegate);
		view.setItemDelegateForColumn(0, columnDelegate);
		view.setItemDelegateForRow(1, rowDelegate);

		expect(view.itemDelegateForIndex(model.index(0, 0)))
			.toBe(columnDelegate);
		expect(view.itemDelegateForIndex(model.index(1, 0)))
			.toBe(rowDelegate);

		view.setItemDelegateForRow(1, null);
		expect(view.itemDelegateForIndex(model.index(1, 0)))
			.toBe(columnDelegate);

		view.setItemDelegateForColumn(0, null);
		expect(view.itemDelegateForIndex(model.index(1, 0)))
			.toBe(defaultDelegate);
	});

	test("cannot edit an invalid, foreign, or non-editable index", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const otherModel = new EditableListModel();

		view.setModel(model);
		expect(view.edit(new CModelIndex())).toBe(false);
		expect(view.edit(otherModel.index(0, 0))).toBe(false);

		model.setEditable(false);
		expect(view.edit(model.index(0, 0))).toBe(false);
	});

	test("edit creates, populates, positions, shows and focuses an editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 0);

		view.resize(200, 160);
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(index)).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.parent).toBe(view.widget());
		expect(delegate.setEditorDataCalls).toHaveLength(1);
		expect(delegate.updateEditorGeometryCalls).toHaveLength(1);
		expect(delegate.lastEditor?.y()).toBe(CListView.ItemHeight);
		expect(delegate.lastEditor?.height()).toBe(CListView.ItemHeight);
		expect(delegate.lastEditor?.isVisible()).toBe(true);
		expect(delegate.lastEditor?.hasFocus()).toBe(true);
	});

	test("edit fails when delegate creates no editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();

		delegate.createEditorResult = false;
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(model.index(0, 0))).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(1);
	});

	test("editing the same item reuses its editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();
		const index = model.index(0, 0);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);
		view.edit(index);

		expect(delegate.createEditorCalls).toHaveLength(1);
	});

	test("editing another item commits and replaces the editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const firstEditor = delegate.lastEditor;
		view.edit(model.index(1, 0));

		expect(delegate.setModelDataCalls).toHaveLength(1);
		expect(delegate.setModelDataCalls[0]?.editor).toBe(firstEditor);
		expect(delegate.createEditorCalls).toHaveLength(2);
		expect(delegate.lastEditor).not.toBe(firstEditor);
	});

	test("delegate commit signal writes editor data to model", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(1, 0));
		delegate.commitData.emit(delegate.lastEditor!);

		expect(delegate.setModelDataCalls).toHaveLength(1);
		expect(delegate.setModelDataCalls[0]?.model).toBe(model);
		expect(delegate.setModelDataCalls[0]?.index.row()).toBe(1);
	});

	test("delegate close signal destroys the editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;
		delegate.closeEditor.emit(editor);

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("changing model closes the active editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;
		view.setModel(new EditableListModel());

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("F2 and Enter start editing the current item", () => {
		for (const key of ["F2", "Enter"]) {
			const view = new CListView();
			const model = new EditableListModel();
			const delegate = new TestItemDelegate();

			view.setModel(model);
			view.setItemDelegate(delegate);
			view.setCurrentIndex(model.index(1, 0));

			const event = new CKeyEvent(CEventType.KeyPress, key);
			view.contentKeyPressEvent(event);

			expect(delegate.createEditorCalls).toHaveLength(1);
			expect(delegate.createEditorCalls[0]?.index.row()).toBe(1);
			expect(event.isAccepted()).toBe(true);
			view.destroy();
		}
	});

	test("double click selects and starts editing the item", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();
		const event = mouseDoubleClick(20, CListView.ItemHeight + 5);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		expect(view.currentIndex().equals(model.index(1, 0))).toBe(true);
		expect(view.selectionModel()?.isSelected(model.index(1, 0))).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.index.equals(model.index(1, 0)))
			.toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("double click on a non-editable item selects it without an editor", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();

		model.setEditable(false);
		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(
			mouseDoubleClick(20, CListView.ItemHeight / 2));

		expect(view.currentIndex().equals(model.index(0, 0))).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(0);
	});

	test("double click outside the items is ignored", () => {
		const view = new CListView();
		const model = new EditableListModel();
		const delegate = new TestItemDelegate();
		const event = mouseDoubleClick(20, 20 * CListView.ItemHeight);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		expect(view.currentIndex().isValid()).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(0);
		expect(event.isAccepted()).toBe(false);
	});
});


describe("CListView IconMode", () => {

    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });

    function grid(count = 8, width = 260, height = 300) {
        const view = new CListView(); view.resize(width,height);
        view.setGridSize(new CSize(70,80)); view.setSpacing(10); view.setViewMode(CListViewMode.IconMode);
        const model = new TestListModel(Array.from({length:count},(_,i)=>`Item ${i}`)); view.setModel(model);
        return { view, model };
    }
    test("list mode remains the default", () => { expect(new CListView().viewMode()).toBe(CListViewMode.ListMode); });
    test("arranges items across columns before starting another line", () => {
        const { view, model } = grid();
        expect(view.visualRect(model.index(1,0)).x()).toBe(80);
        expect(view.visualRect(model.index(3,0)).y()).toBe(90);
    });
    test("hit testing uses both coordinates", () => {
        const { view } = grid(); expect(view.indexAt(new CPoint(85,5)).row()).toBe(1);
        expect(view.indexAt(new CPoint(5,95)).row()).toBe(3);
    });
    test("gaps, negative positions and empty final cells do not select items", () => {
        const { view } = grid(4);
        for (const point of [new CPoint(75,5),new CPoint(5,85),new CPoint(-1,0),new CPoint(85,95)])
            expect(view.indexAt(point).isValid()).toBe(false);
    });
    test("resizing reflows the grid without changing current item", () => {
        const { view, model } = grid(); view.setCurrentIndex(model.index(3,0)); view.resize(180,500);
        expect(view.visualRect(model.index(3,0)).x()).toBe(80);
        expect(view.visualRect(model.index(3,0)).y()).toBe(90);
        expect(view.currentIndex().row()).toBe(3);
    });
    test("switching modes restores list geometry and selection", () => {
        const { view, model } = grid(); view.setCurrentIndex(model.index(2,0)); view.selectionModel()!.select(model.index(2,0)); view.setViewMode(CListViewMode.ListMode);
        expect(view.visualRect(model.index(2,0)).y()).toBe(2*CListView.ItemHeight);
        expect(view.selectionModel()?.isSelected(model.index(2,0))).toBe(true);
    });
    test("returns size copies and ignores invalid geometry settings", () => {
        const { view } = grid(); expect(view.gridSize()).not.toBe(view.gridSize());
        view.setGridSize(new CSize(0,NaN)); expect(view.gridSize().width()).toBe(70);
        view.setSpacing(-1); expect(view.spacing()).toBe(10);
        view.setIconSize(new CSize(32,24)); expect(view.iconSize().height()).toBe(24);
    });
    test("vertical keys move by a grid line", () => {
        const { view, model } = grid(); view.setCurrentIndex(model.index(1,0));
        view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"ArrowDown")); expect(view.currentIndex().row()).toBe(4);
        view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"ArrowUp")); expect(view.currentIndex().row()).toBe(1);
    });
    test("horizontal keys stop at line boundaries", () => {
        const { view, model } = grid(); view.setCurrentIndex(model.index(2,0));
        view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"ArrowRight")); expect(view.currentIndex().row()).toBe(2);
        view.setCurrentIndex(model.index(3,0)); view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"ArrowLeft"));
        expect(view.currentIndex().row()).toBe(3);
    });
    test("unknown keys do not create a current item", () => {
        const { view } = grid(); const event = new CKeyEvent(CEventType.KeyPress,"x"); view.contentKeyPressEvent(event);
        expect(event.isAccepted()).toBe(false); expect(view.currentIndex().isValid()).toBe(false);
    });
    test("Enter activates instead of opening an editor", () => {
        const { view, model } = grid(); const activated = vi.fn(); view.activated.connect(activated);
        view.setCurrentIndex(model.index(1,0)); view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"Enter"));
        expect(activated).toHaveBeenCalledOnce(); expect(activated.mock.calls[0]![0].row()).toBe(1);
    });
    test("double click activates the hit item", () => {
        const { view } = grid(); const activated = vi.fn(); view.activated.connect(activated);
        view.contentMouseDoubleClickEvent(mouseDoubleClick(85,5));
        expect(view.currentIndex().row()).toBe(1); expect(activated).toHaveBeenCalledOnce();
    });
    test("a narrow viewport scrolls horizontally for a cell that cannot fit", () => {
        const { view } = grid(4,50,100); expect(view.horizontalScrollBar().isVisible()).toBe(true);
        expect(view.verticalScrollBar().isVisible()).toBe(true);
    });
    test("vertical scrollbar width is included when calculating columns", () => {
        const { view, model } = grid(8,163,100);
        expect(view.verticalScrollBar().isVisible()).toBe(true);
        expect(view.visualRect(model.index(1,0)).y()).toBe(90);
        expect(view.horizontalScrollBar().isVisible()).toBe(false);
    });
    test("growing the viewport removes stale scrollbars and restores columns", () => {
        const { view, model } = grid(8,100,100); view.resize(260,500);
        expect(view.verticalScrollBar().isVisible()).toBe(false); expect(view.horizontalScrollBar().isVisible()).toBe(false);
        expect(view.visualRect(model.index(1,0)).x()).toBe(80);
    });
    test("End navigates to and reveals the last icon", () => {
        const { view, model } = grid(30,260,100); view.setCurrentIndex(model.index(0,0));
        view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"End"));
        expect(view.currentIndex().row()).toBe(29); expect(view.scrollY()).toBeGreaterThan(0);
    });
    test("model reset recalculates the number of grid lines", () => {
        const { view, model } = grid(30,260,100); model.setItems(["One"]);
        expect(view.verticalScrollBar().isVisible()).toBe(false);
    });
    test("painting obtains icons from the provider and draws captions", () => {
        const { view } = grid(2); const pixmap = {width:()=>48,height:()=>48};
        const icon = {pixmap:vi.fn(()=>pixmap)} as unknown as CIcon; const provider = vi.fn(()=>icon); view.setIconProvider(provider);
        const painter = {setBrush:vi.fn(),setPen:vi.fn(),drawRect:vi.fn(),setFont:vi.fn(),setTextBaseline:vi.fn(),
            setTextAlign:vi.fn(),save:vi.fn(),restore:vi.fn(),clipRect:vi.fn(),drawText:vi.fn(),drawPixmap:vi.fn()};
        view.paintItems(painter as unknown as CPainter);
        expect(provider).toHaveBeenCalledTimes(2); expect(painter.drawPixmap).toHaveBeenCalledTimes(2);
        expect(painter.drawText.mock.calls.some(call=>call[0]==="Item 0")).toBe(true);
    });
});

describe("CListView icon editing compatibility", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    test("F2 still opens the configured editor in icon mode", () => {
        const view=new CListView(); view.resize(300,300); view.setViewMode(CListViewMode.IconMode);
        const model=new EditableListModel(); const delegate=new TestItemDelegate(); view.setModel(model); view.setItemDelegate(delegate);
        view.setCurrentIndex(model.index(1,0)); view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"F2"));
        expect(delegate.createEditorCalls).toHaveLength(1);
        const expected=view.visualRect(model.index(1,0)), actual=delegate.updateEditorGeometryCalls[0]!.rect;
        expect(actual.x()).toBe(expected.x()); expect(actual.y()).toBe(expected.y()); expect(actual.width()).toBe(expected.width());
    });
    test("Enter with no current icon does not activate", () => {
        const view=new CListView(); view.setViewMode(CListViewMode.IconMode); view.setModel(new TestListModel());
        const activated=vi.fn(); view.activated.connect(activated); view.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress,"Enter"));
        expect(activated).not.toHaveBeenCalled();
    });
});


describe("CListView row-sized scrollbar arrows", () => {

    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });

    function scrollableView(): CListView {
        const view = new CListView(); view.setGeometry(0, 0, 320, 180);
        view.setModel(new TestListModel(Array.from({ length: 100 }, (_, i) => `Row ${i}`)));
        return view;
    }
    function pressArrow(view: CListView, text: "▲" | "▼"): void {
        const button = view.verticalScrollBar().children().find(
            child => child instanceof CPushButton && child.text() === text
        );
        if (!(button instanceof CPushButton)) throw new Error(`Missing scrollbar arrow ${text}`);
        const x = button.width() / 2, y = button.height() / 2;
        button.event(new CMouseEvent(CEventType.MousePress, x, y, CMouseButton.LeftButton));
        button.event(new CMouseEvent(CEventType.MouseRelease, x, y, CMouseButton.LeftButton));
    }

    test("vertical single step equals one row and page step remains the viewport height", () => {
        const view = scrollableView(), bar = view.verticalScrollBar();
        expect(bar.isVisible()).toBe(true);
        expect(bar.singleStep()).toBe(CListView.ItemHeight);
        expect(bar.pageStep()).toBe(view.viewport().height());
    });
    test("clicking the down and up arrow moves content by one row", () => {
        const view = scrollableView();
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(CListView.ItemHeight);
        expect(view.verticalScrollBar().value()).toBe(CListView.ItemHeight);
        pressArrow(view, "▲"); expect(view.scrollY()).toBe(0);
    });
    test("arrows keep a fractional row offset while direct pixel scrolling remains available", () => {
        const view = scrollableView(); view.setScrollY(7);
        expect(view.scrollY()).toBe(7);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(7 + CListView.ItemHeight);
        pressArrow(view, "▲"); expect(view.scrollY()).toBe(7);
    });
    test("arrow movement clamps at the top and the final partial row", () => {
        const view = scrollableView(), bar = view.verticalScrollBar();
        pressArrow(view, "▲"); expect(view.scrollY()).toBe(0);
        const maximum = bar.maximum(); bar.setValue(maximum - 3);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(maximum);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(maximum);
    });
    test("resizing the view retains the row step", () => {
        const view = scrollableView(); view.setGeometry(0, 0, 400, 220);
        expect(view.verticalScrollBar().singleStep()).toBe(CListView.ItemHeight);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(CListView.ItemHeight);
    });

    test("icon-mode arrows move by a cell height plus its spacing", () => {
        const view = scrollableView();
        view.setGridSize(new CSize(70, 80)); view.setSpacing(10); view.setViewMode(CListViewMode.IconMode);
        expect(view.verticalScrollBar().singleStep()).toBe(90);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(90);
        pressArrow(view, "▲"); expect(view.scrollY()).toBe(0);
    });
    test("changing icon grid height updates the next arrow movement", () => {
        const view = scrollableView(); view.setViewMode(CListViewMode.IconMode);
        view.setGridSize(new CSize(70, 60)); view.setSpacing(10);
        expect(view.verticalScrollBar().singleStep()).toBe(70);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(70);
    });
    test("changing icon spacing updates the next arrow movement", () => {
        const view = scrollableView(); view.setViewMode(CListViewMode.IconMode);
        view.setGridSize(new CSize(70, 80)); view.setSpacing(0);
        expect(view.verticalScrollBar().singleStep()).toBe(80);
        view.setSpacing(15); expect(view.verticalScrollBar().singleStep()).toBe(95);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(95);
    });
    test("returning from icon mode restores the list row step", () => {
        const view = scrollableView(); view.setViewMode(CListViewMode.IconMode);
        view.setGridSize(new CSize(70, 80)); view.setSpacing(10);
        view.setViewMode(CListViewMode.ListMode);
        expect(view.verticalScrollBar().singleStep()).toBe(CListView.ItemHeight);
        pressArrow(view, "▼"); expect(view.scrollY()).toBe(CListView.ItemHeight);
    });
});
