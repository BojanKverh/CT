import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import { CComboBoxItemDelegate } from "../../src/widgets/CComboBoxItemDelegate.js";
import { CDateEdit } from "../../src/widgets/CDateEdit.js";
import { CDoubleSpinBox } from "../../src/widgets/CDoubleSpinBox.js";
import { CIntItemDelegate } from "../../src/widgets/CIntItemDelegate.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CSpinBox } from "../../src/widgets/CSpinBox.js";
import { CTableWidget } from "../../src/widgets/CTableWidget.js";
import { CTableWidgetItem } from "../../src/widgets/CTableWidgetItem.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

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

describe("CTableWidget", () => {
	let app: CApplication;

	beforeEach(() => {
        new CApplication(createTestCanvas());
    });
        
    afterEach(() => {
        if (CApplication.exists())
            CApplication.instance().destroy();
    });

	test("constructs empty", () => {
		const table = new CTableWidget();

		expect(table.rowCount()).toBe(0);
		expect(table.columnCount()).toBe(0);
		expect(table.currentItem()).toBeNull();
		expect(table.selectedItems()).toEqual([]);
	});

	test("sets row count", () => {
		const table = new CTableWidget();

		table.setRowCount(3);

		expect(table.rowCount()).toBe(3);
		expect(table.columnCount()).toBe(0);
	});

	test("sets column count", () => {
		const table = new CTableWidget();

		table.setColumnCount(4);

		expect(table.rowCount()).toBe(0);
		expect(table.columnCount()).toBe(4);
	});

	test("sets row and column count", () => {
		const table = new CTableWidget();

		table.setRowCount(3);
		table.setColumnCount(4);

		expect(table.rowCount()).toBe(3);
		expect(table.columnCount()).toBe(4);
	});

	test("sorts text rows in ascending order", () => {
		const table = new CTableWidget();
		table.setRowCount(3);
		table.setColumnCount(2);
		table.setItem(0, 0, new CTableWidgetItem("Carol"));
		table.setItem(0, 1, new CTableWidgetItem("third"));
		table.setItem(1, 0, new CTableWidgetItem("Alice"));
		table.setItem(1, 1, new CTableWidgetItem("first"));
		table.setItem(2, 0, new CTableWidgetItem("Bob"));
		table.setItem(2, 1, new CTableWidgetItem("second"));

		table.sortByColumn(0, CSortOrder.AscendingOrder);

		expect(table.item(0, 0)?.text()).toBe("Alice");
		expect(table.item(1, 0)?.text()).toBe("Bob");
		expect(table.item(2, 0)?.text()).toBe("Carol");
		expect(table.item(0, 1)?.text()).toBe("first");
		expect(table.item(1, 1)?.text()).toBe("second");
		expect(table.item(2, 1)?.text()).toBe("third");
	});

	test("sorts text rows in descending order", () => {
		const table = new CTableWidget();
		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(0, 0, new CTableWidgetItem("Alice"));
		table.setItem(1, 0, new CTableWidgetItem("Carol"));
		table.setItem(2, 0, new CTableWidgetItem("Bob"));

		table.sortByColumn(0, CSortOrder.DescendingOrder);

		expect([
			table.item(0, 0)?.text(),
			table.item(1, 0)?.text(),
			table.item(2, 0)?.text()
		]).toEqual(["Carol", "Bob", "Alice"]);
	});

	test("sorts numbers numerically instead of as text", () => {
		const table = new CTableWidget();
		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(0, 0, new CTableWidgetItem(10));
		table.setItem(1, 0, new CTableWidgetItem(2));
		table.setItem(2, 0, new CTableWidgetItem(100));

		table.sortByColumn(0);

		expect([
			table.item(0, 0)?.data(),
			table.item(1, 0)?.data(),
			table.item(2, 0)?.data()
		]).toEqual([2, 10, 100]);
	});

	test("sorts dates chronologically", () => {
		const table = new CTableWidget();
		const earliest = new Date(2024, 0, 1);
		const middle = new Date(2025, 0, 1);
		const latest = new Date(2026, 0, 1);
		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(0, 0, new CTableWidgetItem(latest));
		table.setItem(1, 0, new CTableWidgetItem(earliest));
		table.setItem(2, 0, new CTableWidgetItem(middle));

		table.sortByColumn(0);

		expect([
			table.item(0, 0)?.data(),
			table.item(1, 0)?.data(),
			table.item(2, 0)?.data()
		]).toEqual([earliest, middle, latest]);
	});

	test("sorts false before true", () => {
		const table = new CTableWidget();
		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(0, 0, new CTableWidgetItem(true));
		table.setItem(1, 0, new CTableWidgetItem(false));
		table.setItem(2, 0, new CTableWidgetItem(true));

		table.sortByColumn(0);

		expect([
			table.item(0, 0)?.data(),
			table.item(1, 0)?.data(),
			table.item(2, 0)?.data()
		]).toEqual([false, true, true]);
	});

	test("keeps empty cells at the end in both sort orders", () => {
		const table = new CTableWidget();
		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(0, 0, new CTableWidgetItem("Bob"));
		table.setItem(2, 0, new CTableWidgetItem("Alice"));

		table.sortByColumn(0, CSortOrder.AscendingOrder);
		expect(table.item(2, 0)).toBeNull();

		table.sortByColumn(0, CSortOrder.DescendingOrder);
		expect(table.item(0, 0)?.text()).toBe("Bob");
		expect(table.item(1, 0)?.text()).toBe("Alice");
		expect(table.item(2, 0)).toBeNull();
	});

	test("sorting equal values is stable", () => {
		const table = new CTableWidget();
		const first = new CTableWidgetItem("first");
		const second = new CTableWidgetItem("second");
		table.setRowCount(2);
		table.setColumnCount(2);
		table.setItem(0, 0, new CTableWidgetItem(10));
		table.setItem(0, 1, first);
		table.setItem(1, 0, new CTableWidgetItem(10));
		table.setItem(1, 1, second);

		table.sortByColumn(0, CSortOrder.DescendingOrder);

		expect(table.item(0, 1)).toBe(first);
		expect(table.item(1, 1)).toBe(second);
	});

	test("sorting preserves item identity and updates its index", () => {
		const table = new CTableWidget();
		const alice = new CTableWidgetItem("Alice");
		const bob = new CTableWidgetItem("Bob");
		table.setRowCount(2);
		table.setColumnCount(1);
		table.setItem(0, 0, bob);
		table.setItem(1, 0, alice);

		table.sortByColumn(0);

		expect(table.item(0, 0)).toBe(alice);
		expect(table.item(1, 0)).toBe(bob);
		expect(table.indexFromItem(alice).row()).toBe(0);
		expect(table.indexFromItem(bob).row()).toBe(1);
	});

	test("clicking the header sorts the table when enabled", () => {
		const table = new CTableWidget();
		table.setRowCount(2);
		table.setColumnCount(1);
		table.setItem(0, 0, new CTableWidgetItem("Bob"));
		table.setItem(1, 0, new CTableWidgetItem("Alice"));
		table.setSortingEnabled(true);

		const header = table.horizontalHeader();
		header.event(new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		));
		header.event(new CMouseEvent(
			CEventType.MouseRelease, 10, 10, CMouseButton.LeftButton
		));

		expect(table.item(0, 0)?.text()).toBe("Alice");
		expect(table.item(1, 0)?.text()).toBe("Bob");
	});

	test("negative row count becomes zero", () => {
		const table = new CTableWidget();

		table.setRowCount(3);
		table.setRowCount(-10);

		expect(table.rowCount()).toBe(0);
	});

	test("negative column count becomes zero", () => {
		const table = new CTableWidget();

		table.setColumnCount(3);
		table.setColumnCount(-10);

		expect(table.columnCount()).toBe(0);
	});

	test("row count is converted to integer", () => {
		const table = new CTableWidget();

		table.setRowCount(3.8);

		expect(table.rowCount()).toBe(3);
	});

	test("column count is converted to integer", () => {
		const table = new CTableWidget();

		table.setColumnCount(3.8);

		expect(table.columnCount()).toBe(3);
	});

	test("new cells are empty", () => {
		const table = new CTableWidget();

		table.setRowCount(2);
		table.setColumnCount(3);

		for (let row = 0; row < 2; row++) {
			for (let column = 0; column < 3; column++)
				expect(table.item(row, column)).toBeNull();
		}
	});

	test("sets and gets item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Hello");

		table.setRowCount(2);
		table.setColumnCount(2);
		table.setItem(1, 1, item);

		expect(table.item(1, 1)).toBe(item);
	});

	test("item returns null for invalid cell", () => {
		const table = new CTableWidget();

		table.setRowCount(2);
		table.setColumnCount(2);

		expect(table.item(-1, 0)).toBeNull();
		expect(table.item(0, -1)).toBeNull();
		expect(table.item(2, 0)).toBeNull();
		expect(table.item(0, 2)).toBeNull();
	});

	test("setItem ignores invalid cell", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Hello");

		table.setRowCount(2);
		table.setColumnCount(2);

		table.setItem(-1, 0, item);
		table.setItem(0, -1, item);
		table.setItem(2, 0, item);
		table.setItem(0, 2, item);

		expect(table.indexFromItem(item).isValid()).toBe(false);
	});

	test("setItem replaces existing item", () => {
		const table = new CTableWidget();
		const first = new CTableWidgetItem("First");
		const second = new CTableWidgetItem("Second");

		table.setRowCount(1);
		table.setColumnCount(1);

		table.setItem(0, 0, first);
		table.setItem(0, 0, second);

		expect(table.item(0, 0)).toBe(second);
		expect(table.indexFromItem(first).isValid()).toBe(false);
	});

	test("same item is moved between cells", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(3);
		table.setColumnCount(3);

		table.setItem(0, 0, item);
		table.setItem(2, 1, item);

		expect(table.item(0, 0)).toBeNull();
		expect(table.item(2, 1)).toBe(item);
	});

	test("increasing row count preserves existing items", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(1);
		table.setColumnCount(2);
		table.setItem(0, 1, item);

		table.setRowCount(4);

		expect(table.item(0, 1)).toBe(item);
		expect(table.rowCount()).toBe(4);
	});

	test("increasing column count preserves existing items", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(2);
		table.setColumnCount(1);
		table.setItem(1, 0, item);

		table.setColumnCount(4);

		expect(table.item(1, 0)).toBe(item);
		expect(table.columnCount()).toBe(4);
	});

	test("decreasing row count removes truncated items", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(2, 0, item);

		table.setRowCount(2);

		expect(table.rowCount()).toBe(2);
		expect(table.indexFromItem(item).isValid()).toBe(false);
	});

	test("decreasing column count removes truncated items", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(1);
		table.setColumnCount(3);
		table.setItem(0, 2, item);

		table.setColumnCount(2);

		expect(table.columnCount()).toBe(2);
		expect(table.indexFromItem(item).isValid()).toBe(false);
	});

	test("takeItem removes and returns item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(2);
		table.setColumnCount(2);
		table.setItem(1, 1, item);

		const taken = table.takeItem(1, 1);

		expect(taken).toBe(item);
		expect(table.item(1, 1)).toBeNull();
		expect(table.indexFromItem(item).isValid()).toBe(false);
	});

	test("takeItem returns null for empty cell", () => {
		const table = new CTableWidget();

		table.setRowCount(1);
		table.setColumnCount(1);

		expect(table.takeItem(0, 0)).toBeNull();
	});

	test("takeItem returns null for invalid cell", () => {
		const table = new CTableWidget();

		table.setRowCount(1);
		table.setColumnCount(1);

		expect(table.takeItem(-1, 0)).toBeNull();
		expect(table.takeItem(0, -1)).toBeNull();
		expect(table.takeItem(1, 0)).toBeNull();
		expect(table.takeItem(0, 1)).toBeNull();
	});

	test("indexFromItem returns correct index", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(3);
		table.setColumnCount(4);
		table.setItem(2, 3, item);

		const index = table.indexFromItem(item);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(2);
		expect(index.column()).toBe(3);
	});

	test("indexFromItem returns invalid index for unknown item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(1);
		table.setColumnCount(1);

		expect(table.indexFromItem(item).isValid()).toBe(false);
	});

	test("itemFromIndex returns item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(2);
		table.setColumnCount(2);
		table.setItem(1, 1, item);

		const index = table.indexFromItem(item);

		expect(table.itemFromIndex(index)).toBe(item);
	});

	test("itemFromIndex returns null for invalid index", () => {
		const table = new CTableWidget();

		expect(table.itemFromIndex(new CModelIndex())).toBeNull();
	});

	test("model exposes item text", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Hello");

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);

		const index = table.indexFromItem(item);

		expect(table.model()?.data(index)).toBe("Hello");
	});

	test("model exposes the typed item value", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem(42.5);

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);

		const value = table.model()?.data(table.indexFromItem(item));

		expect(value).toBe(42.5);
		expect(typeof value).toBe("number");
		expect(item.text()).toBe("42.5");
	});

	test("setText changes typed item data to a string", () => {
		const item = new CTableWidgetItem(42);

		item.setText("forty-two");

		expect(item.data()).toBe("forty-two");
		expect(item.text()).toBe("forty-two");
	});

	test("model returns null for empty cell", () => {
		const table = new CTableWidget();

		table.setRowCount(1);
		table.setColumnCount(1);

		const index = table.model()?.index(0, 0);

		expect(index?.isValid()).toBe(true);
		expect(index !== undefined
			? table.model()?.data(index)
			: undefined
		).toBeNull();
	});

	test("sets horizontal header labels", () => {
		const table = new CTableWidget();

		table.setColumnCount(3);
		table.setHorizontalHeaderLabels([
			"Name", "Occupation", "Age"
		]);

		expect(
			table.model()?.headerData(0, COrientation.Horizontal)
		).toBe("Name");

		expect(
			table.model()?.headerData(1, COrientation.Horizontal)
		).toBe("Occupation");

		expect(
			table.model()?.headerData(2, COrientation.Horizontal)
		).toBe("Age");
	});

	test("sets vertical header labels", () => {
		const table = new CTableWidget();

		table.setRowCount(3);
		table.setVerticalHeaderLabels(["A", "B", "C"]);

		expect(
			table.model()?.headerData(0, COrientation.Vertical)
		).toBe("A");

		expect(
			table.model()?.headerData(1, COrientation.Vertical)
		).toBe("B");

		expect(
			table.model()?.headerData(2, COrientation.Vertical)
		).toBe("C");
	});

	test("header labels are copied", () => {
		const table = new CTableWidget();
		const labels = ["Name", "Value"];

		table.setColumnCount(2);
		table.setHorizontalHeaderLabels(labels);

		labels[0] = "Changed";

		expect(
			table.model()?.headerData(0, COrientation.Horizontal)
		).toBe("Name");
	});

	test("header uses default data when label is missing", () => {
		const table = new CTableWidget();

		table.setColumnCount(3);
		table.setHorizontalHeaderLabels(["Name"]);

		expect(
			table.model()?.headerData(0, COrientation.Horizontal)
		).toBe("Name");

		expect(
			table.model()?.headerData(1, COrientation.Horizontal)
		).toBe(2);
	});

	test("setCurrentItem sets current item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(2);
		table.setColumnCount(2);
		table.setItem(1, 1, item);

		table.setCurrentItem(item);

		expect(table.currentItem()).toBe(item);
		expect(table.currentIndex().row()).toBe(1);
		expect(table.currentIndex().column()).toBe(1);
	});

	test("setCurrentItem ignores unknown item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(1);
		table.setColumnCount(1);

		table.setCurrentItem(item);

		expect(table.currentItem()).toBeNull();
		expect(table.currentIndex().isValid()).toBe(false);
	});

	test("setCurrentItem null clears current item", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);

		table.setCurrentItem(item);
		table.setCurrentItem(null);

		expect(table.currentItem()).toBeNull();
		expect(table.currentIndex().isValid()).toBe(false);
	});

	test("currentItemChanged is emitted when current item changes", () => {
		const table = new CTableWidget();
		const first = new CTableWidgetItem("First");
		const second = new CTableWidgetItem("Second");
		const changes: Array<
			[CTableWidgetItem | null, CTableWidgetItem | null]
		> = [];

		table.setRowCount(1);
		table.setColumnCount(2);
		table.setItem(0, 0, first);
		table.setItem(0, 1, second);

		table.currentItemChanged.connect((current, previous) => {
			changes.push([current, previous]);
		});

		table.setCurrentItem(first);
		table.setCurrentItem(second);

		expect(changes).toEqual([
			[first, null],
			[second, first]
		]);
	});

	test("selectedItems returns selected items", () => {
		const table = new CTableWidget();
		const first = new CTableWidgetItem("First");
		const second = new CTableWidgetItem("Second");

		table.setRowCount(2);
		table.setColumnCount(2);
		table.setItem(0, 0, first);
		table.setItem(1, 1, second);

		table.selectionModel()?.select(table.indexFromItem(first));
		table.selectionModel()?.select(table.indexFromItem(second));

		expect(table.selectedItems()).toEqual([first, second]);
	});

	test("selectedItems ignores empty selected cells", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Item");

		table.setRowCount(1);
		table.setColumnCount(2);
		table.setItem(0, 0, item);

		const emptyIndex = table.model()?.index(0, 1);

		table.selectionModel()?.select(table.indexFromItem(item));

		if (emptyIndex !== undefined)
			table.selectionModel()?.select(emptyIndex);

		expect(table.selectedItems()).toEqual([item]);
	});

	test("F2 opens a line edit for string data", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Alice");

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.setCurrentItem(item);
		table.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, "F2")
		);

		const editor = findEditor(table, CLineEdit);
		expect(editor).not.toBeNull();
		expect(editor?.text()).toBe("Alice");
	});

	test("Enter commits text through the inherited editor lifecycle", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Alice");

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.edit(table.indexFromItem(item));

		const editor = findEditor(table, CLineEdit)!;
		editor.setText("Bob");
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(item.data()).toBe("Bob");
		expect(item.text()).toBe("Bob");
		expect(editor.parent()).toBeNull();
	});

	test("automatically edits an integer with a spin box", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem(30);

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.edit(table.indexFromItem(item));

		const editor = findEditor(table, CSpinBox)!;
		expect(editor.value()).toBe(30);

		editor.setValue(31);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(item.data()).toBe(31);
		expect(typeof item.data()).toBe("number");
		expect(item.text()).toBe("31");
	});

	test("automatically edits a decimal with a double spin box", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem(12.5);

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.edit(table.indexFromItem(item));

		const editor = findEditor(table, CDoubleSpinBox)!;
		expect(editor.value()).toBe(12.5);

		editor.setValue(19.75);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(item.data()).toBe(19.75);
		expect(typeof item.data()).toBe("number");
	});

	test("automatically edits a Date with a date edit", () => {
		const table = new CTableWidget();
		const original = new Date(2026, 9, 8);
		const replacement = new Date(2027, 4, 17);
		const item = new CTableWidgetItem(original);

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.edit(table.indexFromItem(item));

		const editor = findEditor(table, CDateEdit)!;
		expect(editor.date().getTime()).toBe(original.getTime());

		editor.setDate(replacement);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(item.data()).toBeInstanceOf(Date);
		expect((item.data() as Date).getTime()).toBe(replacement.getTime());
	});

	test("Space toggles a boolean item without opening an editor", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem(true);

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.setCurrentItem(item);
		table.contentKeyPressEvent(
			new CKeyEvent(CEventType.KeyPress, " ")
		);

		expect(item.data()).toBe(false);
		expect(typeof item.data()).toBe("boolean");
		expect(findEditor(table, CLineEdit)).toBeNull();
	});

	test("an explicit integer delegate converts string data to a number", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("30");

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.setItemDelegateForColumn(0, new CIntItemDelegate());
		table.edit(table.indexFromItem(item));

		const editor = findEditor(table, CSpinBox)!;
		editor.setValue(45);
		editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(item.data()).toBe(45);
		expect(typeof item.data()).toBe("number");
	});

	test("a combo-box column delegate commits the selected text", () => {
		const table = new CTableWidget();
		const item = new CTableWidgetItem("Slovenia");
		const delegate = new CComboBoxItemDelegate([
			"Slovenia",
			"Austria",
			"Italy"
		]);

		table.setRowCount(1);
		table.setColumnCount(1);
		table.setItem(0, 0, item);
		table.setItemDelegateForColumn(0, delegate);
		table.edit(table.indexFromItem(item));

		const editor = findEditor(table, CComboBox)!;
		expect(editor.currentText()).toBe("Slovenia");
		expect(editor.popup().isOpen()).toBe(true);

		editor.setCurrentIndex(2);
		editor.activated.emit(2);

		expect(item.data()).toBe("Italy");
		expect(editor.parent()).toBeNull();
	});
});
