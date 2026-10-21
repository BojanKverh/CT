import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("system clipboard events", () => {
    const editors: (CLineEdit | CTextEdit)[] = [];
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const originalClipboardEvent = Object.getOwnPropertyDescriptor(globalThis, "ClipboardEvent");
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", { value: createTestWindow(), configurable: true, writable: true });
        Object.defineProperty(globalThis, "ClipboardEvent", { value: class {}, configurable: true });
        Object.defineProperty(globalThis, "navigator", { value: { clipboard: {
            readText: vi.fn().mockResolvedValue("External"), writeText: vi.fn().mockResolvedValue(undefined)
        } }, configurable: true });
        new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) {
            for (const edit of editors.splice(0)) edit.destroy();
            CApplication.instance().destroy();
        }
        for (const [name, descriptor] of [["navigator", originalNavigator], ["ClipboardEvent", originalClipboardEvent]] as const) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    });
    function clipboardEvent(type: "copy" | "cut" | "paste", text = "", types = ["text/plain"]) {
        const setData = vi.fn(); const preventDefault = vi.fn();
        window.dispatchEvent({ type, clipboardData: { types, getData: () => text, setData }, preventDefault } as unknown as ClipboardEvent);
        return { setData, preventDefault };
    }
    function key(key: string) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key, ctrlKey: true, shiftKey: false,
            altKey: false, metaKey: false, preventDefault } as unknown as KeyboardEvent);
        return preventDefault;
    }
    for (const kind of ["line", "text"] as const) {
        function editor() {
            const edit = kind === "line" ? new CLineEdit() : new CTextEdit();
            editors.push(edit);
            edit.setGeometry(0, 0, 300, 100); edit.setFocus();
            if (edit instanceof CLineEdit) edit.setText("ABC def"); else edit.setPlainText("ABC def");
            return edit;
        }
        function text(edit: CLineEdit | CTextEdit) { return edit instanceof CLineEdit ? edit.text() : edit.toPlainText(); }
        test(`${kind}: native Copy exports the selected text`, () => {
            const edit = editor(); edit.setSelection(0, 3);
            const result = clipboardEvent("copy");
            expect(result.setData).toHaveBeenCalledWith("text/plain", "ABC");
            expect(result.preventDefault).toHaveBeenCalledOnce();
            expect(CApplication.instance().clipboard().text()).toBe("ABC");
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });
        test(`${kind}: native Cut exports and removes the selection`, () => {
            const edit = editor(); edit.setSelection(0, 3);
            expect(clipboardEvent("cut").setData).toHaveBeenCalledWith("text/plain", "ABC");
            expect(text(edit)).toBe(" def"); edit.undo(); expect(text(edit)).toBe("ABC def");
        });
        test(`${kind}: Ctrl+V waits for native Paste and inserts external text once`, () => {
            const edit = editor(); edit.setCursorPosition(0);
            CApplication.instance().clipboard().withNativeClipboard(() => CApplication.instance().clipboard().setText("Old"));
            expect(key("v")).not.toHaveBeenCalled(); expect(text(edit)).toBe("ABC def");
            expect(clipboardEvent("paste", "NEW").preventDefault).toHaveBeenCalledOnce();
            expect(text(edit)).toBe("NEWABC def");
        });
        test(`${kind}: read-only permits Copy but blocks Cut and Paste`, () => {
            const edit = editor(); edit.setSelection(0, 3); edit.setReadOnly(true);
            expect(clipboardEvent("copy").preventDefault).toHaveBeenCalledOnce();
            expect(clipboardEvent("cut").preventDefault).not.toHaveBeenCalled();
            expect(clipboardEvent("paste", "NEW").preventDefault).not.toHaveBeenCalled();
            expect(text(edit)).toBe("ABC def");
        });
        test(`${kind}: empty or non-text Paste cannot insert stale cached data`, () => {
            const edit = editor(); edit.setCursorPosition(0);
            CApplication.instance().clipboard().withNativeClipboard(() => CApplication.instance().clipboard().setText("Old"));
            clipboardEvent("paste", "", []); clipboardEvent("paste", "");
            expect(text(edit)).toBe("ABC def");
        });
        test(`${kind}: system Paste command reads the current system clipboard`, async () => {
            const edit = editor(); edit.setCursorPosition(0);
            await edit.pasteFromSystem(); expect(text(edit)).toBe("ExternalABC def");
        });
        test(`${kind}: denied Paste cannot use an old internal value`, async () => {
            const edit = editor(); edit.setCursorPosition(0);
            vi.mocked(navigator.clipboard.readText).mockRejectedValue(new Error("Denied"));
            CApplication.instance().clipboard().withNativeClipboard(() => CApplication.instance().clipboard().setText("Old"));
            await edit.pasteFromSystem(); expect(text(edit)).toBe("ABC def");
            expect(CApplication.instance().clipboard().lastError()).toBe("Denied");
        });
        test(`${kind}: delayed Paste is cancelled when the editor is destroyed`, async () => {
            const edit = editor(); let resolve!: (text: string) => void;
            vi.mocked(navigator.clipboard.readText).mockImplementation(() => new Promise<string>(done => { resolve = done; }));
            const pending = edit.pasteFromSystem(); edit.destroy(); editors.splice(editors.indexOf(edit), 1); resolve("Delayed");
            await expect(pending).resolves.toBeUndefined();
        });
    }
    test("clipboard events belonging to a DOM input are left alone", () => {
        const edit = new CLineEdit(); editors.push(edit); edit.setGeometry(0, 0, 200, 30); edit.setFocus();
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "paste", target: { tagName: "INPUT" },
            clipboardData: { types: ["text/plain"], getData: () => "DOM" }, preventDefault } as unknown as ClipboardEvent);
        expect(preventDefault).not.toHaveBeenCalled(); expect(edit.text()).toBe("");
    });
});
