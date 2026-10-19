import { describe, expect, test } from "vitest";
import { CObject } from "../../src/core/CObject.js";
import { CUndoCommand } from "../../src/core/CUndoCommand.js";
import { CUndoStack } from "../../src/core/CUndoStack.js";

class SetValue extends CUndoCommand {
    readonly old: number;
    constructor(readonly target: { value: number }, public value: number, text = "Change", readonly mergeId = -1) {
        super(text);
        this.old = target.value;
    }
    override redo(): void { this.target.value = this.value; }
    override undo(): void { this.target.value = this.old; }
    override id(): number { return this.mergeId; }
    override mergeWith(other: CUndoCommand): boolean {
        if (!(other instanceof SetValue) || other.target !== this.target) return false;
        this.value = other.value;
        this.setText(other.text());
        return true;
    }
}

describe("CUndoCommand", () => {
    test("has default text and disabled merging", () => {
        const c = new CUndoCommand();
        expect(c.text()).toBe("");
        expect(c.id()).toBe(-1);
        expect(c.mergeWith(new CUndoCommand())).toBe(false);
        expect(() => { c.undo(); c.redo(); }).not.toThrow();
    });
    test("allows changing its text", () => {
        const c = new CUndoCommand("Before");
        c.setText("After");
        expect(c.text()).toBe("After");
    });
});

describe("CUndoStack", () => {
    test("starts empty and clean", () => {
        const s = new CUndoStack();
        expect([s.count(), s.index(), s.cleanIndex()]).toEqual([0, 0, 0]);
        expect(s.isClean()).toBe(true);
        expect(s.canUndo()).toBe(false);
        expect(s.canRedo()).toBe(false);
        expect(s.undoText()).toBe("");
        expect(s.redoText()).toBe("");
        expect(s.command(0)).toBeNull();
    });
    test("participates in object ownership", () => {
        const p = new CObject();
        const s = new CUndoStack(p);
        expect(p.children()).toContain(s);
        s.destroy();
        expect(p.children()).not.toContain(s);
    });
    test("push executes redo immediately", () => {
        const s = new CUndoStack(), t = { value: 0 };
        const c = new SetValue(t, 3);
        s.push(c);
        expect(t.value).toBe(3);
        expect(s.command(0)).toBe(c);
        expect(s.index()).toBe(1);
        expect(s.isClean()).toBe(false);
    });
    test("undo and redo restore values in order", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1, "One"));
        s.push(new SetValue(t, 2, "Two"));
        s.undo();
        expect(t.value).toBe(1);
        expect(s.undoText()).toBe("One");
        expect(s.redoText()).toBe("Two");
        s.undo();
        expect(t.value).toBe(0);
        s.redo(); s.redo();
        expect(t.value).toBe(2);
    });
    test("undo and redo at history boundaries do nothing", () => {
        const s = new CUndoStack();
        let calls = 0;
        s.indexChanged.connect(() => ++calls);
        s.undo(); s.redo();
        expect(calls).toBe(0);
    });
    test("new push discards redo history", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1)); s.push(new SetValue(t, 2));
        s.undo(); s.push(new SetValue(t, 5));
        expect(s.count()).toBe(2);
        expect(s.canRedo()).toBe(false);
        s.undo();
        expect(t.value).toBe(1);
    });
    test("clear forgets history without undoing data", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 9)); s.clear();
        expect(t.value).toBe(9);
        expect(s.count()).toBe(0);
        expect(s.isClean()).toBe(true);
    });
    test("setIndex executes intervening commands and clamps bounds", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1)); s.push(new SetValue(t, 2));
        s.setIndex(-10); expect(t.value).toBe(0);
        s.setIndex(20); expect(t.value).toBe(2);
        expect(() => s.setIndex(NaN)).toThrow(RangeError);
        expect(() => s.setIndex(0.5)).toThrow(RangeError);
    });
    test("saved state can be reached with undo and redo", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1)); s.setClean();
        s.push(new SetValue(t, 2));
        expect(s.isClean()).toBe(false);
        s.undo(); expect(s.isClean()).toBe(true);
        s.redo(); expect(s.isClean()).toBe(false);
    });
    test("discarding saved redo state invalidates clean index", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1)); s.setClean(); s.undo();
        s.push(new SetValue(t, 2));
        expect(s.cleanIndex()).toBe(-1);
        expect(s.isClean()).toBe(false);
    });
    test("resetClean marks even the initial state dirty", () => {
        const s = new CUndoStack();
        s.resetClean();
        expect(s.cleanIndex()).toBe(-1);
        expect(s.isClean()).toBe(false);
        s.setClean(); expect(s.isClean()).toBe(true);
    });
    test("merges compatible commands after applying incoming redo", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1, "First", 7));
        s.push(new SetValue(t, 2, "Second", 7));
        expect(t.value).toBe(2);
        expect(s.count()).toBe(1);
        expect(s.undoText()).toBe("Second");
        s.undo(); expect(t.value).toBe(0);
        s.redo(); expect(t.value).toBe(2);
    });
    test("does not merge commands with different ids", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1, "", 1));
        s.push(new SetValue(t, 2, "", 2));
        expect(s.count()).toBe(2);
    });
    test("respects a rejected merge", () => {
        const s = new CUndoStack();
        s.push(new SetValue({ value: 0 }, 1, "", 1));
        s.push(new SetValue({ value: 0 }, 2, "", 1));
        expect(s.count()).toBe(2);
    });
    test("does not merge across saved state", () => {
        const s = new CUndoStack(), t = { value: 0 };
        s.push(new SetValue(t, 1, "", 1)); s.setClean();
        s.push(new SetValue(t, 2, "", 1));
        expect(s.count()).toBe(2);
        s.undo(); expect(t.value).toBe(1);
        expect(s.isClean()).toBe(true);
    });
    test("emits changed state values only", () => {
        const s = new CUndoStack(), t = { value: 0 };
        const indices: number[] = [], undo: boolean[] = [], redo: boolean[] = [];
        const texts: string[] = [], redoTexts: string[] = [], clean: boolean[] = [];
        s.indexChanged.connect(v => indices.push(v));
        s.canUndoChanged.connect(v => undo.push(v));
        s.canRedoChanged.connect(v => redo.push(v));
        s.undoTextChanged.connect(v => texts.push(v));
        s.redoTextChanged.connect(v => redoTexts.push(v));
        s.cleanChanged.connect(v => clean.push(v));
        s.push(new SetValue(t, 1, "Edit")); s.undo(); s.redo();
        expect(indices).toEqual([1, 0, 1]);
        expect(undo).toEqual([true, false, true]);
        expect(redo).toEqual([true, false]);
        expect(texts).toEqual(["Edit", "", "Edit"]);
        expect(redoTexts).toEqual(["Edit", ""]);
        expect(clean).toEqual([false, true, false]);
    });
    test("rejects pushing the same stored instance twice", () => {
        const s = new CUndoStack(), t = { value: 0 }, c = new SetValue(t, 1);
        s.push(c);
        expect(() => s.push(c)).toThrow();
    });
    test("invalid command indices return null", () => {
        const s = new CUndoStack();
        expect(s.command(-1)).toBeNull();
        expect(s.command(0.5)).toBeNull();
    });
});
