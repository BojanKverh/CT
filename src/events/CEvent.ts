/** Defines the event types delivered by Canvas Toolkit. */
export enum CEventType {
    /** Mouse button press event. */ MousePress,
    /** Mouse button release event. */ MouseRelease,
    /** Mouse button double-click event. */ MouseDoubleClick,
    /** Mouse movement event. */ MouseMove,
    /** Pointer entered a widget. */ MouseEnter,
    /** Pointer left a widget. */ MouseLeave,
    /** Widget gained keyboard focus. */ FocusIn,
    /** Widget lost keyboard focus. */ FocusOut,
    /** Keyboard key press event. */ KeyPress,
    /** Keyboard key release event. */ KeyRelease,
    /** Mouse wheel or trackpad scrolling event. */ Wheel,
    /** Context-menu request event. */ ContextMenu,
    /** Drag-and-drop drop event. */ Drop,
    /** Drag entered a widget. */ DragEnter,
    /** Drag moved within a widget. */ DragMove,
    /** Drag left a widget. */ DragLeave
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
     * Identifies the kind of event to dispatch.
     * @returns The event type specified at construction.
     */
    type(): CEventType { return this.#m_type; }

    /**
     * Checks the mutable acceptance state. New events start accepted.
     * @returns `true` if the event is currently accepted.
     */
    isAccepted(): boolean { return this.#m_accepted; }

    /** Marks the event as handled by the receiver. */
    accept(): void { this.#m_accepted = true; }

    /** Marks the event as unhandled by the receiver. */
    ignore(): void { this.#m_accepted = false; }
}
