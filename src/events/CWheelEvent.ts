import { CPoint } from "../geometry/CPoint.js";
import { CEvent, CEventType } from "./CEvent.js";

/** Event containing horizontal and vertical wheel scrolling deltas. */
export class CWheelEvent extends CEvent {
	#m_deltaX: number;
	#m_deltaY: number;
    #m_pos: CPoint | null;
    #m_shiftKey: boolean;

	/** Creates a wheel event.
	 * @param deltaX Horizontal scroll delta.
	 * @param deltaY Vertical scroll delta.
	 * @param x Horizontal position relative to the receiving widget.
	 * @param y Vertical position relative to the receiving widget.
	 * @param shiftKey Whether Shift was held.
	 */
	constructor(deltaX: number, deltaY: number, x?: number, y?: number, shiftKey = false) {
		super(CEventType.Wheel);

		this.#m_deltaX = deltaX;
		this.#m_deltaY = deltaY;
        this.#m_shiftKey = shiftKey;
        this.#m_pos = x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y) ? new CPoint(x, y) : null;
	}

    /** Position relative to the receiving widget, or null for legacy delta-only events. */
    pos(): CPoint | null { return this.#m_pos === null ? null : new CPoint(this.#m_pos.x(), this.#m_pos.y()); }

    /** Returns whether Shift was held during the wheel event. */
    shiftKey(): boolean { return this.#m_shiftKey; }

	/** Returns the horizontal scroll delta. */
	deltaX(): number {
		return this.#m_deltaX;
	}

	/** Returns the vertical scroll delta. */
	deltaY(): number {
		return this.#m_deltaY;
	}
}