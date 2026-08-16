import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";

export enum CMouseButton {
    NoButton,
    LeftButton,
    MiddleButton,
    RightButton
}

export class CMouseEvent extends CEvent {
    #m_pos: CPoint;
    #m_button: CMouseButton;

    constructor(
        type: CEventType,
        x: number,
        y: number,
        button: number
    ) {
        super(type);

        this.#m_pos = new CPoint(x, y);
        this.#m_button = button;
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
}