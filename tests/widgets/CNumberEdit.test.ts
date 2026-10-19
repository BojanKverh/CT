import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CClipboard } from "../../src/core/CClipboard.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { CNumberEdit } from "../../src/widgets/CNumberEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

class TestNumberEdit extends CNumberEdit {
    paintForTest(painter: CPainter): void { this.paintEvent(painter); }
}

describe("CNumberEdit", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), writable: true, configurable: true
        });
        Object.defineProperty(globalThis, "navigator", {
            value: { clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
                readText: vi.fn().mockResolvedValue("")
            } }, writable: true, configurable: true
        });
        new CApplication(createTestCanvas());
    });
    afterEach(() => {
        vi.restoreAllMocks();
        if (CApplication.exists()) CApplication.instance().destroy();
    });
    function editor(): CNumberEdit {
        const edit = new CNumberEdit();
        edit.resize(180, 28);
        return edit;
    }
    function key(edit: CNumberEdit, text: string, ctrl = false): CKeyEvent {
        const event = new CKeyEvent(CEventType.KeyPress, text, ctrl);
        edit.event(event);
        return event;
    }
    function draft(edit: CNumberEdit, expression: string): void {
        edit.setFocus();
        edit.selectAll();
        edit.insert(expression);
    }
    test("starts with a zero expression and value", () => {
        const edit = editor();
        expect(edit.expression()).toBe("0");
        expect(edit.value()).toBe(0);
        expect(edit.displayText()).toBe("0");
        expect(edit.decimals()).toBe(2);
        expect(edit.canUndo()).toBe(false);
    });
    test("evaluates the requested formula", () => {
        const edit = editor();
        expect(edit.setExpression("(60+40)*1.22")).toBe(true);
        expect(edit.value()).toBe(122);
        expect(edit.expression()).toBe("(60+40)*1.22");
        expect(edit.displayText()).toBe("122");
    });
    test("shows the expression on focus and result on focus loss", () => {
        const edit = editor();
        edit.setExpression("(60+40)*1,22");
        edit.setFocus();
        expect(edit.displayText()).toBe("(60+40)*1,22");
        edit.clearFocus();
        expect(edit.displayText()).toBe("122");
        edit.setFocus();
        expect(edit.expression()).toBe("(60+40)*1,22");
    });
    test("user edits change the expression without committing the numeric value", () => {
        const edit = editor();
        draft(edit, "2+3");
        expect(edit.expression()).toBe("2+3");
        expect(edit.value()).toBe(0);
        expect(edit.commit()).toBe(true);
        expect(edit.value()).toBe(5);
    });
    test("Enter commits and clears focus", () => {
        const edit = editor();
        draft(edit, "(60+40)*1.22");
        const finished = vi.fn();
        const returned = vi.fn();
        edit.editingFinished.connect(finished);
        edit.returnPressed.connect(returned);
        expect(key(edit, "Enter").isAccepted()).toBe(true);
        expect(edit.hasFocus()).toBe(false);
        expect(edit.displayText()).toBe("122");
        expect(finished).toHaveBeenCalledOnce();
        expect(returned).toHaveBeenCalledOnce();
    });
    test("Return also commits and clears focus", () => {
        const edit = editor();
        draft(edit, "6*7");
        key(edit, "Return");
        expect(edit.value()).toBe(42);
        expect(edit.hasFocus()).toBe(false);
    });
    test("moving focus to another widget commits the expression", () => {
        const edit = editor();
        draft(edit, "3*4");
        const other = editor();
        other.setFocus();
        expect(edit.value()).toBe(12);
        expect(edit.displayText()).toBe("12");
    });
    test("allows incomplete arithmetic during typing", () => {
        const edit = editor();
        edit.setFocus(); edit.selectAll();
        for (const character of "(60+") key(edit, character);
        expect(edit.expression()).toBe("(60+");
        expect(edit.hasValidationError()).toBe(false);
    });
    test("rejects forbidden keyboard characters", () => {
        const edit = editor();
        draft(edit, "12");
        for (const character of ["a", "e", "π", "^", ";", "_"]) key(edit, character);
        expect(edit.expression()).toBe("12");
    });
    test("accepts decimal separators, spaces and arithmetic symbols", () => {
        const edit = editor();
        draft(edit, "-(60 + 40) / 2 * 1,22 + .5");
        expect(edit.commit()).toBe(true);
        expect(edit.value()).toBe(-60.5);
    });
    test("rejects an entire insertion containing a forbidden character", () => {
        const edit = editor();
        draft(edit, "12");
        edit.selectAll();
        edit.insert("30abc");
        expect(edit.expression()).toBe("12");
        expect(edit.selectedText()).toBe("12");
    });
    test("pasting rejects letters and line breaks", () => {
        const edit = editor();
        draft(edit, "12");
        edit.selectAll();
        for (const text of ["30abc", "3\n4", "3\t4"]) {
            CClipboard.instance().setText(text);
            edit.paste();
            expect(edit.expression()).toBe("12");
        }
    });
    test("Ctrl+V accepts a complete arithmetic expression", () => {
        const edit = editor();
        edit.setFocus(); edit.selectAll();
        CClipboard.instance().setText("(60+40)*1.22");
        key(edit, "v", true);
        key(edit, "Enter");
        expect(edit.value()).toBe(122);
    });
    test("programmatic text cannot introduce forbidden characters", () => {
        const edit = editor();
        edit.setValue(12);
        expect(edit.setExpression("evil()")).toBe(false);
        edit.setText("NaN");
        expect(edit.expression()).toBe("12");
        expect(edit.value()).toBe(12);
    });
    test("invalid Enter clears focus and displays ERR without changing the value", () => {
        const edit = editor();
        edit.setValue(42);
        draft(edit, "2+");
        const returned = vi.fn();
        const finished = vi.fn();
        edit.editingFinished.connect(finished);
        edit.returnPressed.connect(returned);
        key(edit, "Enter");
        expect(edit.hasFocus()).toBe(false);
        expect(edit.displayText()).toBe("ERR");
        expect(edit.expression()).toBe("2+");
        expect(edit.value()).toBe(42);
        expect(edit.hasValidationError()).toBe(true);
        expect(edit.errorString().length).toBeGreaterThan(0);
        expect(returned).not.toHaveBeenCalled();
        expect(finished).toHaveBeenCalledOnce();
        edit.setFocus();
        expect(edit.displayText()).toBe("2+");
    });
    test("invalid blur shows ERR and retains the draft for correction", () => {
        const edit = editor();
        edit.setValue(42);
        draft(edit, "2+");
        edit.clearFocus();
        expect(edit.displayText()).toBe("ERR");
        expect(edit.value()).toBe(42);
        expect(edit.hasValidationError()).toBe(true);
        edit.setFocus();
        expect(edit.displayText()).toBe("2+");
    });
    test("division by zero cannot overwrite the last value", () => {
        const edit = editor();
        edit.setValue(42);
        expect(edit.setExpression("1/(2-2)")).toBe(false);
        expect(edit.value()).toBe(42);
        expect(edit.hasValidationError()).toBe(true);
    });
    test("an empty expression cannot overwrite the last value", () => {
        const edit = editor();
        edit.setValue(42);
        expect(edit.setExpression("")).toBe(false);
        expect(edit.value()).toBe(42);
    });
    test("editing a failed expression clears the marker and permits correction", () => {
        const edit = editor();
        draft(edit, "2+"); key(edit, "Enter");
        edit.setFocus();
        key(edit, "3");
        expect(edit.hasValidationError()).toBe(false);
        key(edit, "Enter");
        expect(edit.value()).toBe(5);
        expect(edit.errorString()).toBe("");
    });
    test("display precision does not round the stored number", () => {
        const edit = editor();
        edit.setExpression("1/3");
        edit.setDecimals(2);
        expect(edit.displayText()).toBe("0.33");
        expect(edit.value()).toBe(1/3);
        edit.setDecimals(4);
        expect(edit.displayText()).toBe("0.3333");
        expect(edit.expression()).toBe("1/3");
    });
    test("display omits trailing zeros and negative zero", () => {
        const edit = editor();
        edit.setValue(1.2);
        expect(edit.displayText()).toBe("1.2");
        edit.setValue(-0.001);
        expect(edit.displayText()).toBe("0");
        expect(edit.value()).toBe(-0.001);
    });
    test("decimal places are bounded", () => {
        const edit = editor();
        edit.setDecimals(-1); expect(edit.decimals()).toBe(0);
        edit.setDecimals(50); expect(edit.decimals()).toBe(20);
        edit.setDecimals(3.9); expect(edit.decimals()).toBe(3);
        expect(() => edit.setDecimals(NaN)).toThrow(RangeError);
    });
    test("setValue expands scientific notation to an editable numeric literal", () => {
        const edit = editor();
        for (const value of [1e-7, -1e-7, 1e21, -1.25e22, Number.MAX_VALUE, Number.MIN_VALUE]) {
            edit.setValue(value);
            expect(edit.expression().includes("e")).toBe(false);
            expect(edit.value()).toBe(value);
        }
    });
    test("setValue rejects non-finite values without changing state", () => {
        const edit = editor();
        edit.setValue(12);
        for (const value of [NaN, Infinity, -Infinity])
            expect(() => edit.setValue(value)).toThrow(RangeError);
        expect(edit.value()).toBe(12);
        expect(edit.expression()).toBe("12");
    });
    test("valueChanged is emitted only for changed committed values", () => {
        const edit = editor();
        const changed = vi.fn();
        edit.valueChanged.connect(changed);
        edit.setExpression("2+3");
        expect(changed).toHaveBeenCalledExactlyOnceWith(5);
        edit.setExpression("10/2"); edit.commit();
        expect(changed).toHaveBeenCalledOnce();
        edit.setExpression("1/0");
        expect(changed).toHaveBeenCalledOnce();
    });
    test("expressionChanged describes formulas rather than display changes", () => {
        const edit = editor();
        const changed = vi.fn();
        edit.expressionChanged.connect(changed);
        edit.setExpression("2+3");
        expect(changed).toHaveBeenCalledExactlyOnceWith("2+3");
        edit.setFocus(); edit.clearFocus();
        expect(changed).toHaveBeenCalledOnce();
    });
    test("focus transitions preserve undo and redo of expression edits", () => {
        const edit = editor();
        edit.setExpression("2+3");
        edit.setFocus(); edit.setCursorPosition(3); edit.insert("*2");
        expect(edit.canUndo()).toBe(true);
        key(edit, "Enter");
        expect(edit.value()).toBe(8);
        edit.setFocus(); edit.undo();
        expect(edit.expression()).toBe("2+3");
        edit.redo();
        expect(edit.expression()).toBe("2+3*2");
        expect(edit.commit()).toBe(true);
        expect(edit.value()).toBe(8);
    });
    test("read-only mode prevents user edits", () => {
        const edit = editor();
        edit.setExpression("2+3"); edit.setReadOnly(true); edit.setFocus(); edit.selectAll();
        edit.insert("7"); key(edit, "9"); key(edit, "Backspace");
        expect(edit.expression()).toBe("2+3");
        key(edit, "Enter");
        expect(edit.value()).toBe(5);
    });
    test("painting switches text while preserving the underlying expression", () => {
        const edit = new TestNumberEdit();
        edit.resize(180, 28);
        edit.setExpression("2*6");
        const draw = vi.spyOn(edit.style(), "drawLineEdit").mockImplementation(() => {});
        edit.paintForTest({} as CPainter);
        expect(draw.mock.calls[0]![1].text).toBe("12");
        edit.setFocus();
        edit.paintForTest({} as CPainter);
        expect(draw.mock.calls[1]![1].text).toBe("2*6");
        expect(edit.text()).toBe("2*6");
    });
    test("painting an invalid unfocused expression draws a red ERR label", () => {
        const edit = new TestNumberEdit();
        edit.resize(180, 28);
        edit.setValue(42);
        edit.setExpression("1/0");
        const draw = vi.spyOn(edit.style(), "drawLineEdit").mockImplementation(() => {});
        const painter = {
            save: vi.fn(), restore: vi.fn(), setStrokeStyle: vi.fn(), setLineWidth: vi.fn(),
            strokeRect: vi.fn(), clipRect: vi.fn(), setFont: vi.fn(),
            setTextAlign: vi.fn(), setTextBaseline: vi.fn(), setPen: vi.fn(), drawText: vi.fn()
        };
        edit.paintForTest(painter as unknown as CPainter);
        expect(draw.mock.calls[0]![1].text).toBe("");
        expect(painter.setPen).toHaveBeenCalledWith("#d32f2f");
        expect(painter.drawText).toHaveBeenCalledExactlyOnceWith("ERR", 5, 14);
        expect(edit.value()).toBe(42);
        expect(edit.expression()).toBe("1/0");
    });
    test("correcting a failed expression restores the numeric display", () => {
        const edit = editor();
        edit.setExpression("1/0");
        expect(edit.displayText()).toBe("ERR");
        draft(edit, "6*7");
        key(edit, "Enter");
        expect(edit.displayText()).toBe("42");
        expect(edit.hasValidationError()).toBe(false);
    });
    test("invalid Return also clears focus and displays ERR", () => {
        const edit = editor();
        draft(edit, "1/0");
        key(edit, "Return");
        expect(edit.hasFocus()).toBe(false);
        expect(edit.displayText()).toBe("ERR");
        expect(edit.expression()).toBe("1/0");
    });
});
