import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";
import { CUndoCommand } from "./CUndoCommand.js";

/**
 * Linear undo history. Commands must execute synchronously.
 * Do not call stack mutation methods from a command's undo()/redo()/mergeWith().
 */
export class CUndoStack extends CObject {
    readonly indexChanged = new CSignal<[number]>();
    readonly canUndoChanged = new CSignal<[boolean]>();
    readonly canRedoChanged = new CSignal<[boolean]>();
    readonly undoTextChanged = new CSignal<[string]>();
    readonly redoTextChanged = new CSignal<[string]>();
    readonly cleanChanged = new CSignal<[boolean]>();

    #m_commands: CUndoCommand[] = [];
    #m_index = 0;
    #m_cleanIndex = 0;

    constructor(parent: CObject | null = null) { super(parent); }

    count(): number { return this.#m_commands.length; }
    index(): number { return this.#m_index; }
    cleanIndex(): number { return this.#m_cleanIndex; }
    isClean(): boolean { return this.#m_index === this.#m_cleanIndex; }
    canUndo(): boolean { return this.#m_index > 0; }
    canRedo(): boolean { return this.#m_index < this.count(); }
    undoText(): string { return this.#m_commands[this.#m_index - 1]?.text() ?? ""; }
    redoText(): string { return this.#m_commands[this.#m_index]?.text() ?? ""; }
    command(index: number): CUndoCommand | null {
        return Number.isInteger(index) ? this.#m_commands[index] ?? null : null;
    }

    push(command: CUndoCommand): void {
        if (this.#m_commands.includes(command))
            throw new Error("A command cannot be pushed twice.");
        const before = this.#state();
        command.redo();

        if (this.#m_cleanIndex > this.#m_index)
            this.#m_cleanIndex = -1;
        this.#m_commands.splice(this.#m_index);

        const previous = this.#m_commands[this.#m_index - 1];
        // Never merge across the saved-state boundary.
        const merged = previous !== undefined
            && this.#m_index !== this.#m_cleanIndex
            && previous.id() !== -1
            && previous.id() === command.id()
            && previous.mergeWith(command);
        if (!merged) {
            this.#m_commands.push(command);
            ++this.#m_index;
        }
        this.#notify(before);
    }

    undo(): void {
        if (!this.canUndo()) return;
        const before = this.#state();
        this.#m_commands[this.#m_index - 1]!.undo();
        --this.#m_index;
        this.#notify(before);
    }

    redo(): void {
        if (!this.canRedo()) return;
        const before = this.#state();
        this.#m_commands[this.#m_index]!.redo();
        ++this.#m_index;
        this.#notify(before);
    }

    /** Out-of-range indices are clamped; non-integer indices are rejected. */
    setIndex(index: number): void {
        if (!Number.isInteger(index))
            throw new RangeError("Undo index must be an integer.");
        const target = Math.max(0, Math.min(index, this.count()));
        const before = this.#state();
        while (this.#m_index > target) {
            this.#m_commands[this.#m_index - 1]!.undo();
            --this.#m_index;
        }
        while (this.#m_index < target) {
            this.#m_commands[this.#m_index]!.redo();
            ++this.#m_index;
        }
        this.#notify(before);
    }

    setClean(): void {
        const before = this.#state();
        this.#m_cleanIndex = this.#m_index;
        this.#notify(before);
    }

    resetClean(): void {
        const before = this.#state();
        this.#m_cleanIndex = -1;
        this.#notify(before);
    }

    /** Discards history without undoing its effects. */
    clear(): void {
        const before = this.#state();
        this.#m_commands = [];
        this.#m_index = 0;
        this.#m_cleanIndex = 0;
        this.#notify(before);
    }

    override destroy(): void {
        this.clear();
        super.destroy();
    }

    #state() {
        return {
            index: this.index(), canUndo: this.canUndo(), canRedo: this.canRedo(),
            undoText: this.undoText(), redoText: this.redoText(), clean: this.isClean()
        };
    }

    #notify(before: { index: number; canUndo: boolean; canRedo: boolean; undoText: string; redoText: string; clean: boolean }): void {
        const after = this.#state();
        if (before.index !== after.index) this.indexChanged.emit(after.index);
        if (before.canUndo !== after.canUndo) this.canUndoChanged.emit(after.canUndo);
        if (before.canRedo !== after.canRedo) this.canRedoChanged.emit(after.canRedo);
        if (before.undoText !== after.undoText) this.undoTextChanged.emit(after.undoText);
        if (before.redoText !== after.redoText) this.redoTextChanged.emit(after.redoText);
        if (before.clean !== after.clean) this.cleanChanged.emit(after.clean);
    }
}
