import { CTableView } from "../../src/widgets/CTableView.js";
import { CNumberEdit } from "../../src/widgets/CNumberEdit.js";
import { CNumberItemDelegate } from "../../src/widgets/CNumberItemDelegate.js";
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

    test("pastes a block without replacing numeric types or partially applying invalid input", () => {
        const table = new CTableWidget();
        table.setRowCount(2);
        table.setColumnCount(2);
        table.setItem(0, 0, new CTableWidgetItem("A"));
        table.setItem(0, 1, new CTableWidgetItem(10));
        table.setItem(1, 0, new CTableWidgetItem("B"));
        table.setItem(1, 1, new CTableWidgetItem(20));
        table.setCurrentIndex(table.model()!.index(0, 0));
        const errors: unknown[][] = [];
        table.pasteRejected.connect((...error) => errors.push(error));

        table.paste("C\t30\nD\tabc");
        expect(errors).toEqual([[1, 1, "Expected a number."]]);
        expect(table.item(0, 0)?.data()).toBe("A");
        expect(table.item(0, 1)?.data()).toBe(10);

        table.paste("C\t30\nD\t40");
        expect(table.item(0, 0)?.data()).toBe("C");
        expect(table.item(0, 1)?.data()).toBe(30);
        expect(table.item(1, 0)?.data()).toBe("D");
        expect(table.item(1, 1)?.data()).toBe(40);
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

	test("current item follows its row when sorting", () => {
		const table = new CTableWidget();
		const bob = new CTableWidgetItem("Bob");
		const alice = new CTableWidgetItem("Alice");
		table.setRowCount(2);
		table.setColumnCount(1);
		table.setItem(0, 0, bob);
		table.setItem(1, 0, alice);
		table.setCurrentItem(bob);

		table.sortByColumn(0);

		expect(table.currentItem()).toBe(bob);
		expect(table.currentIndex().row()).toBe(1);
	});

	test("selected items follow their rows when sorting", () => {
		const table = new CTableWidget();
		const carol = new CTableWidgetItem("Carol");
		const alice = new CTableWidgetItem("Alice");
		const bob = new CTableWidgetItem("Bob");
		table.setRowCount(3);
		table.setColumnCount(1);
		table.setItem(0, 0, carol);
		table.setItem(1, 0, alice);
		table.setItem(2, 0, bob);
		table.selectionModel()?.select(table.indexFromItem(carol));
		table.selectionModel()?.select(table.indexFromItem(bob));

		table.sortByColumn(0);

		expect(table.selectedItems()).toEqual([carol, bob]);
		expect(table.indexFromItem(carol).row()).toBe(2);
		expect(table.indexFromItem(bob).row()).toBe(1);
	});

	test("sorting does not emit currentItemChanged for the same item", () => {
		const table = new CTableWidget();
		const bob = new CTableWidgetItem("Bob");
		table.setRowCount(2);
		table.setColumnCount(1);
		table.setItem(0, 0, bob);
		table.setItem(1, 0, new CTableWidgetItem("Alice"));
		table.setCurrentItem(bob);
		let changedCount = 0;
		table.currentItemChanged.connect(() => {
			changedCount++;
		});

		table.sortByColumn(0);

		expect(table.currentItem()).toBe(bob);
		expect(changedCount).toBe(0);
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
    describe("number-expression delegate integration", () => {
        function setup(initial = 30, explicit = true) {
            const table = new CTableWidget();
            table.resize(500, 200);
            table.setRowCount(1);
            table.setColumnCount(1);
            const item = new CTableWidgetItem(initial);
            table.setItem(0, 0, item);
            const column = 0;
            const index = table.indexFromItem(item);
            if (explicit) table.setItemDelegateForColumn(column, new CNumberItemDelegate());
            return { table, index, column, value: () => item.data() };
        }

        function open(table: CTableView, index: CModelIndex): CNumberEdit {
            table.setCurrentIndex(index);
            table.contentKeyPressEvent(new CKeyEvent(CEventType.KeyPress, "F2"));
            const editor = findEditor(table, CNumberEdit);
            expect(editor).not.toBeNull();
            return editor!;
        }
        function enterFormula(editor: CNumberEdit, formula: string): void {
            editor.setFocus(); editor.selectAll(); editor.insert(formula);
        }
        test("F2 opens the configured arithmetic editor with the cell value", () => {
            const { table, index } = setup();
            const editor = open(table, index);
            expect(editor.value()).toBe(30);
            expect(editor.expression()).toBe("30");
            expect(editor.hasFocus()).toBe(true);
            expect(table.currentIndex().equals(index)).toBe(true);
        });
        test("double-click opens the arithmetic editor for the clicked cell", () => {
            const { table, index, column } = setup();
            const x = table.horizontalHeader().sectionPosition(column) + 10;
            table.contentMouseDoubleClickEvent(new CMouseEvent(
                CEventType.MouseDoubleClick, x, 5, CMouseButton.LeftButton));
            const editor = findEditor(table, CNumberEdit);
            expect(editor).not.toBeNull();
            expect(editor?.value()).toBe(30);
            expect(table.currentIndex().equals(index)).toBe(true);
        });
        test("Enter stores the numeric formula result and detaches the editor", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            enterFormula(editor, "(60+40)*1.22");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(value()).toBe(122);
            expect(typeof value()).toBe("number");
            expect(editor.parent()).toBeNull();
        });
        test("Return supports decimal commas", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            enterFormula(editor, "(60+40)*1,22");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Return"));
            expect(value()).toBe(122);
            expect(editor.parent()).toBeNull();
        });
        test("display precision does not round the model value", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            editor.setDecimals(2);
            enterFormula(editor, "1/3");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(value()).toBe(1/3);
        });
        test("Escape discards a changed expression", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            enterFormula(editor, "99*2");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));
            expect(value()).toBe(30);
            expect(editor.parent()).toBeNull();
        });
        test("invalid Enter shows ERR and leaves model data unchanged", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            enterFormula(editor, "1/0");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(value()).toBe(30);
            expect(editor.displayText()).toBe("ERR");
            expect(editor.expression()).toBe("1/0");
            expect(findEditor(table, CNumberEdit)).toBe(editor);
        });
        test("an invalid draft can be corrected and committed", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            enterFormula(editor, "(2+");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(value()).toBe(30);
            enterFormula(editor, "6*7");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            expect(value()).toBe(42);
            expect(editor.parent()).toBeNull();
        });
        test("Escape can cancel an editor showing ERR", () => {
            const { table, index, value } = setup();
            const editor = open(table, index);
            enterFormula(editor, "1/0");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            editor.setFocus();
            editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));
            expect(value()).toBe(30);
            expect(editor.parent()).toBeNull();
        });
        test("reopening uses the stored result instead of the previous formula", () => {
            const { table, index } = setup();
            const editor = open(table, index);
            enterFormula(editor, "(60+40)*1.22");
            editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
            const reopened = open(table, index);
            expect(reopened).not.toBe(editor);
            expect(reopened.expression()).toBe("122");
            expect(reopened.value()).toBe(122);
        });
        test("integers still use a spin box without an explicit delegate", () => {
            const { table, index } = setup(30, false);
            table.edit(index);
            expect(findEditor(table, CSpinBox)).not.toBeNull();
            expect(findEditor(table, CNumberEdit)).toBeNull();
        });
        test("decimal numbers still use a double spin box without an explicit delegate", () => {
            const { table, index } = setup(12.5, false);
            table.edit(index);
            expect(findEditor(table, CDoubleSpinBox)).not.toBeNull();
            expect(findEditor(table, CNumberEdit)).toBeNull();
        });
        test("removing the arithmetic delegate restores automatic integer editing", () => {
            const { table, index, column } = setup();
            const editor = open(table, index);
            editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));
            table.setItemDelegateForColumn(column, null);
            table.edit(index);
            expect(findEditor(table, CSpinBox)).not.toBeNull();
            expect(findEditor(table, CNumberEdit)).toBeNull();
        });
    });
});
