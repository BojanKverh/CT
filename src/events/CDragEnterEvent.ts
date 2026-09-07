import { CDragMoveEvent } from "./CDragMoveEvent.js";
import { CDropAction } from "./CDropAction.js";
import { CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CMimeData } from "../core/CMimeData.js";

export class CDragEnterEvent extends CDragMoveEvent {
	constructor(pos: CPoint, mimeData: CMimeData,
		possibleActions: CDropAction, proposedAction: CDropAction) {
		super(pos, mimeData, possibleActions, proposedAction, CEventType.DragEnter);
	}
}