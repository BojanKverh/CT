import { CEvent, CEventType } from "./CEvent.js";

export enum CMouseButton {
    NoButton,
    LeftButton,
    MiddleButton,
    RightButton
}

export class CMouseEvent extends CEvent {
    #m_x: number;
    #m_y: number;
    #m_button: CMouseButton;

    constructor(
        type: CEventType,
        x: number,
        y: number,
        button: number
    ) {
        super(type);

        this.#m_x = x;
        this.#m_y = y;
        this.#m_button = button;
    }

    x(): number {
        return this.#m_x;
    }

    y(): number {
        return this.#m_y;
    }

    button(): CMouseButton {
        return this.#m_button;
    }
}