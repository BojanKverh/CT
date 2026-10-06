import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CDoubleItemDelegate } from "../../src/widgets/CDoubleItemDelegate.js";
import { CDoubleSpinBox } from "../../src/widgets/CDoubleSpinBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestModel extends CAbstractTableModel {
	value: unknown = 12.345;
	override rowCount(): number { return 1; }
	override columnCount(): number { return 1; }
	override data(): unknown { return this.value; }
	override headerData(_section: number, _orientation: COrientation): null {
		return null;
	}
	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid()) return false;
		this.value = value;
		this.emitDataChanged(index, index);
		return true;
	}
}

describe("CDoubleItemDelegate", () => {
	beforeEach(() => new CApplication(createTestCanvas()));
	afterEach(() => {
		if (CApplication.exists()) CApplication.instance().destroy();
	});

	test("creates a configured double spin box", () => {
		const delegate = new CDoubleItemDelegate();
		delegate.setDecimals(3);
		delegate.setRange(-10.5, 20.25);
		delegate.setSingleStep(0.125);
		const parent = new CWidget();
		const model = new TestModel();
		const editor = delegate.createEditor(parent, model.index(0, 0));

		expect(editor).toBeInstanceOf(CDoubleSpinBox);
		expect(editor.parent()).toBe(parent);
		expect((editor as CDoubleSpinBox).minimum()).toBe(-10.5);
		expect((editor as CDoubleSpinBox).maximum()).toBe(20.25);
		expect((editor as CDoubleSpinBox).singleStep()).toBe(0.125);
		expect((editor as CDoubleSpinBox).decimals()).toBe(3);
	});

	test("copies and rounds model data in the editor", () => {
		const delegate = new CDoubleItemDelegate();
		delegate.setDecimals(2);
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CDoubleSpinBox;

		delegate.setEditorData(editor, index);
		expect(editor.value()).toBe(12.35);
	});

	test("writes a number to the model", () => {
		const delegate = new CDoubleItemDelegate();
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CDoubleSpinBox;
		editor.setValue(7.25);

		delegate.setModelData(editor, model, index);
		expect(model.value).toBe(7.25);
		expect(typeof model.value).toBe("number");
	});

	test("Enter commits and closes the editor", () => {
		const delegate = new CDoubleItemDelegate();
		const model = new TestModel();
		const editor = delegate.createEditor(new CWidget(), model.index(0, 0));
		const events: string[] = [];
		delegate.commitData.connect(() => events.push("commit"));
		delegate.closeEditor.connect(() => events.push("close"));

		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		editor.event(event);
		expect(event.isAccepted()).toBe(true);
		expect(events).toEqual(["commit", "close"]);
	});

	test("Escape closes without committing", () => {
		const delegate = new CDoubleItemDelegate();
		const model = new TestModel();
		const editor = delegate.createEditor(new CWidget(), model.index(0, 0));
		let commits = 0;
		let closes = 0;
		delegate.commitData.connect(() => ++commits);
		delegate.closeEditor.connect(() => ++closes);

		editor.event(new CKeyEvent(CEventType.KeyPress, "Escape"));
		expect(commits).toBe(0);
		expect(closes).toBe(1);
	});

	test("ignores incompatible editors", () => {
		const delegate = new CDoubleItemDelegate();
		const model = new TestModel();
		const index = model.index(0, 0);
		expect(() => delegate.setEditorData(new CWidget(), index)).not.toThrow();
		delegate.setModelData(new CWidget(), model, index);
		expect(model.value).toBe(12.345);
	});
});
