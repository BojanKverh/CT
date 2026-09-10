import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";

/** Defines mouse buttons recognized by Canvas Toolkit. */
export enum CMouseButton {
    /** No mouse button. */ NoButton,
    /** Left mouse button. */ LeftButton,
    /** Middle mouse button. */ MiddleButton,
    /** Right mouse button. */ RightButton
}

/** Bit flags describing keyboard modifiers active during a mouse event. */
export enum CKeyboardModifier {
	/** No keyboard modifier. */ NoModifier = 0,
	/** Shift modifier. */ ShiftModifier = 1 << 0,
	/** Control modifier. */ ControlModifier = 1 << 1,
	/** Alt modifier. */ AltModifier = 1 << 2,
	/** Meta modifier. */ MetaModifier = 1 << 3
}

/** Event describing mouse input at a widget-relative position. */
export class CMouseEvent extends CEvent {
    #m_pos: CPoint;
    #m_button: CMouseButton;
    #m_modifiers: number = 0;

    /** Creates a mouse event.
     * @param type Mouse event type.
     * @param x X coordinate relative to the receiving widget.
     * @param y Y coordinate relative to the receiving widget.
     * @param button Mouse button associated with the event.
     * @param shiftKey Whether Shift is pressed.
     */
    constructor(type: CEventType, x: number, y: number, button: number, shiftKey: boolean = false) {
        super(type);

        this.#m_pos = new CPoint(x, y);
        this.#m_button = button;
        this.#m_modifiers += shiftKey? CKeyboardModifier.ShiftModifier : 0;
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

    /** Returns the active CKeyboardModifier flags. */
    modifiers() : number {
        return this.#m_modifiers;
    }
}