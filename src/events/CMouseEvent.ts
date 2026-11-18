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

    /**
     * Reads the horizontal pointer position.
     * @returns X coordinate relative to the receiving widget.
     */
    x(): number {
        return this.#m_pos.x();
    }

    /**
     * Reads the vertical pointer position.
     * @returns Y coordinate relative to the receiving widget.
     */
    y(): number {
        return this.#m_pos.y();
    }

    /**
     * Reads the pointer location.
     * @returns The stored point in widget-local coordinates.
     */
    pos(): CPoint {
        return this.#m_pos;
    }

    /**
     * Identifies the button associated with the event.
     * @returns The recorded mouse button.
     */
    button(): CMouseButton {
        return this.#m_button;
    }

    /**
     * Reads the consecutive click count. The constructor normalizes it to a positive integer.
     * @returns The recorded count, with a minimum of one.
     */
    clickCount(): number {
        return this.#m_clickCount;
    }

    /**
     * Reads the keyboard modifiers recorded for the event. The constructor currently records Shift.
     * @returns A bit mask of `CKeyboardModifier` values.
     */
    modifiers() : number {
        return this.#m_modifiers;
    }
}
