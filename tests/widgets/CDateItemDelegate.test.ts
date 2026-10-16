import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CDateItemDelegate } from "../../src/widgets/CDateItemDelegate.js";
import { CDateTimeItemDelegate } from "../../src/widgets/CDateTimeItemDelegate.js";
import { CTimeItemDelegate } from "../../src/widgets/CTimeItemDelegate.js";
import { CDateEdit } from "../../src/widgets/CDateEdit.js";
import { CDateTimeEdit } from "../../src/widgets/CDateTimeEdit.js";
import { CTimeEdit } from "../../src/widgets/CTimeEdit.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class DateModel extends CAbstractTableModel {
	value = new Date(2026, 9, 16, 9, 30, 15);

	override rowCount(): number { return 1; }
	override columnCount(): number { return 1; }
	override data(index: CModelIndex): unknown {
		return index.isValid() ? this.value : null;
	}
	override isEditable(): boolean { return true; }
	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid() || !(value instanceof Date))
			return false;
		this.value = value;
		this.emitDataChanged(index, index);
		return true;
	}
}

describe("date and time item delegates", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});
	afterEach(() => {
		if (CApplication.exists()) CApplication.instance().destroy();
	});

	test("CDateItemDelegate transfers a date in both directions", () => {
		const model = new DateModel();
		const index = model.index(0, 0);
		const delegate = new CDateItemDelegate();
		const editor = delegate.createEditor(new CWidget(), index) as CDateEdit;

		delegate.setEditorData(editor, index);
		expect([
			editor.date().getFullYear(),
			editor.date().getMonth(),
			editor.date().getDate()
		]).toEqual([2026, 9, 16]);

		const value = new Date(2030, 1, 20);
		editor.setDate(value);
		delegate.setModelData(editor, model, index);
		expect(model.value.getTime()).toBe(value.getTime());
	});

	test("CTimeItemDelegate transfers the time component", () => {
		const model = new DateModel();
		const index = model.index(0, 0);
		const delegate = new CTimeItemDelegate();
		const editor = delegate.createEditor(new CWidget(), index) as CTimeEdit;

		delegate.setEditorData(editor, index);
		expect([editor.time().getHours(), editor.time().getMinutes()])
			.toEqual([9, 30]);

		editor.setTime(new Date(1970, 0, 1, 18, 45, 30));
		delegate.setModelData(editor, model, index);
		expect([model.value.getHours(), model.value.getMinutes(), model.value.getSeconds()])
			.toEqual([18, 45, 30]);
	});

	test("CDateTimeItemDelegate transfers the complete value", () => {
		const model = new DateModel();
		const index = model.index(0, 0);
		const delegate = new CDateTimeItemDelegate();
		const editor = delegate.createEditor(new CWidget(), index) as CDateTimeEdit;

		delegate.setEditorData(editor, index);
		expect(editor.dateTime().getTime()).toBe(model.value.getTime());

		const value = new Date(2031, 11, 24, 22, 15, 10);
		editor.setDateTime(value);
		delegate.setModelData(editor, model, index);
		expect(model.value.getTime()).toBe(value.getTime());
	});

	test("delegates format their displayed values like their editors", () => {
		const value = new Date(2026, 9, 16, 8, 5, 9);
		const date = new CDateItemDelegate();
		const time = new CTimeItemDelegate();
		const dateTime = new CDateTimeItemDelegate();

		expect(date.displayText(value)).toBe("16.10.2026");
		expect(time.displayText(value)).toBe("08:05");
		expect(dateTime.displayText(value)).toBe("16.10.2026 08:05");

		date.setDisplayFormat("yyyy-MM-dd");
		time.setDisplayFormat("h:mm AP");
		dateTime.setDateDisplayFormat("yyyy-MM-dd");
		dateTime.setTimeDisplayFormat("HH:mm:ss");

		expect(date.displayText(value)).toBe("2026-10-16");
		expect(time.displayText(value)).toBe("8:05 AM");
		expect(dateTime.displayText(value)).toBe("2026-10-16 08:05:09");
	});
});
