import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CListViewMode } from "../../src/widgets/CListViewHelper.js";
import { CSize } from "../../src/geometry/CSize.js";
import type { CIcon } from "../../src/gui/CIcon.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CKeyboardModifier } from "../../src/events/CMouseEvent.js";
import {
	CListWidget,
	CSelectionMode
} from "../../src/widgets/CListWidget.js";
import { CListWidgetItem } from "../../src/widgets/CListWidgetItem.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CListWidget", () =>
{
	beforeEach(() =>
	{
		const canvas = createTestCanvas();

		new CApplication(canvas);
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has no items by default", () =>
	{
		const list = new CListWidget();

		expect(list.count()).toBe(0);
	});

	test("has no current item when empty", () =>
	{
		const list = new CListWidget();

		expect(list.currentRow()).toBe(-1);
		expect(list.currentItem()).toBeNull();
	});

	test("uses single selection by default", () =>
	{
		const list = new CListWidget();

		expect(list.selectionMode()).toBe(CSelectionMode.SingleSelection);
	});

	test("stores parent from constructor", () =>
	{
		const parent = new CWidget();
		const list = new CListWidget(parent);

		expect(list.parent()).toBe(parent);
	});

	test("adds string item", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		expect(list.count()).toBe(1);
		expect(list.item(0)?.text()).toBe("Slovenia");
	});

	test("adds CListWidgetItem", () =>
	{
		const list = new CListWidget();
		const item = new CListWidgetItem("Slovenia");

		list.addItem(item);

		expect(list.item(0)).toBe(item);
	});

	test("first added item becomes current", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		expect(list.currentRow()).toBe(0);
		expect(list.currentItem()?.text()).toBe("Slovenia");
	});

	test("first added item is selected in single selection mode", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		expect(list.selectedRows()).toEqual([0]);
	});

	test("item returns null for invalid row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		expect(list.item(-1)).toBeNull();
		expect(list.item(1)).toBeNull();
	});

	test("returns row of item", () =>
	{
		const list = new CListWidget();
		const item = new CListWidgetItem("Austria");

		list.addItem("Slovenia");
		list.addItem(item);

		expect(list.row(item)).toBe(1);
	});

	test("returns -1 for item not in list", () =>
	{
		const list = new CListWidget();
		const item = new CListWidgetItem("Austria");

		expect(list.row(item)).toBe(-1);
	});

	test("inserts item at requested row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Germany");
		list.insertItem(1, "Austria");

		expect(list.count()).toBe(3);
		expect(list.item(0)?.text()).toBe("Slovenia");
		expect(list.item(1)?.text()).toBe("Austria");
		expect(list.item(2)?.text()).toBe("Germany");
	});

	test("insert clamps negative index to beginning", () =>
	{
		const list = new CListWidget();

		list.addItem("Austria");
		list.insertItem(-10, "Slovenia");

		expect(list.item(0)?.text()).toBe("Slovenia");
	});

	test("insert clamps large index to end", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.insertItem(100, "Austria");

		expect(list.item(1)?.text()).toBe("Austria");
	});

	test("takeItem removes and returns item", () =>
	{
		const list = new CListWidget();
		const item = new CListWidgetItem("Austria");

		list.addItem("Slovenia");
		list.addItem(item);
		list.addItem("Germany");

		expect(list.takeItem(1)).toBe(item);
		expect(list.count()).toBe(2);
		expect(list.item(1)?.text()).toBe("Germany");
	});

	test("takeItem returns null for invalid index", () =>
	{
		const list = new CListWidget();

		expect(list.takeItem(-1)).toBeNull();
		expect(list.takeItem(0)).toBeNull();
	});

	test("clear removes all items", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.clear();

		expect(list.count()).toBe(0);
		expect(list.currentRow()).toBe(-1);
		expect(list.selectedRows()).toEqual([]);
	});

	test("setCurrentRow changes current row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.setCurrentRow(1);

		expect(list.currentRow()).toBe(1);
		expect(list.currentItem()?.text()).toBe("Austria");
	});

	test("setCurrentRow selects row in single selection mode", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.setCurrentRow(1);

		expect(list.selectedRows()).toEqual([1]);
	});

	test("setCurrentRow ignores invalid row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		list.setCurrentRow(10);

		expect(list.currentRow()).toBe(0);
	});

	test("setCurrentRow ignores disabled item", () =>
	{
		const list = new CListWidget();
		const item = new CListWidgetItem("Austria");

		item.setEnabled(false);

		list.addItem("Slovenia");
		list.addItem(item);

		list.setCurrentRow(1);

		expect(list.currentRow()).toBe(0);
	});

	test("setCurrentRow emits currentRowChanged", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		const slot = vi.fn();

		list.currentRowChanged.connect(slot);
		list.setCurrentRow(1);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("same current row does not emit currentRowChanged", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		const slot = vi.fn();

		list.currentRowChanged.connect(slot);
		list.setCurrentRow(0);

		expect(slot).not.toHaveBeenCalled();
	});

	test("sets multi selection mode", () =>
	{
		const list = new CListWidget();

		list.setSelectionMode(CSelectionMode.MultiSelection);

		expect(list.selectionMode()).toBe(CSelectionMode.MultiSelection);
	});

	test("multi selection allows multiple selected rows", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.setItemSelected(0, true);
		list.setItemSelected(2, true);

		expect(list.selectedRows()).toEqual([0, 2]);
	});

	test("setItemSelected can deselect row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.setItemSelected(0, true);
		list.setItemSelected(1, true);
		list.setItemSelected(0, false);

		expect(list.selectedRows()).toEqual([1]);
	});

	test("setItemSelected ignores disabled item", () =>
	{
		const list = new CListWidget();
		const item = new CListWidgetItem("Austria");

		item.setEnabled(false);

		list.addItem("Slovenia");
		list.addItem(item);

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.setItemSelected(1, true);

		expect(list.selectedRows()).toEqual([]);
	});

	test("selectedItems returns selected items in row order", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.setItemSelected(2, true);
		list.setItemSelected(0, true);

		expect(list.selectedItems().map(item => item.text())).toEqual([
			"Slovenia",
			"Germany"
		]);
	});

	test("clearSelection clears selection", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.setItemSelected(1, true);

		list.clearSelection();

		expect(list.selectedRows()).toEqual([]);
	});

	test("clearSelection emits itemSelectionChanged", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		const slot = vi.fn();

		list.itemSelectionChanged.connect(slot);
		list.clearSelection();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("clearing empty selection does not emit signal", () =>
	{
		const list = new CListWidget();

		list.setSelectionMode(CSelectionMode.MultiSelection);

		const slot = vi.fn();

		list.itemSelectionChanged.connect(slot);
		list.clearSelection();

		expect(slot).not.toHaveBeenCalled();
	});

	test("normal click toggles row in multi selection mode", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(1, CKeyboardModifier.NoModifier);

		expect(list.selectedRows()).toEqual([1]);

		list.activateRow(1, CKeyboardModifier.NoModifier);

		expect(list.selectedRows()).toEqual([]);
	});

	test("normal click preserves other selected rows in multi selection", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(0, CKeyboardModifier.NoModifier);
		list.activateRow(2, CKeyboardModifier.NoModifier);

		expect(list.selectedRows()).toEqual([0, 2]);
	});

	test("shift click selects range in multi selection mode", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");
		list.addItem("Italy");
		list.addItem("France");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(1, CKeyboardModifier.NoModifier);
		list.activateRow(4, CKeyboardModifier.ShiftModifier);

		expect(list.selectedRows()).toEqual([1, 2, 3, 4]);
	});

	test("shift click selects range in reverse direction", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");
		list.addItem("Italy");
		list.addItem("France");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(4, CKeyboardModifier.NoModifier);
		list.activateRow(1, CKeyboardModifier.ShiftModifier);

		expect(list.selectedRows()).toEqual([1, 2, 3, 4]);
	});

	test("shift selection skips disabled items", () =>
	{
		const list = new CListWidget();
		const disabled = new CListWidgetItem("Germany");

		disabled.setEnabled(false);

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem(disabled);
		list.addItem("Italy");
		list.addItem("France");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(1, CKeyboardModifier.NoModifier);
		list.activateRow(4, CKeyboardModifier.ShiftModifier);

		expect(list.selectedRows()).toEqual([1, 3, 4]);
	});

	test("shift selection adds range to existing selection", () =>
	{
		const list = new CListWidget();

		list.addItem("A");
		list.addItem("B");
		list.addItem("C");
		list.addItem("D");
		list.addItem("E");
		list.addItem("F");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(0, CKeyboardModifier.NoModifier);
		list.activateRow(4, CKeyboardModifier.NoModifier);
		list.activateRow(2, CKeyboardModifier.ShiftModifier);

		expect(list.selectedRows()).toEqual([0, 2, 3, 4]);
	});

	test("activateRow ignores invalid row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(-1, CKeyboardModifier.NoModifier);

		expect(list.currentRow()).toBe(0);
		expect(list.selectedRows()).toEqual([]);
	});

	test("activateRow ignores disabled row", () =>
	{
		const list = new CListWidget();
		const disabled = new CListWidgetItem("Austria");

		disabled.setEnabled(false);

		list.addItem("Slovenia");
		list.addItem(disabled);

		list.activateRow(1, CKeyboardModifier.NoModifier);

		expect(list.currentRow()).toBe(0);
		expect(list.selectedRows()).toEqual([0]);
	});

	test("activateRow emits itemClicked", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		const slot = vi.fn();

		list.itemClicked.connect(slot);
		list.activateRow(1, CKeyboardModifier.NoModifier);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(list.item(1));
	});

	test("activateRow emits currentRowChanged when row changes", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		const slot = vi.fn();

		list.currentRowChanged.connect(slot);
		list.activateRow(1, CKeyboardModifier.NoModifier);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("activateRow emits itemSelectionChanged when selection changes", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		const slot = vi.fn();

		list.itemSelectionChanged.connect(slot);
		list.activateRow(1, CKeyboardModifier.NoModifier);

		expect(slot).toHaveBeenCalledOnce();
	});

	test("switching to single selection keeps only current row selected", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");

		list.setSelectionMode(CSelectionMode.MultiSelection);
		list.clearSelection();

		list.activateRow(0, CKeyboardModifier.NoModifier);
		list.activateRow(2, CKeyboardModifier.NoModifier);

		list.setSelectionMode(CSelectionMode.SingleSelection);

		expect(list.selectedRows()).toEqual([2]);
	});

	test("rowAt returns correct row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");

		expect(list.rowAt(0)).toBe(0);
		expect(list.rowAt(27)).toBe(0);
		expect(list.rowAt(28)).toBe(1);
		expect(list.rowAt(56)).toBe(2);
	});

	test("rowAt returns -1 outside item area", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		expect(list.rowAt(-1)).toBe(-1);
		expect(list.rowAt(28)).toBe(-1);
		expect(list.rowAt(100)).toBe(-1);
	});

	test("arrow down selects next row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(list.currentRow()).toBe(1);
	});

	test("arrow up selects previous row", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");
		list.addItem("Austria");

		list.event(new CKeyEvent(CEventType.KeyPress, "ArrowUp"));

		expect(list.currentRow()).toBe(1);
	});

	test("keyboard navigation skips disabled items", () =>
	{
		const list = new CListWidget();
		const disabled = new CListWidgetItem("Austria");

		disabled.setEnabled(false);

		list.addItem("Slovenia");
		list.addItem(disabled);
		list.addItem("Germany");

		list.event(new CKeyEvent(CEventType.KeyPress, "ArrowDown"));

		expect(list.currentRow()).toBe(2);
	});

	test("home selects first selectable row", () =>
	{
		const list = new CListWidget();
		const disabled = new CListWidgetItem("Slovenia");

		disabled.setEnabled(false);

		list.addItem(disabled);
		list.addItem("Austria");
		list.addItem("Germany");

		list.setCurrentRow(2);
		list.event(new CKeyEvent(CEventType.KeyPress, "Home"));

		expect(list.currentRow()).toBe(1);
	});

	test("end selects last selectable row", () =>
	{
		const list = new CListWidget();
		const disabled = new CListWidgetItem("Germany");

		disabled.setEnabled(false);

		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem(disabled);

		list.event(new CKeyEvent(CEventType.KeyPress, "End"));

		expect(list.currentRow()).toBe(1);
	});

	test("enter emits itemClicked for current item", () =>
	{
		const list = new CListWidget();

		list.addItem("Slovenia");

		const slot = vi.fn();

		list.itemClicked.connect(slot);
		list.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(list.item(0));
	});

	test("shows vertical scrollbar when items exceed viewport", () =>
	{
		const list = new CListWidget();

		list.resize(200, 100);

		for (let i = 0; i < 10; ++i)
			list.addItem(`Item ${i}`);

		expect(list.verticalScrollBar().isVisible()).toBe(true);
	});

	test("does not show vertical scrollbar when items fit viewport", () =>
	{
		const list = new CListWidget();

		list.resize(200, 200);

		list.addItem("Slovenia");
		list.addItem("Austria");

		expect(list.verticalScrollBar().isVisible()).toBe(false);
	});

	test("list content does not require horizontal scrollbar", () =>
	{
		const list = new CListWidget();

		list.resize(200, 100);

		for (let i = 0; i < 10; ++i)
			list.addItem(`Item ${i}`);

		expect(list.horizontalScrollBar().isVisible()).toBe(false);
	});

	test("resizing the list expands item content to the viewport width", () =>
	{
		const list = new CListWidget();

		list.resize(120, 100);
		for (let i = 0; i < 10; ++i)
			list.addItem(`Item ${i}`);

		list.resize(240, 100);

		expect(list.widget()?.width()).toBe(list.viewport().width());
		expect(list.horizontalScrollBar().isVisible()).toBe(false);
	});
});


