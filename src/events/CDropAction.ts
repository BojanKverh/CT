/** @module Events/CDropAction */
/** Defines actions that may be performed during drag-and-drop operations. */
export enum CDropAction {
    /** No drop action is performed. */
    IgnoreAction = 0,
    /** The dragged data is copied. */
    CopyAction = 1 << 0,
    /** The dragged data is moved. */
    MoveAction = 1 << 1,
    /** A link to the dragged data is created. */
    LinkAction = 1 << 2
}
