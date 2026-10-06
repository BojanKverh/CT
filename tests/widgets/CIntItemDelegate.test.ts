import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CIntItemDelegate } from "../../src/widgets/CIntItemDelegate.js";
import { CSpinBox } from "../../src/widgets/CSpinBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestModel extends CAbstractTableModel {
	value: unknown = 42;
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

describe("CIntItemDelegate", () => {
	beforeEach(() => new CApplication(createTestCanvas()));
	afterEach(() => {
		if (CApplication.exists()) CApplication.instance().destroy();
	});

	test("creates a configured spin box", () => {
		const delegate = new CIntItemDelegate();
		delegate.setRange(-20, 80);
		delegate.setSingleStep(5);
		const parent = new CWidget();
		const model = new TestModel();
		const editor = delegate.createEditor(parent, model.index(0, 0));

		expect(editor).toBeInstanceOf(CSpinBox);
		expect(editor.parent()).toBe(parent);
		expect((editor as CSpinBox).minimum()).toBe(-20);
		expect((editor as CSpinBox).maximum()).toBe(80);
		expect((editor as CSpinBox).singleStep()).toBe(5);
	});

	test("copies integer model data to the editor", () => {
		const delegate = new CIntItemDelegate();
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CSpinBox;

		delegate.setEditorData(editor, index);
		expect(editor.value()).toBe(42);
	});

	test("truncates floating-point model data", () => {
		const delegate = new CIntItemDelegate();
		const model = new TestModel();
		model.value = 12.9;
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CSpinBox;

		delegate.setEditorData(editor, index);
		expect(editor.value()).toBe(12);
	});

	test("writes a number to the model", () => {
		const delegate = new CIntItemDelegate();
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CSpinBox;
		editor.setValue(73);

		delegate.setModelData(editor, model, index);
		expect(model.value).toBe(73);
		expect(typeof model.value).toBe("number");
	});

	test("Enter commits and closes the editor", () => {
		const delegate = new CIntItemDelegate();
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
		const delegate = new CIntItemDelegate();
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
		const delegate = new CIntItemDelegate();
		const model = new TestModel();
		const index = model.index(0, 0);
		expect(() => delegate.setEditorData(new CWidget(), index)).not.toThrow();
		delegate.setModelData(new CWidget(), model, index);
		expect(model.value).toBe(42);
	});
});
