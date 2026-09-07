import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";

export enum CContextMenuReason {
	Mouse,
	Keyboard
}

export class CContextMenuEvent extends CEvent {
	#m_reason: CContextMenuReason;
	#m_pos: CPoint;
	#m_globalPos: CPoint;

	constructor(reason: CContextMenuReason, pos: CPoint,
		globalPos: CPoint) {
		super(CEventType.ContextMenu);

		this.#m_reason = reason;
		this.#m_pos = pos;
		this.#m_globalPos = globalPos;
	}

	reason(): CContextMenuReason {
		return this.#m_reason;
	}

	pos(): CPoint {
		return this.#m_pos;
	}

	globalPos(): CPoint {
		return this.#m_globalPos;
	}
}