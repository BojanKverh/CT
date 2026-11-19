/** @module Events/CMouseEvent */
import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";

/** Defines mouse buttons recognized by Canvas Toolkit. */
export enum CMouseButton {
    /** No mouse button. */
    NoButton,
    /** Left mouse button. */
    LeftButton,
    /** Middle mouse button. */
    MiddleButton,
    /** Right mouse button. */
    RightButton
}

/** Bit flags describing keyboard modifiers active during a mouse event. */
export enum CKeyboardModifier {
    /** No keyboard modifier. */
    NoModifier = 0,
    /**
    * The Shift key was held when the pointer event occurred.
    */
    ShiftModifier = 1 << 0,
    /**
    * The Ctrl key was held when the pointer event occurred.
    */
    ControlModifier = 1 << 1,
    /**
    * The Alt key was held when the pointer event occurred.
    */
    AltModifier = 1 << 2,
    /**
    * The platform Meta key was held when the pointer event occurred.
    */
    MetaModifier = 1 << 3
}

/** Event describing mouse input at a widget-relative position. */
export class CMouseEvent extends CEvent {
    #m_pos: CPoint;
    #m_button: CMouseButton;
    #m_modifiers: number = 0;
    #m_clickCount: number;

    /** Creates a mouse event.
    * @param type Mouse event type.
    * @param x X coordinate relative to the receiving widget.
    * @param y Y coordinate relative to the receiving widget.
    * @param button Mouse button associated with the event.
    * @param shiftKey Whether Shift is pressed.
    * @param clickCount Number of consecutive clicks; defaults to one.
    * @param ctrlKey Whether Control is pressed.
    */
    constructor(type: CEventType, x: number, y: number, button: number,
        shiftKey: boolean = false, clickCount: number = 1, ctrlKey = false) {
        super(type);

        this.#m_pos = new CPoint(x, y);
        this.#m_button = button;
        this.#m_clickCount = Number.isFinite(clickCount)
            ? Math.max(1, Math.trunc(clickCount)) : 1;
        if (shiftKey) this.#m_modifiers |= CKeyboardModifier.ShiftModifier;
        if (ctrlKey) this.#m_modifiers |= CKeyboardModifier.ControlModifier;
    }

    /** Returns the widget-relative X coordinate. */
    x(): number {
        return this.#m_pos.x();
    }

    /** Returns the widget-relative Y coordinate. */
    y(): number {
        return this.#m_pos.y();
    }

    /** Returns the widget-relative mouse position. */
    pos(): CPoint {
        return this.#m_pos;
    }

    /** Returns the mouse button associated with the event. */
    button(): CMouseButton {
        return this.#m_button;
    }

    /** Returns the number of consecutive clicks. */
    clickCount(): number {
        return this.#m_clickCount;
    }

    /** Returns the active CKeyboardModifier flags. */
    modifiers() : number {
        return this.#m_modifiers;
    }
}
