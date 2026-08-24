import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";

export enum CMouseButton {
    NoButton,
    LeftButton,
    MiddleButton,
    RightButton
}

export enum CKeyboardModifier {
	NoModifier = 0,
	ShiftModifier = 1 << 0,
	ControlModifier = 1 << 1,
	AltModifier = 1 << 2,
	MetaModifier = 1 << 3
}

export class CMouseEvent extends CEvent {
    #m_pos: CPoint;
    #m_button: CMouseButton;
    #m_modifiers: number = 0;

    constructor(type: CEventType, x: number, y: number, button: number, shiftKey: boolean = false) {
        super(type);

        this.#m_pos = new CPoint(x, y);
        this.#m_button = button;
        this.#m_modifiers += shiftKey? CKeyboardModifier.ShiftModifier : 0;
    }

    x(): number {
        return this.#m_pos.x();
    }

    y(): number {
        return this.#m_pos.y();
    }

    pos(): CPoint {
        return this.#m_pos;
    }

    button(): CMouseButton {
        return this.#m_button;
    }

    modifiers() : number {
        return this.#m_modifiers;
    }
}