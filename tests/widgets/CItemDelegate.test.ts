import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CRect } from "../../src/geometry/CRect.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CItemDelegate } from "../../src/widgets/CItemDelegate.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestTableModel extends CAbstractTableModel {
	#m_data: unknown[][];

	constructor(data: unknown[][] = [["Alice", 42, null]]) {
		super();
		this.#m_data = data;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_data.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_data[0]?.length ?? 0;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_data[index.row()]?.[index.column()] ?? null;
	}

	override headerData(
		_section: number,
		_orientation: COrientation
	): null {
		return null;
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		const row = this.#m_data[index.row()];

		if (!index.isValid() || row === undefined
			|| index.column() < 0 || index.column() >= row.length) {
			return false;
		}

		row[index.column()] = value;
		this.emitDataChanged(index, index);
		return true;
	}
}

describe("CItemDelegate", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("creates a line edit editor", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();

		const editor = delegate.createEditor(parent, model.index(0, 0));

		expect(editor).toBeInstanceOf(CLineEdit);
	});

	test("parents the editor to the supplied widget", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();

		const editor = delegate.createEditor(parent, model.index(0, 0));

		expect(editor.parent()).toBe(parent);
		expect(parent.children()).toContain(editor);
	});

	test("creates a new editor on every request", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 0);

		const editor1 = delegate.createEditor(parent, index);
		const editor2 = delegate.createEditor(parent, index);

		expect(editor2).not.toBe(editor1);
	});

	test("copies string model data to the editor", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(parent, index);

		delegate.setEditorData(editor, index);

		expect((editor as CLineEdit).text()).toBe("Alice");
	});

	test("converts numeric model data to text", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 1);
		const editor = delegate.createEditor(parent, index);

		delegate.setEditorData(editor, index);

		expect((editor as CLineEdit).text()).toBe("42");
	});

	test("converts null model data to empty text", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 2);
		const editor = delegate.createEditor(parent, index);

		delegate.setEditorData(editor, index);

		expect((editor as CLineEdit).text()).toBe("");
	});

	test("setEditorData ignores a non-line-edit widget", () => {
		const delegate = new CItemDelegate();
		const editor = new CWidget();
		const model = new TestTableModel();

		expect(() => {
			delegate.setEditorData(editor, model.index(0, 0));
		}).not.toThrow();
	});

	test("writes editor text to the model", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 0);
		const editor = delegate.createEditor(parent, index) as CLineEdit;

		editor.setText("Bob");
		delegate.setModelData(editor, model, index);

		expect(model.data(index)).toBe("Bob");
	});

	test("setModelData ignores a non-line-edit widget", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 0);

		delegate.setModelData(new CWidget(), model, index);

		expect(model.data(index)).toBe("Alice");
	});

	test("updates editor geometry", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(parent, model.index(0, 0));

		delegate.updateEditorGeometry(editor, new CRect(10, 20, 130, 28));

		expect(editor.x()).toBe(10);
		expect(editor.y()).toBe(20);
		expect(editor.width()).toBe(130);
		expect(editor.height()).toBe(28);
	});

	test("Enter emits commitData and closeEditor in that order", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(parent, model.index(0, 0));
		const events: string[] = [];

		delegate.commitData.connect(value => {
			expect(value).toBe(editor);
			events.push("commit");
		});
		delegate.closeEditor.connect(value => {
			expect(value).toBe(editor);
			events.push("close");
		});

		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(events).toEqual(["commit", "close"]);
	});

	test("Escape emits only closeEditor", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(parent, model.index(0, 0));
		let commitCount = 0;
		let closeCount = 0;

		delegate.commitData.connect(() => ++commitCount);
		delegate.closeEditor.connect(() => ++closeCount);

		const event = new CKeyEvent(CEventType.KeyPress, "Escape");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(commitCount).toBe(0);
		expect(closeCount).toBe(1);
	});

	test("ordinary keys are handled by the line edit", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(
			parent,
			model.index(0, 0)
		) as CLineEdit;
		let commitCount = 0;
		let closeCount = 0;

		delegate.commitData.connect(() => ++commitCount);
		delegate.closeEditor.connect(() => ++closeCount);

		const event = new CKeyEvent(CEventType.KeyPress, "X");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(editor.text()).toBe("X");
		expect(commitCount).toBe(0);
		expect(closeCount).toBe(0);
	});

	test("editingFinished emits commitData and closeEditor", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(
			parent,
			model.index(0, 0)
		) as CLineEdit;
		const events: string[] = [];

		delegate.commitData.connect(value => {
			expect(value).toBe(editor);
			events.push("commit");
		});
		delegate.closeEditor.connect(value => {
			expect(value).toBe(editor);
			events.push("close");
		});

		editor.editingFinished.emit();

		expect(events).toEqual(["commit", "close"]);
	});

	test("signals from different editors identify their source editor", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 0);
		const editor1 = delegate.createEditor(parent, index);
		const editor2 = delegate.createEditor(parent, index);
		const committedEditors: CWidget[] = [];

		delegate.commitData.connect(editor => committedEditors.push(editor));

		editor1.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		editor2.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(committedEditors).toEqual([editor1, editor2]);
	});
});
