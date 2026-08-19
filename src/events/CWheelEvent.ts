import { CEvent, CEventType } from "./CEvent.js";

export class CWheelEvent extends CEvent {
	#m_deltaX: number;
	#m_deltaY: number;

	constructor(deltaX: number, deltaY: number) {
		super(CEventType.Wheel);

		this.#m_deltaX = deltaX;
		this.#m_deltaY = deltaY;
	}

	deltaX(): number {
		return this.#m_deltaX;
	}

	deltaY(): number {
		return this.#m_deltaY;
	}
}