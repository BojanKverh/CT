/**
 * Reversible operation. push() executes redo() before storing the command.
 * Once pushed, a command belongs to its stack and must not be pushed again.
 */
export class CUndoCommand {
    #m_text: string;

    constructor(text = "") { this.#m_text = text; }

    text(): string { return this.#m_text; }
    setText(text: string): void { this.#m_text = text; }

    undo(): void {}
    redo(): void {}

    /** -1 disables merging. Override together with mergeWith(). */
    id(): number { return -1; }

    /** The incoming command has already been redone. */
    mergeWith(_command: CUndoCommand): boolean { return false; }
}
