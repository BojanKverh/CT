/** @module Events/CEvent */
/** Defines the event types delivered by Canvas Toolkit. */
export enum CEventType {
    /** Mouse button press event. */
    MousePress,
    /** Mouse button release event. */
    MouseRelease,
    /** Mouse button double-click event. */
    MouseDoubleClick,
    /** Mouse movement event. */
    MouseMove,
    /** Pointer entered a widget. */
    MouseEnter,
    /** Pointer left a widget. */
    MouseLeave,
    /** Widget gained keyboard focus. */
    FocusIn,
    /** Widget lost keyboard focus. */
    FocusOut,
    /** Keyboard key press event. */
    KeyPress,
    /** Keyboard key release event. */
    KeyRelease,
    /** Mouse wheel or trackpad scrolling event. */
    Wheel,
    /** Context-menu request event. */
    ContextMenu,
    /** Drag-and-drop drop event. */
    Drop,
    /** Drag entered a widget. */
    DragEnter,
    /** Drag moved within a widget. */
    DragMove,
    /** Drag left a widget. */
    DragLeave
}

/** Base class for all Canvas Toolkit events. */
export class CEvent {
    #m_type: CEventType;
    #m_accepted = true;

    /** Creates an event of the specified type.
    * @param type Event type.
    */
    constructor(type: CEventType) { this.#m_type = type; }

    /**
    * Returns the dispatch discriminator used to choose a widget event handler.
    */
    type(): CEventType { return this.#m_type; }

    /**
    * Reports whether event propagation should stop at the current receiver.
    */
    isAccepted(): boolean { return this.#m_accepted; }

    /** Marks the event as accepted. */
    accept(): void { this.#m_accepted = true; }

    /** Marks the event as ignored. */
    ignore(): void { this.#m_accepted = false; }
}
