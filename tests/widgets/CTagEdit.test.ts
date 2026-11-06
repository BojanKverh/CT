import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CTagEdit } from "../../src/widgets/CTagEdit.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CStyleOptionTagEdit } from "../../src/gui/CStyleOptionTagEdit.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CFont } from "../../src/gui/CFont.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

function recorder() {
    const p = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setBrush: vi.fn(), fillRect: vi.fn(),
        setPen: vi.fn(), setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
        drawLine: vi.fn(), setLineWidth: vi.fn(), drawRoundedRect: vi.fn(), strokeRect: vi.fn(), translate: vi.fn() };
    return { p, paint: p as unknown as CPainter };
}

describe("CTagEdit", () => {
    let edit: CTagEdit;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas()); edit = new CTagEdit(); edit.resize(400, 200);
    });
    afterEach(() => { edit.destroy(); if (CApplication.exists()) CApplication.instance().destroy(); });
    function key(key: string): void { edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, key)); }
    function chip(index = 0): CWidget { return edit.children().filter(w => w instanceof CWidget && w !== edit.lineEdit())[index]!; }
    function clickRemove(index = 0): void {
        const item = chip(index), x = item.width() - 12, y = item.height() / 2;
        item.event(new CMouseEvent(CEventType.MousePress, x, y, CMouseButton.LeftButton));
        item.event(new CMouseEvent(CEventType.MouseRelease, x, y, CMouseButton.LeftButton));
    }
    test("starts empty with a focus proxy to the line edit", () => {
        expect(edit.tags()).toEqual([]); expect(edit.count()).toBe(0); expect(edit.focusProxy()).toBe(edit.lineEdit());
    });
    test("normalizes whitespace and removes empty and duplicate tags", () => {
        edit.setTags([" A ", "", "A", "B\nC", "\t"]); expect(edit.tags()).toEqual(["A", "B C"]);
    });
    test("duplicate comparison is case-sensitive", () => {
        edit.setTags(["Invoice", "invoice"]); expect(edit.count()).toBe(2);
    });
    test("stores and returns copies", () => {
        const input = ["A"]; edit.setTags(input); input.push("B"); const output = edit.tags(); output.push("C"); expect(edit.tags()).toEqual(["A"]);
    });
    test("emits tagsChanged only for a changed sequence", () => {
        const changed = vi.fn(); edit.tagsChanged.connect(changed); edit.setTags(["A", "B"]); edit.setTags([" A ", "B", "B"]);
        expect(changed).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledWith(["A", "B"]);
    });
    test("signal payload cannot modify stored tags", () => {
        edit.tagsChanged.connect(tags => tags.pop()); edit.setTags(["A", "B"]); expect(edit.count()).toBe(2);
    });
    test("addTag reports duplicates and blanks without emitting", () => {
        expect(edit.addTag(" A ")).toBe(true); const changed = vi.fn(); edit.tagsChanged.connect(changed);
        expect(edit.addTag("A")).toBe(false); expect(edit.addTag(" ")).toBe(false); expect(changed).not.toHaveBeenCalled();
    });
    test("removeTag reports absent tags", () => {
        edit.setTags(["A", "B"]); expect(edit.removeTag(" A ")).toBe(true); expect(edit.removeTag("missing")).toBe(false); expect(edit.tags()).toEqual(["B"]);
    });
    test("Enter commits pending text and clears the input", () => {
        edit.lineEdit().setText(" Accounting "); key("Enter"); expect(edit.tags()).toEqual(["Accounting"]); expect(edit.lineEdit().text()).toBe("");
    });
    test("Return also commits", () => { edit.lineEdit().setText("A"); key("Return"); expect(edit.tags()).toEqual(["A"]); });
    test("duplicate commit clears input without adding another tag", () => {
        edit.setTags(["A"]); edit.lineEdit().setText(" A "); expect(edit.commit()).toBe(false); expect(edit.lineEdit().text()).toBe(""); expect(edit.count()).toBe(1);
    });
    test("blank Enter does not change tags", () => {
        const changed = vi.fn(); edit.tagsChanged.connect(changed); key("Enter"); expect(changed).not.toHaveBeenCalled();
    });
    test("ordinary typing uses the line editor", () => {
        key("A"); key("B"); expect(edit.lineEdit().text()).toBe("AB"); expect(edit.count()).toBe(0);
    });
    test("Backspace on empty input removes only the last tag", () => {
        edit.setTags(["A", "B"]); key("Backspace"); expect(edit.tags()).toEqual(["A"]); key("Backspace"); key("Backspace"); expect(edit.count()).toBe(0);
    });
    test("Backspace edits nonempty input before touching tags", () => {
        edit.setTags(["A"]); edit.lineEdit().setText("XY"); key("Backspace"); expect(edit.lineEdit().text()).toBe("X"); expect(edit.tags()).toEqual(["A"]);
    });
    test("remove glyph removes its corresponding tag", () => {
        edit.setTags(["A", "B", "C"]); clickRemove(1); expect(edit.tags()).toEqual(["A", "C"]);
    });
    test("clicking a tag caption only focuses the input", () => {
        edit.setTags(["Accounting"]); const item = chip();
        item.event(new CMouseEvent(CEventType.MousePress, 5, 10, CMouseButton.LeftButton));
        item.event(new CMouseEvent(CEventType.MouseRelease, 5, 10, CMouseButton.LeftButton));
        expect(edit.count()).toBe(1); expect(edit.lineEdit().hasFocus()).toBe(true);
    });
    test("releasing outside the remove glyph cancels removal", () => {
        edit.setTags(["A"]); const item = chip();
        item.event(new CMouseEvent(CEventType.MousePress, item.width() - 10, 10, CMouseButton.LeftButton));
        item.event(new CMouseEvent(CEventType.MouseRelease, -1, 10, CMouseButton.LeftButton)); expect(edit.count()).toBe(1);
    });
    test("right mouse click does not remove a tag", () => {
        edit.setTags(["A"]); const item = chip();
        item.event(new CMouseEvent(CEventType.MousePress, item.width() - 10, 10, CMouseButton.RightButton));
        item.event(new CMouseEvent(CEventType.MouseRelease, item.width() - 10, 10, CMouseButton.RightButton)); expect(edit.count()).toBe(1);
    });
    test("adding and removing tags preserves the input instance and focus", () => {
        const input = edit.lineEdit(); edit.setFocus(); edit.addTag("A"); edit.removeTag("A");
        expect(edit.lineEdit()).toBe(input); expect(input.hasFocus()).toBe(true); expect(edit.hasFocus()).toBe(true);
    });
    test("programmatic tag changes preserve uncommitted text", () => {
        edit.lineEdit().setText("Pending"); edit.addTag("A"); edit.removeTag("A"); expect(edit.lineEdit().text()).toBe("Pending");
    });
    test("clear resets both tags and pending text", () => {
        edit.setTags(["A"]); edit.lineEdit().setText("Pending"); edit.clear(); expect(edit.count()).toBe(0); expect(edit.lineEdit().text()).toBe("");
    });
    test("read-only mode prevents Enter, Backspace and remove clicks", () => {
        edit.setTags(["A"]); edit.setReadOnly(true); edit.lineEdit().setText("B"); key("Enter"); edit.lineEdit().setText(""); key("Backspace"); clickRemove();
        expect(edit.tags()).toEqual(["A"]); expect(edit.lineEdit().isReadOnly()).toBe(true);
    });
    test("read-only mode permits programmatic updates", () => {
        edit.setReadOnly(true); edit.addTag("A"); edit.setTags(["B", "C"]); edit.removeTag("B"); expect(edit.tags()).toEqual(["C"]);
    });
    test("disabled controls cannot modify tags", () => {
        edit.setTags(["A"]); edit.setEnabled(false); key("Backspace"); clickRemove(); expect(edit.tags()).toEqual(["A"]);
        expect(edit.lineEdit().isEnabled()).toBe(false);
    });
    test("re-enabling restores input", () => {
        edit.setEnabled(false); edit.setEnabled(true); key("A"); key("Enter"); expect(edit.tags()).toEqual(["A"]);
    });
    test("placeholder forwards to the input", () => {
        edit.setPlaceholderText("Category…"); expect(edit.placeholderText()).toBe("Category…"); expect(edit.lineEdit().placeholderText()).toBe("Category…");
    });
    test("flow layout wraps tags and the input at narrow widths", () => {
        edit.setTags(["Accounting", "Invoices", "Needs review", "Urgent"]);
        const wide = edit.heightForWidth(500), narrow = edit.heightForWidth(160);
        expect(edit.hasHeightForWidth()).toBe(true); expect(narrow).toBeGreaterThan(wide);
        edit.resize(160, narrow); expect(edit.lineEdit().y()).toBeGreaterThan(chip().y());
    });
    test("emptying tags leaves the input in the first row", () => {
        edit.setTags(["A", "B"]); edit.clear(); expect(edit.lineEdit().x()).toBe(6); expect(edit.lineEdit().y()).toBe(6);
    });
    test("font changes propagate to chips and input", () => {
        edit.setTags(["A"]); const font = new CFont(edit.font()); font.setPixelSize(24); edit.setFont(font);
        expect(edit.lineEdit().font().pixelSize()).toBe(24); expect(chip().font().pixelSize()).toBe(24);
    });
    test("style option copies remove state and text", () => {
        const option = new CStyleOptionTagEdit(); option.text = "A"; option.readOnly = true; option.removeHovered = true;
        const copy = new CStyleOptionTagEdit(option); expect(copy.text).toBe("A"); expect(copy.readOnly).toBe(true); expect(copy.removeHovered).toBe(true);
    });
    test("style draws two remove strokes and balances clipping", () => {
        const option = new CStyleOptionTagEdit(); option.rect = new CRect(0, 0, 120, 30); option.state |= CStyleState.Enabled; option.text = "Invoice";
        const r = recorder(); new CDefaultStyle().drawTag(r.paint, option); expect(r.p.drawLine).toHaveBeenCalledTimes(2);
        expect(r.p.drawText).toHaveBeenCalledWith("Invoice", 8, 15); expect(r.p.save.mock.calls.length).toBe(r.p.restore.mock.calls.length);
    });
    test("read-only style omits the remove glyph", () => {
        const option = new CStyleOptionTagEdit(); option.rect = new CRect(0, 0, 120, 30); option.readOnly = true;
        const r = recorder(); new CDefaultStyle().drawTag(r.paint, option); expect(r.p.drawLine).not.toHaveBeenCalled();
    });
    test("disabled style uses DisabledText", () => {
        const option = new CStyleOptionTagEdit(); option.rect = new CRect(0, 0, 120, 30);
        const r = recorder(); new CDefaultStyle().drawTag(r.paint, option);
        expect(r.p.setPen).toHaveBeenCalledWith(option.palette.color(CPaletteColorRole.DisabledText).toCss());
    });
    test("Tab treats the composite editor as one focus stop", () => {
        const owner = new CWidget(); edit.setParent(owner); edit.setTags(["A", "B"]);
        const other = new CWidget(owner); other.setFocusPolicy(CFocusPolicy.StrongFocus);
        edit.setFocus(); CApplication.instance().focusNextWidget(); expect(other.hasFocus()).toBe(true);
        edit.setParent(null); owner.destroy();
    });
    test("pending text retains the line editor's undo behavior", () => {
        edit.setTags(["Committed"]); key("A"); key("B"); expect(edit.lineEdit().canUndo()).toBe(true);
        edit.lineEdit().undo(); expect(edit.lineEdit().text()).not.toBe("AB"); expect(edit.tags()).toEqual(["Committed"]);
    });

});
