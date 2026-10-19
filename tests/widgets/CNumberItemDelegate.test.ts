import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CNumberItemDelegate } from "../../src/widgets/CNumberItemDelegate.js";
import { CNumberEdit } from "../../src/widgets/CNumberEdit.js";
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

describe("CNumberItemDelegate", () => {
    beforeEach(() => new CApplication(createTestCanvas()));
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
    });
    function setup() {
        const delegate = new CNumberItemDelegate();
        const model = new TestModel();
        const index = model.index(0, 0);
        const parent = new CWidget();
        const editor = delegate.createEditor(parent, index) as CNumberEdit;
        editor.resize(180, 28);
        delegate.setEditorData(editor, index);
        return { delegate, model, index, parent, editor };
    }
    function draft(editor: CNumberEdit, text: string): void {
        editor.setFocus(); editor.selectAll(); editor.insert(text);
    }
    test("creates a parented number editor with default precision", () => {
        const { editor, parent } = setup();
        expect(editor).toBeInstanceOf(CNumberEdit);
        expect(editor.parent()).toBe(parent);
        expect(editor.decimals()).toBe(2);
    });
    test("applies configured precision to new editors", () => {
        const { delegate, index, parent } = setup();
        delegate.setDecimals(4);
        const editor = delegate.createEditor(parent, index) as CNumberEdit;
        expect(editor.decimals()).toBe(4);
    });
    test("bounds decimal precision and ignores non-finite settings", () => {
        const delegate = new CNumberItemDelegate();
        delegate.setDecimals(-1); expect(delegate.decimals()).toBe(0);
        delegate.setDecimals(100); expect(delegate.decimals()).toBe(20);
        delegate.setDecimals(3.9); expect(delegate.decimals()).toBe(3);
        delegate.setDecimals(NaN); delegate.setDecimals(Infinity);
        expect(delegate.decimals()).toBe(3);
    });
    test("copies numeric model data without rounding it", () => {
        const { editor } = setup();
        expect(editor.value()).toBe(12.345);
        expect(editor.expression()).toBe("12.345");
        expect(editor.selectedText()).toBe("12.345");
        expect(editor.displayText()).toBe("12.35");
    });
    test("accepts numeric strings and negative model values", () => {
        const { delegate, editor, model, index } = setup();
        model.value = "-123.456";
        delegate.setEditorData(editor, index);
        expect(editor.value()).toBe(-123.456);
        expect(editor.expression()).toBe("-123.456");
    });
    test("ignores non-numeric and non-finite model data", () => {
        const { delegate, editor, model, index } = setup();
        for (const value of ["abc", NaN, Infinity, -Infinity]) {
            model.value = value;
            delegate.setEditorData(editor, index);
            expect(editor.value()).toBe(12.345);
        }
    });
    test("writes a formula result as a number", () => {
        const { delegate, editor, model, index } = setup();
        draft(editor, "(60+40)*1.22");
        delegate.setModelData(editor, model, index);
        expect(model.value).toBe(122);
        expect(typeof model.value).toBe("number");
    });
    test("does not round the value written to the model", () => {
        const { delegate, editor, model, index } = setup();
        editor.setDecimals(2);
        draft(editor, "1/3");
        delegate.setModelData(editor, model, index);
        expect(model.value).toBe(1/3);
    });
    test("accepts decimal commas in formulas", () => {
        const { delegate, editor, model, index } = setup();
        draft(editor, "(60+40)*1,22");
        delegate.setModelData(editor, model, index);
        expect(model.value).toBe(122);
    });
    test("Enter commits before closing, with the originating editor", () => {
        const { delegate, editor } = setup();
        draft(editor, "6*7");
        const events: string[] = [];
        delegate.commitData.connect(source => {
            expect(source).toBe(editor);
            expect(editor.value()).toBe(42);
            events.push("commit");
        });
        delegate.closeEditor.connect(source => {
            expect(source).toBe(editor);
            events.push("close");
        });
        const event = new CKeyEvent(CEventType.KeyPress, "Enter");
        editor.event(event);
        expect(event.isAccepted()).toBe(true);
        expect(events).toEqual(["commit", "close"]);
    });
    test("Return also commits and closes", () => {
        const { delegate, editor } = setup();
        const commit = vi.fn(); const close = vi.fn();
        delegate.commitData.connect(commit); delegate.closeEditor.connect(close);
        editor.event(new CKeyEvent(CEventType.KeyPress, "Return"));
        expect(commit).toHaveBeenCalledExactlyOnceWith(editor);
        expect(close).toHaveBeenCalledExactlyOnceWith(editor);
    });
    test("Escape closes without requesting a commit", () => {
        const { delegate, editor, model } = setup();
        draft(editor, "99*2");
        const commit = vi.fn(); const close = vi.fn();
        delegate.commitData.connect(commit); delegate.closeEditor.connect(close);
        const event = new CKeyEvent(CEventType.KeyPress, "Escape");
        editor.event(event);
        expect(event.isAccepted()).toBe(true);
        expect(commit).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalledExactlyOnceWith(editor);
        expect(model.value).toBe(12.345);
    });
    test("invalid Enter shows ERR without committing or closing", () => {
        const { delegate, editor, model } = setup();
        draft(editor, "1/0");
        const commit = vi.fn(); const close = vi.fn();
        delegate.commitData.connect(commit); delegate.closeEditor.connect(close);
        editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(editor.hasFocus()).toBe(false);
        expect(editor.displayText()).toBe("ERR");
        expect(commit).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
        expect(model.value).toBe(12.345);
    });
    test("setModelData refuses incomplete and invalid expressions", () => {
        const { delegate, editor, model, index } = setup();
        for (const text of ["1/0", "(2+", "", "2 3"]) {
            editor.setExpression(text);
            delegate.setModelData(editor, model, index);
            expect(model.value).toBe(12.345);
        }
    });
    test("a corrected expression can be accepted after ERR", () => {
        const { delegate, editor, model, index } = setup();
        delegate.commitData.connect(source => delegate.setModelData(source, model, index));
        draft(editor, "2+");
        editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(model.value).toBe(12.345);
        draft(editor, "2+3");
        editor.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(model.value).toBe(5);
    });
    test("reopening starts with the numeric result rather than the old formula", () => {
        const { delegate, editor, model, index, parent } = setup();
        draft(editor, "(60+40)*1.22");
        delegate.setModelData(editor, model, index);
        const reopened = delegate.createEditor(parent, index) as CNumberEdit;
        delegate.setEditorData(reopened, index);
        expect(reopened.expression()).toBe("122");
        expect(reopened.value()).toBe(122);
    });
    test("numeric editor rejects letters when used by the delegate", () => {
        const { editor } = setup();
        draft(editor, "2+3");
        editor.insert("abc");
        editor.event(new CKeyEvent(CEventType.KeyPress, "e"));
        expect(editor.expression()).toBe("2+3");
    });
    test("ignores incompatible editors", () => {
        const { delegate, model, index } = setup();
        delegate.setEditorData(new CWidget(), index);
        delegate.setModelData(new CWidget(), model, index);
        expect(model.value).toBe(12.345);
    });
});

