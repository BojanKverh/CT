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

    /**
     * Looks up the optional pointer location associated with the scrolling event.
     * @returns A copy of the widget-local point, or `null` if both finite coordinates were not supplied.
     */
    pos(): CPoint | null { return this.#m_pos === null ? null : new CPoint(this.#m_pos.x(), this.#m_pos.y()); }

    /**
     * Reads the Shift modifier recorded for this wheel event.
     * @returns `true` if the event was created with Shift active.
     */
    shiftKey(): boolean { return this.#m_shiftKey; }

	/**
	 * Reads the horizontal amount recorded by the wheel event.
	 * @returns The signed horizontal scroll delta supplied at construction.
	 */
	deltaX(): number {
		return this.#m_deltaX;
	}

	/**
	 * Reads the vertical amount recorded by the wheel event.
	 * @returns The signed vertical scroll delta supplied at construction.
	 */
	deltaY(): number {
		return this.#m_deltaY;
	}
}