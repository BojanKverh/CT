import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import {
	CCompleter,
	CCompleterCaseSensitivity
} from "../../src/widgets/CCompleter.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CListWidget } from "../../src/widgets/CListWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class CompletionModel extends CAbstractTableModel {
	rows: unknown[][] = [
		[1, "Mercator"],
		[2, "Merkur"],
		[3, "Petrol"]
	];

	override rowCount(): number { return this.rows.length; }
	override columnCount(): number { return 2; }
	override data(index: CModelIndex): unknown {
		return this.rows[index.row()]?.[index.column()] ?? null;
	}

	resetRows(rows: unknown[][]): void {
		this.rows = rows;
		this.resetModel();
	}
}

function key(name: string): CKeyEvent {
	return new CKeyEvent(CEventType.KeyPress, name);
}

describe("CCompleter", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has case-insensitive matching by default", () => {
		const completer = new CCompleter();
		expect(completer.caseSensitivity()).toBe(
			CCompleterCaseSensitivity.CaseInsensitive
		);
	});

	test("stores a defensive copy of its string list", () => {
		const values = ["Mercator", "Merkur"];
		const completer = new CCompleter(values);
		values.push("Petrol");
		expect(completer.stringList()).toEqual(["Mercator", "Merkur"]);
	});

	test("is associated through CLineEdit", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		expect(editor.completer()).toBe(completer);
		expect(completer.widget()).toBe(editor);
	});

	test("filters values when the user edits text", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator", "Merkur", "Petrol"]);
		editor.setCompleter(completer);
		editor.setFocus();
		editor.insert("me");
		expect(completer.completionPrefix()).toBe("me");
		expect(completer.completionCount()).toBe(2);
		expect(completer.currentCompletion()).toBe("Mercator");
		expect(completer.popup().isOpen()).toBe(true);
		expect(editor.hasFocus()).toBe(true);
		expect(completer.popup().hasFocus()).toBe(false);
	});

	test("programmatic text changes do not open the popup", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		editor.setText("Me");
		expect(completer.popup().isOpen()).toBe(false);
	});

	test("closes the popup when there are no matches", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		editor.insert("M");
		expect(completer.popup().isOpen()).toBe(true);
		editor.insert("x");
		expect(completer.completionCount()).toBe(0);
		expect(completer.popup().isOpen()).toBe(false);
	});

	test("supports case-sensitive matching", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator", "mercator"]);
		completer.setCaseSensitivity(CCompleterCaseSensitivity.CaseSensitive);
		editor.setCompleter(completer);
		editor.insert("m");
		expect(completer.completionCount()).toBe(1);
		expect(completer.currentCompletion()).toBe("mercator");
	});

	test("reads completions from the selected model column", () => {
		const model = new CompletionModel();
		const editor = new CLineEdit();
		const completer = new CCompleter(model);
		completer.setCompletionColumn(1);
		editor.setCompleter(completer);
		editor.insert("Pe");
		expect(completer.completionCount()).toBe(1);
		expect(completer.currentCompletion()).toBe("Petrol");
	});

	test("refreshes open completions when the model resets", () => {
		const model = new CompletionModel();
		const editor = new CLineEdit();
		const completer = new CCompleter(model);
		completer.setCompletionColumn(1);
		editor.setCompleter(completer);
		editor.insert("M");
		model.resetRows([[1, "Mimovrste"]]);
		expect(completer.completionCount()).toBe(1);
		expect(completer.currentCompletion()).toBe("Mimovrste");
	});

	test("Down and Enter activate a completion", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator", "Merkur"]);
		const activated = vi.fn();
		completer.activated.connect(activated);
		editor.setCompleter(completer);
		editor.insert("M");
		editor.event(key("ArrowDown"));
		editor.event(key("Enter"));
		expect(editor.text()).toBe("Merkur");
		expect(activated).toHaveBeenCalledWith("Merkur");
		expect(completer.popup().isOpen()).toBe(false);
	});

	test("Escape closes the popup without changing text", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		editor.insert("M");
		const event = key("Escape");
		editor.event(event);
		expect(event.isAccepted()).toBe(true);
		expect(editor.text()).toBe("M");
		expect(completer.popup().isOpen()).toBe(false);
	});

	test("a mouse activation applies the clicked completion", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator", "Merkur"]);
		editor.setCompleter(completer);
		editor.insert("M");
		completer.listWidget().activateRow(1, 0);
		expect(editor.text()).toBe("Merkur");
		expect(completer.popup().isOpen()).toBe(false);
	});

	test("popup is positioned below the editor and is at least as wide", () => {
		const editor = new CLineEdit();
		editor.setGeometry(20, 30, 160, 28);
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		editor.insert("M");
		expect(completer.popup().x()).toBe(20);
		expect(completer.popup().y()).toBe(58);
		expect(completer.popup().width()).toBeGreaterThanOrEqual(160);
	});

	test("popup height follows the maximum visible item count", () => {
		const editor = new CLineEdit();
		const values = Array.from({ length: 12 }, (_, index) => `A${index}`);
		const completer = new CCompleter(values);
		editor.setCompleter(completer);
		editor.insert("A");
		const frames = 2 * completer.listWidget().frameWidth()
			+ 2 * completer.popup().frameWidth();
		expect(completer.popup().height()).toBe(
			CCompleter.MaxVisibleItems * CListWidget.ItemHeight + frames
		);
	});

	test("does not open for a read-only editor", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		editor.setReadOnly();
		completer.complete("M");
		expect(completer.popup().isOpen()).toBe(false);
	});

	test("can be detached from the editor", () => {
		const editor = new CLineEdit();
		const completer = new CCompleter(["Mercator"]);
		editor.setCompleter(completer);
		editor.setCompleter(null);
		expect(editor.completer()).toBeNull();
		expect(completer.widget()).toBeNull();
		editor.insert("M");
		expect(completer.popup().isOpen()).toBe(false);
	});
});
