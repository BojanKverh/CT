import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CRect } from "../../src/geometry/CRect.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CItemDelegate } from "../../src/widgets/CItemDelegate.js";
import { CDateEdit } from "../../src/widgets/CDateEdit.js";
import { CDoubleSpinBox } from "../../src/widgets/CDoubleSpinBox.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CSpinBox } from "../../src/widgets/CSpinBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestTableModel extends CAbstractTableModel {
	#m_data: unknown[][];

	constructor(data: unknown[][] = [[
		"Alice", 42, null, 12.5, true, new Date(2026, 9, 6)
	]]) {
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

	override isEditable(_index: CModelIndex): boolean {
		return true;
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

		const editor = delegate.createEditor(parent, model.index(0, 0))!;

		expect(editor).toBeInstanceOf(CLineEdit);
	});

	test("parents the editor to the supplied widget", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();

		const editor = delegate.createEditor(parent, model.index(0, 0))!;

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
		const editor = delegate.createEditor(parent, index)!;

		delegate.setEditorData(editor, index);

		expect((editor as CLineEdit).text()).toBe("Alice");
	});

	test("creates a spin box for integer model data", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 1);
		const editor = delegate.createEditor(parent, index)!;

		delegate.setEditorData(editor, index);

		expect(editor).toBeInstanceOf(CSpinBox);
		expect((editor as CSpinBox).value()).toBe(42);
		expect(editor.hasFocus()).toBe(false);
	});

	test("creates a double spin box for decimal model data", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 3);
		const editor = delegate.createEditor(parent, index)!;

		delegate.setEditorData(editor, index);

		expect(editor).toBeInstanceOf(CDoubleSpinBox);
		expect((editor as CDoubleSpinBox).value()).toBe(12.5);
	});

	test("does not create an editor for boolean model data", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 4);
		const editor = delegate.createEditor(new CWidget(), index);

		expect(editor).toBeNull();
	});

	test("creates a date edit for Date model data", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 5);
		const editor = delegate.createEditor(new CWidget(), index)!;

		delegate.setEditorData(editor, index);

		expect(editor).toBeInstanceOf(CDateEdit);
		expect((editor as CDateEdit).date().getTime())
			.toBe((model.data(index) as Date).getTime());
	});

	test("keeps an invalid Date in a line edit", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel([[new Date(Number.NaN)]]);
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index);

		expect(editor).toBeInstanceOf(CLineEdit);
	});

	test("keeps numeric-looking strings in a line edit", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel([["42"]]);
		const index = model.index(0, 0);
		const editor = delegate.createEditor(new CWidget(), index)!;

		delegate.setEditorData(editor, index);

		expect(editor).toBeInstanceOf(CLineEdit);
		expect((editor as CLineEdit).text()).toBe("42");
	});

	test("integer editor supports values outside the spin box default range", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel([[-1234]]);
		const index = model.index(0, 0);
		const editor = delegate.createEditor(
			new CWidget(), index
		) as CSpinBox;

		delegate.setEditorData(editor, index);

		expect(editor.minimum()).toBe(Number.MIN_SAFE_INTEGER);
		expect(editor.maximum()).toBe(Number.MAX_SAFE_INTEGER);
		expect(editor.value()).toBe(-1234);
	});

	test("double editor preserves the model value decimal places", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel([[12.3456]]);
		const index = model.index(0, 0);
		const editor = delegate.createEditor(
			new CWidget(), index
		) as CDoubleSpinBox;

		delegate.setEditorData(editor, index);

		expect(editor.decimals()).toBe(4);
		expect(editor.value()).toBe(12.3456);
	});

	test("converts null model data to empty text", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const index = model.index(0, 2);
		const editor = delegate.createEditor(parent, index)!;

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

	test("writes an integer editor value as a number", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 1);
		const editor = delegate.createEditor(
			new CWidget(), index
		) as CSpinBox;

		editor.setValue(-123);
		delegate.setModelData(editor, model, index);

		expect(model.data(index)).toBe(-123);
		expect(typeof model.data(index)).toBe("number");
	});

	test("writes a double editor value as a number", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 3);
		const editor = delegate.createEditor(
			new CWidget(), index
		) as CDoubleSpinBox;

		editor.setValue(-45.75);
		delegate.setModelData(editor, model, index);

		expect(model.data(index)).toBe(-45.75);
		expect(typeof model.data(index)).toBe("number");
	});

	test("a mouse press on the boolean indicator toggles the model", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 4);
		const event = new CMouseEvent(
			CEventType.MousePress,
			50,
			15,
			CMouseButton.LeftButton
		);

		const handled = delegate.editorEvent(
			event,
			model,
			index,
			new CRect(0, 0, 100, 30)
		);

		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
		expect(model.data(index)).toBe(false);
		expect(typeof model.data(index)).toBe("boolean");
	});

	test("writes a date edit value as a Date copy", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 5);
		const editor = delegate.createEditor(
			new CWidget(), index
		) as CDateEdit;
		const date = new Date(2027, 2, 14);

		editor.setDate(date);
		delegate.setModelData(editor, model, index);

		expect(model.data(index)).toBeInstanceOf(Date);
		expect((model.data(index) as Date).getTime()).toBe(date.getTime());
		expect(model.data(index)).not.toBe(date);
	});

	test("Space toggles boolean model data without an editor", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const index = model.index(0, 4);
		const event = new CKeyEvent(CEventType.KeyPress, " ");

		const handled = delegate.editorEvent(
			event,
			model,
			index,
			new CRect(0, 0, 100, 30)
		);

		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
		expect(model.data(index)).toBe(false);
	});

	test("Enter commits and closes an automatically selected date editor", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const editor = delegate.createEditor(
			new CWidget(), model.index(0, 5)
		)!;
		const events: string[] = [];

		delegate.commitData.connect(() => events.push("commit"));
		delegate.closeEditor.connect(() => events.push("close"));
		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(events).toEqual(["commit", "close"]);
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
		const editor = delegate.createEditor(parent, model.index(0, 0))!;

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
		const editor = delegate.createEditor(parent, model.index(0, 0))!;
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
		const editor = delegate.createEditor(parent, model.index(0, 0))!;
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

	test("Enter accepts the event before emitting delegate signals", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(parent, model.index(0, 0))!;
		const event = new CKeyEvent(CEventType.KeyPress, "Enter");

		delegate.commitData.connect(() => {
			expect(event.isAccepted()).toBe(true);
		});
		delegate.closeEditor.connect(() => {
			expect(event.isAccepted()).toBe(true);
		});

		editor.event(event);
	});

	test("Escape accepts the event before emitting closeEditor", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(parent, model.index(0, 0))!;
		const event = new CKeyEvent(CEventType.KeyPress, "Escape");

		delegate.closeEditor.connect(() => {
			expect(event.isAccepted()).toBe(true);
		});

		editor.event(event);
	});

	test("ArrowUp is consumed without committing or closing", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(
			parent,
			model.index(0, 0)
		) as CLineEdit;
		let commitCount = 0;
		let closeCount = 0;

		delegate.setEditorData(editor, model.index(0, 0));
		delegate.commitData.connect(() => ++commitCount);
		delegate.closeEditor.connect(() => ++closeCount);

		const event = new CKeyEvent(CEventType.KeyPress, "ArrowUp");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(editor.text()).toBe("Alice");
		expect(commitCount).toBe(0);
		expect(closeCount).toBe(0);
	});

	test("ArrowDown is consumed without committing or closing", () => {
		const delegate = new CItemDelegate();
		const parent = new CWidget();
		const model = new TestTableModel();
		const editor = delegate.createEditor(
			parent,
			model.index(0, 0)
		) as CLineEdit;
		let commitCount = 0;
		let closeCount = 0;

		delegate.setEditorData(editor, model.index(0, 0));
		delegate.commitData.connect(() => ++commitCount);
		delegate.closeEditor.connect(() => ++closeCount);

		const event = new CKeyEvent(CEventType.KeyPress, "ArrowDown");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(editor.text()).toBe("Alice");
		expect(commitCount).toBe(0);
		expect(closeCount).toBe(0);
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
		const editor1 = delegate.createEditor(parent, index)!;
		const editor2 = delegate.createEditor(parent, index)!;
		const committedEditors: CWidget[] = [];

		delegate.commitData.connect(editor => committedEditors.push(editor));

		editor1.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
		editor2.event(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(committedEditors).toEqual([editor1, editor2]);
	});

	test("Enter commits and closes an automatically selected numeric editor", () => {
		const delegate = new CItemDelegate();
		const model = new TestTableModel();
		const editor = delegate.createEditor(
			new CWidget(), model.index(0, 1)
		)!;
		const events: string[] = [];

		delegate.commitData.connect(() => events.push("commit"));
		delegate.closeEditor.connect(() => events.push("close"));
		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		editor.event(event);

		expect(event.isAccepted()).toBe(true);
		expect(events).toEqual(["commit", "close"]);
	});
});
