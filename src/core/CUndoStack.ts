/** @module Core/CUndoStack */
import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";
import { CUndoCommand } from "./CUndoCommand.js";

/**
 * Linear undo history. Commands must execute synchronously.
 * Do not call stack mutation methods from a command's undo()/redo()/mergeWith().
 */
export class CUndoStack extends CObject {
    /**
    * Emitted with the history cursor after a command is pushed, undone or redone.
    * @group Signals
    */
    readonly indexChanged = new CSignal<[number]>();
    /**
    * Emitted when the availability of an undo operation changes.
    * @group Signals
    */
    readonly canUndoChanged = new CSignal<[boolean]>();
    /**
    * Emitted when the availability of a redo operation changes.
    * @group Signals
    */
    readonly canRedoChanged = new CSignal<[boolean]>();
    /**
    * Emitted with the label of the next command available for undo.
    * @group Signals
    */
    readonly undoTextChanged = new CSignal<[string]>();
    /**
    * Emitted with the label of the next command available for redo.
    * @group Signals
    */
    readonly redoTextChanged = new CSignal<[string]>();
    /**
    * Emitted when the history crosses into or out of the saved clean state.
    * @group Signals
    */
    readonly cleanChanged = new CSignal<[boolean]>();

    #m_commands: CUndoCommand[] = [];
    #m_index = 0;
    #m_cleanIndex = 0;

    /**
    * Starts with empty history at index zero and the initial state marked clean.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CObject | null = null) { super(parent); }

    /**
    * Returns the total retained command count, including undone commands available for redo.
    */
    count(): number { return this.#m_commands.length; }
    /**
    * Returns the number of commands currently applied. Zero is the initial state.
    */
    index(): number { return this.#m_index; }
    /**
    * Undo-history index representing the saved state.
    * The initial value is `0`.
    */
    cleanIndex(): number { return this.#m_cleanIndex; }
    /**
    * Reports whether the current command index equals the saved-state index.
    */
    isClean(): boolean { return this.#m_index === this.#m_cleanIndex; }
    /**
    * Reports whether at least one applied command can be undone.
    */
    canUndo(): boolean { return this.#m_index > 0; }
    /**
    * Reports whether an unapplied retained command can be redone.
    */
    canRedo(): boolean { return this.#m_index < this.count(); }
    /**
    * Returns the preceding command's user-visible label or an empty string.
    */
    undoText(): string { return this.#m_commands[this.#m_index - 1]?.text() ?? ""; }
    /**
    * Returns the next redoable command's label or an empty string.
    */
    redoText(): string { return this.#m_commands[this.#m_index]?.text() ?? ""; }
    /**
    * Returns the retained command at a zero-based integer index, or null for an invalid index.
    */
    command(index: number): CUndoCommand | null {
        return Number.isInteger(index) ? this.#m_commands[index] ?? null : null;
    }

    /**
    * Executes command.redo(), discards the redo branch and appends or merges the command. A command object cannot be pushed twice. Merging never crosses the clean boundary.
    */
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

    /**
    * Calls undo() on the preceding command and decrements the index. Does nothing when no undo is available.
    */
    undo(): void {
        if (!this.canUndo()) return;
        const before = this.#state();
        this.#m_commands[this.#m_index - 1]!.undo();
        --this.#m_index;
        this.#notify(before);
    }

    /**
    * Calls redo() on the next retained command and increments the index. Does nothing when no redo is available.
    */
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

    /**
    * Marks the current command index as the saved state and emits state changes when necessary.
    */
    setClean(): void {
        const before = this.#state();
        this.#m_cleanIndex = this.#m_index;
        this.#notify(before);
    }

    /**
    * Invalidates the saved-state marker by setting cleanIndex to -1.
    */
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
