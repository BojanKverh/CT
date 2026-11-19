/** @module Core/CUndoCommand */
/**
 * Reversible operation. push() executes redo() before storing the command.
 * Once pushed, a command belongs to its stack and must not be pushed again.
 */
export class CUndoCommand {
    #m_text: string;

    /**
    * Initializes a synchronous undo command with an optional user-visible action label.
    */
    constructor(text = "") { this.#m_text = text; }

    /**
    * Returns the user-visible action label shown by undo and redo UI.
    */
    text(): string { return this.#m_text; }
    /**
    * Changes the label shown for this command in undo and redo UI.
    */
    setText(text: string): void { this.#m_text = text; }

    /**
    * Override to synchronously revert the operation previously applied by redo().
    */
    undo(): void {}
    /**
    * Override to synchronously apply the operation. CUndoStack calls this when pushing and redoing the command.
    */
    redo(): void {}

    /** -1 disables merging. Override together with mergeWith(). */
    id(): number { return -1; }

    /** The incoming command has already been redone. */
    mergeWith(_command: CUndoCommand): boolean { return false; }
}
