import { CEvent, CEventType } from "./CEvent.js";

/** Event containing horizontal and vertical wheel scrolling deltas. */
export class CWheelEvent extends CEvent {
	#m_deltaX: number;
	#m_deltaY: number;

	/** Creates a wheel event.
	 * @param deltaX Horizontal scroll delta.
	 * @param deltaY Vertical scroll delta.
	 */
	constructor(deltaX: number, deltaY: number) {
		super(CEventType.Wheel);

		this.#m_deltaX = deltaX;
		this.#m_deltaY = deltaY;
	}

	/** Returns the horizontal scroll delta. */
	deltaX(): number {
		return this.#m_deltaX;
	}

	/** Returns the vertical scroll delta. */
	deltaY(): number {
		return this.#m_deltaY;
	}
}