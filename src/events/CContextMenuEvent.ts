/** @module Events/CContextMenuEvent */
import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";

/** Defines why a context-menu event was generated. */
export enum CContextMenuReason {
    /** The context menu was requested with the mouse. */
    Mouse,
    /** The context menu was requested from the keyboard. */
    Keyboard
}

/** Describes a request to open a context menu. */
export class CContextMenuEvent extends CEvent {
	#m_reason: CContextMenuReason;
	#m_pos: CPoint;
	#m_globalPos: CPoint;

    /** Creates a context-menu event.
    * @param reason Reason the menu was requested.
    * @param pos Position relative to the receiving widget.
    * @param globalPos Position in global canvas coordinates.
    */
    constructor(reason: CContextMenuReason, pos: CPoint,
		globalPos: CPoint) {
		super(CEventType.ContextMenu);

		this.#m_reason = reason;
		this.#m_pos = pos;
		this.#m_globalPos = globalPos;
	}

    /** Returns the reason the context menu was requested. */
    reason(): CContextMenuReason {
		return this.#m_reason;
	}

    /** Returns the position relative to the receiving widget. */
    pos(): CPoint {
		return this.#m_pos;
	}

    /** Returns the position in global canvas coordinates. */
    globalPos(): CPoint {
		return this.#m_globalPos;
	}
}