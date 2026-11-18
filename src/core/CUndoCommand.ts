/**
 * Reversible operation. push() executes redo() before storing the command.
 * Once pushed, a command belongs to its stack and must not be pushed again.
 */
export class CUndoCommand {
    #m_text: string;

    constructor(text = "") { this.#m_text = text; }

    /**
     * Reads the label used when the command is offered for undo or redo.
     * @returns The command label, which may be empty.
     */
    text(): string { return this.#m_text; }
    /**
     * Changes the label associated with the command.
     * @param text New label text.
     */
    setText(text: string): void { this.#m_text = text; }

    /** Provides the subclass hook to reverse an applied operation synchronously. The base implementation has no effect. */
    undo(): void {}
    /** Provides the subclass hook to apply or reapply the operation synchronously. The base implementation has no effect. */
    redo(): void {}

    /**
     * Identifies the group of commands that may merge. Override together with `mergeWith()`.
     * @returns The merge identifier, or `-1` to disable merging.
     */
    id(): number { return -1; }

    /**
     * Provides the subclass hook to absorb another command of the same merge group. The incoming operation has already been applied.
     * @param _command Incoming command to absorb.
     * @returns `true` if this command now represents both operations. The base implementation returns `false`.
     */
    mergeWith(_command: CUndoCommand): boolean { return false; }
}