describe("CListWidget IconMode", () => {

    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });

    function grid(count = 8, width = 260, height = 300) {
        const list = new CListWidget(); list.resize(width,height); list.setGridSize(new CSize(70,80));
        list.setSpacing(10); list.setViewMode(CListViewMode.IconMode);
        for (let i=0;i<count;++i) list.addItem(`Item ${i}`);
        return list;
    }
    test("retains default list mode", () => { expect(new CListWidget().viewMode()).toBe(CListViewMode.ListMode); });
    test("uses both axes for rectangles and hit testing", () => {
        const list = grid(); expect(list.visualItemRect(list.item(1)!).x()).toBe(80);
        expect(list.rowAt(5,85)).toBe(1); expect(list.rowAt(95,5)).toBe(3);
    });
    test("does not hit gaps or unused final cells", () => {
        const list = grid(4); expect(list.rowAt(5,75)).toBe(-1); expect(list.rowAt(85,5)).toBe(-1);
        expect(list.rowAt(95,85)).toBe(-1);
    });
    test("reflows on resize and retains selected item", () => {
        const list = grid(); const selected = list.item(3)!; list.setCurrentRow(3); list.resize(180,500);
        expect(list.visualItemRect(selected).x()).toBe(80); expect(list.currentItem()).toBe(selected);
    });
    test("switching to list mode restores the old row height", () => {
        const list = grid(); list.setViewMode(CListViewMode.ListMode);
        expect(list.visualItemRect(list.item(2)!).y()).toBe(2*CListWidget.ItemHeight);
    });
    test("arrow keys navigate spatially without wrapping lines", () => {
        const list = grid(); list.setCurrentRow(1); list.event(new CKeyEvent(CEventType.KeyPress,"ArrowDown"));
        expect(list.currentRow()).toBe(4); list.event(new CKeyEvent(CEventType.KeyPress,"ArrowLeft")); expect(list.currentRow()).toBe(3);
        list.event(new CKeyEvent(CEventType.KeyPress,"ArrowLeft")); expect(list.currentRow()).toBe(3);
    });
    test("navigation skips disabled icons in the direction of travel", () => {
        const list = grid(); list.item(4)!.setEnabled(false); list.setCurrentRow(1);
        list.event(new CKeyEvent(CEventType.KeyPress,"ArrowDown")); expect(list.currentRow()).toBe(7);
    });
    test("Enter activates an enabled item", () => {
        const list = grid(); const activated=vi.fn(); list.itemActivated.connect(activated);
        list.event(new CKeyEvent(CEventType.KeyPress,"Enter")); expect(activated).toHaveBeenCalledWith(list.item(0));
    });
    test("disabled current items cannot activate", () => {
        const list = grid(); const activated=vi.fn(); list.itemActivated.connect(activated); list.item(0)!.setEnabled(false);
        list.event(new CKeyEvent(CEventType.KeyPress,"Enter")); expect(activated).not.toHaveBeenCalled();
    });
    test("End reveals the last item", () => {
        const list = grid(30,260,100); list.event(new CKeyEvent(CEventType.KeyPress,"End"));
        expect(list.currentRow()).toBe(29); expect(list.scrollY()).toBeGreaterThan(0);
    });
    test("icons can be supplied in the constructor or replaced", () => {
        const icon={pixmap:vi.fn(()=>null)} as unknown as CIcon; const item=new CListWidgetItem("Folder",icon);
        expect(item.icon()).toBe(icon); item.setIcon(null); expect(item.icon()).toBeNull();
    });
    test("item changes repaint and taking the item disconnects notifications", () => {
        const list=grid(0); const item=new CListWidgetItem("Folder"); list.addItem(item);
        const update=vi.spyOn(list.widget()!,"update"); item.setText("Renamed"); expect(update).toHaveBeenCalled();
        list.takeItem(0); update.mockClear(); item.setText("Detached"); expect(update).not.toHaveBeenCalled();
    });
    test("clearing items removes scrolling", () => {
        const list=grid(30,260,100); list.clear(); expect(list.verticalScrollBar().isVisible()).toBe(false);
    });
    test("paint draws each item icon below its selected tile background", () => {
        const list=grid(1); const pixmap={width:()=>32,height:()=>32};
        const icon={pixmap:vi.fn(()=>pixmap)} as unknown as CIcon; list.item(0)!.setIcon(icon);
        const painter={setBrush:vi.fn(),setPen:vi.fn(),fillRect:vi.fn(),setFont:vi.fn(),setTextAlign:vi.fn(),
            setTextBaseline:vi.fn(),save:vi.fn(),restore:vi.fn(),clipRect:vi.fn(),drawText:vi.fn(),drawPixmap:vi.fn()};
        list.paintItems(painter as unknown as CPainter); expect(painter.drawPixmap).toHaveBeenCalledOnce();
        expect(painter.drawText.mock.calls.some(call=>call[0]==="Item 0")).toBe(true);
    });
    test("grid sizes are returned as independent values", () => {
        const list=grid(); expect(list.gridSize()).not.toBe(list.gridSize());
        list.setGridSize(new CSize(-1,0)); expect(list.gridSize().width()).toBe(70);
    });
});

