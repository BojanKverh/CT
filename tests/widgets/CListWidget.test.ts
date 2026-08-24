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
});