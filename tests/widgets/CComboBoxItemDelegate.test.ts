import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import { CComboBoxItemDelegate } from "../../src/widgets/CComboBoxItemDelegate.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestModel extends CAbstractTableModel {
	value: unknown = "Designer";

	override rowCount(): number { return 1; }
	override columnCount(): number { return 1; }
	override data(): unknown { return this.value; }
	override headerData(_section: number, _orientation: COrientation): null {
		return null;
	}
	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid())
			return false;

		this.value = value;
		this.emitDataChanged(index, index);
		return true;
	}
}

describe("CComboBoxItemDelegate", () => {
	beforeEach(() => new CApplication(createTestCanvas()));
	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("stores a defensive copy of its items", () => {
		const items = ["Developer", "Designer"];
		const delegate = new CComboBoxItemDelegate(items);
		items.push("Manager");

		expect(delegate.items()).toEqual(["Developer", "Designer"]);
	});

	test("sets and adds available items", () => {
		const delegate = new CComboBoxItemDelegate(["Developer"]);

		delegate.setItems(["Designer"]);
		delegate.addItem("Manager");

		expect(delegate.items()).toEqual(["Designer", "Manager"]);
	});

	test("creates a configured non-editable combo box", () => {
		const delegate = new CComboBoxItemDelegate([
			"Developer",
			"Designer",
			"Manager"
		]);
		const parent = new CWidget();
		const model = new TestModel();
		const editor = delegate.createEditor(parent, model.index(0, 0));

		expect(editor).toBeInstanceOf(CComboBox);
		expect(editor.parent()).toBe(parent);
		expect((editor as CComboBox).count()).toBe(3);
		expect((editor as CComboBox).itemText(1)).toBe("Designer");
		expect((editor as CComboBox).isEditable()).toBe(false);
	});

	test("can create an editable combo box", () => {
		const delegate = new CComboBoxItemDelegate(["Developer"]);
		delegate.setEditable(true);
		const model = new TestModel();

		const editor = delegate.createEditor(
			new CWidget(),
			model.index(0, 0)
		) as CComboBox;

		expect(delegate.isEditable()).toBe(true);
		expect(editor.isEditable()).toBe(true);
	});

	test("copies matching model data to the editor", () => {
		const delegate = new CComboBoxItemDelegate([
			"Developer",
			"Designer",
			"Manager"
		]);
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CComboBox;

		delegate.setEditorData(editor, index);

		expect(editor.currentIndex()).toBe(1);
		expect(editor.currentText()).toBe("Designer");
	});

	test("a non-editable editor displays unknown data without adding an item", () => {
		const delegate = new CComboBoxItemDelegate(["Developer", "Manager"]);
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CComboBox;

		delegate.setEditorData(editor, index);

		expect(editor.count()).toBe(2);
		expect(editor.currentIndex()).toBe(-1);
		expect(editor.currentText()).toBe("Designer");
	});

	test("an editable editor preserves unknown model data", () => {
		const delegate = new CComboBoxItemDelegate(["Developer", "Manager"]);
		delegate.setEditable(true);
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CComboBox;

		delegate.setEditorData(editor, index);

		expect(editor.currentIndex()).toBe(-1);
		expect(editor.currentText()).toBe("Designer");
	});

	test("writes the selected text to the model", () => {
		const delegate = new CComboBoxItemDelegate([
			"Developer",
			"Designer",
			"Manager"
		]);
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CComboBox;
		editor.setCurrentIndex(2);

		delegate.setModelData(editor, model, index);

		expect(model.value).toBe("Manager");
	});

	test("opens the popup after the editor is shown", () => {
		const delegate = new CComboBoxItemDelegate(["Developer", "Designer"]);
		const model = new TestModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index) as CComboBox;
		delegate.setEditorData(editor, index);

		delegate.editorShown(editor, index);

		expect(editor.popup().isOpen()).toBe(true);
	});

	test("Enter commits and closes the editor", () => {
		const delegate = new CComboBoxItemDelegate(["Developer", "Designer"]);
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
		const delegate = new CComboBoxItemDelegate(["Developer", "Designer"]);
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

	test("activating an item commits and closes the editor", () => {
		const delegate = new CComboBoxItemDelegate(["Developer", "Designer"]);
		const model = new TestModel();
		const editor = delegate.createEditor(
			new CWidget(),
			model.index(0, 0)
		) as CComboBox;
		const events: string[] = [];
		delegate.commitData.connect(() => events.push("commit"));
		delegate.closeEditor.connect(() => events.push("close"));

		editor.activated.emit(1);

		expect(events).toEqual(["commit", "close"]);
	});

	test("ignores incompatible editors", () => {
		const delegate = new CComboBoxItemDelegate(["Developer", "Designer"]);
		const model = new TestModel();
		const index = model.index(0, 0);

		expect(() => delegate.setEditorData(new CWidget(), index)).not.toThrow();
		delegate.setModelData(new CWidget(), model, index);
		expect(model.value).toBe("Designer");
	});
});
