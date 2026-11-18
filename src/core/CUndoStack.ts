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

    /**
     * Counts the commands retained in the history, including commands available for redo.
     * @returns Total number of retained commands.
     */
    count(): number { return this.#m_commands.length; }
    /**
     * Reads the boundary between applied and unapplied commands.
     * @returns The number of applied commands and the zero-based position of the next command to redo.
     */
    index(): number { return this.#m_index; }
    /**
     * Looks up the saved-state marker.
     * @returns The clean history index, or `-1` if the marker was cleared or discarded.
     */
    cleanIndex(): number { return this.#m_cleanIndex; }
    /**
     * Checks whether the history is at the saved-state marker.
     * @returns `true` if the current and clean indices are equal.
     */
    isClean(): boolean { return this.#m_index === this.#m_cleanIndex; }
    /**
     * Checks whether an applied command can be reversed.
     * @returns `true` if at least one command is applied.
     */
    canUndo(): boolean { return this.#m_index > 0; }
    /**
     * Checks whether another stored command can be applied.
     * @returns `true` if a command exists at the current history index.
     */
    canRedo(): boolean { return this.#m_index < this.count(); }
    /**
     * Looks up the label of the command that would be undone next.
     * @returns The command label, or an empty string if nothing can be undone.
     */
    undoText(): string { return this.#m_commands[this.#m_index - 1]?.text() ?? ""; }
    /**
     * Looks up the label of the command that would be redone next.
     * @returns The command label, or an empty string if nothing can be redone.
     */
    redoText(): string { return this.#m_commands[this.#m_index]?.text() ?? ""; }
    /**
     * Looks up a retained command by position without executing it.
     * @param index Zero-based integer position in the full retained history.
     * @returns The stored command, or `null` if the position is invalid.
     */
    command(index: number): CUndoCommand | null {
        return Number.isInteger(index) ? this.#m_commands[index] ?? null : null;
    }

    /**
     * Executes a command, discards the redo branch and appends or merges the command. Throws `Error` if the same instance is already retained.
     * @param command New command to execute and store or merge.
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

    /** Reverses the most recently applied command and moves the history index back one step if undo is available. */
    undo(): void {
        if (!this.canUndo()) return;
        const before = this.#state();
        this.#m_commands[this.#m_index - 1]!.undo();
        --this.#m_index;
        this.#notify(before);
    }

    /** Applies the next stored command and advances the history index if redo is available. */
    redo(): void {
        if (!this.canRedo()) return;
        const before = this.#state();
        this.#m_commands[this.#m_index]!.redo();
        ++this.#m_index;
        this.#notify(before);
    }

    /**
     * Moves to a history position by executing undo or redo as needed. Throws `RangeError` for non-integers.
     * @param index Target integer index, clamped between zero and the command count.
     */
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

    /** Marks the current history position as the saved state and emits `cleanChanged` if the clean state changes. */
    setClean(): void {
        const before = this.#state();
        this.#m_cleanIndex = this.#m_index;
        this.#notify(before);
    }

    /** Removes the saved-state marker and emits `cleanChanged` if the clean state changes. */
    resetClean(): void {
        const before = this.#state();
        this.#m_cleanIndex = -1;
        this.#notify(before);
    }

    /** Discards all commands without undoing their effects and resets both history indices to zero. */
    clear(): void {
        const before = this.#state();
        this.#m_commands = [];
        this.#m_index = 0;
        this.#m_cleanIndex = 0;
        this.#notify(before);
    }

    /** Discards the history without undoing its effects, then destroys the owned objects and detaches the stack. */
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