describe("CListWidget icon interaction", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function makeList() {
        const list=new CListWidget(); list.resize(260,300); list.setGridSize(new CSize(70,80)); list.setSpacing(10);
        list.setViewMode(CListViewMode.IconMode); for(let i=0;i<8;++i) list.addItem(`Item ${i}`); return list;
    }
    test("mouse press selects the icon and focuses the content", () => {
        const list=makeList(); const content=list.widget()!;
        content.event(new CMouseEvent(CEventType.MousePress,85,5,CMouseButton.LeftButton));
        expect(list.currentRow()).toBe(1); expect(list.selectedRows()).toEqual([1]); expect(content.hasFocus()).toBe(true);
    });
    test("double click activates and gaps do not", () => {
        const list=makeList(); const activated=vi.fn(); list.itemActivated.connect(activated);
        list.widget()!.event(new CMouseEvent(CEventType.MouseDoubleClick,85,5,CMouseButton.LeftButton));
        expect(activated).toHaveBeenCalledWith(list.item(1)); activated.mockClear();
        list.widget()!.event(new CMouseEvent(CEventType.MouseDoubleClick,75,5,CMouseButton.LeftButton));
        expect(activated).not.toHaveBeenCalled();
    });
    test("Home and End find the first and last enabled icon", () => {
        const list=makeList(); list.item(0)!.setEnabled(false); list.item(7)!.setEnabled(false); list.setCurrentRow(4);
        list.event(new CKeyEvent(CEventType.KeyPress,"Home")); expect(list.currentRow()).toBe(1);
        list.event(new CKeyEvent(CEventType.KeyPress,"End")); expect(list.currentRow()).toBe(6);
    });
    test("multi-selection remains available in icon mode", () => {
        const list=makeList(); list.setSelectionMode(CSelectionMode.MultiSelection); list.clearSelection();
        list.activateRow(1,0); list.activateRow(4,0); expect(list.selectedRows()).toEqual([1,4]);
    });
    test("long captions use at most two lines and end with an ellipsis", () => {
        const list=makeList(); list.clear(); list.addItem("A".repeat(100));
        const painter={setBrush:vi.fn(),setPen:vi.fn(),fillRect:vi.fn(),setFont:vi.fn(),setTextAlign:vi.fn(),
            setTextBaseline:vi.fn(),save:vi.fn(),restore:vi.fn(),clipRect:vi.fn(),drawText:vi.fn(),drawPixmap:vi.fn()};
        list.paintItems(painter as unknown as CPainter);
        expect(painter.drawText).toHaveBeenCalledTimes(2);
        expect(String(painter.drawText.mock.calls[1]![0]).endsWith("…")).toBe(true);
    });
    test("icon painting preserves the pixmap aspect ratio", () => {
        const list=makeList(); list.clear(); const pixmap={width:()=>100,height:()=>50};
        list.addItem(new CListWidgetItem("Wide",{pixmap:()=>pixmap} as unknown as CIcon));
        const painter={setBrush:vi.fn(),setPen:vi.fn(),fillRect:vi.fn(),setFont:vi.fn(),setTextAlign:vi.fn(),
            setTextBaseline:vi.fn(),save:vi.fn(),restore:vi.fn(),clipRect:vi.fn(),drawText:vi.fn(),drawPixmap:vi.fn()};
        list.paintItems(painter as unknown as CPainter); const call=painter.drawPixmap.mock.calls[0]!;
        expect(call[3]/call[4]).toBeCloseTo(2);
    });
});
