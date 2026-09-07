import { CDropEvent } from "./CDropEvent.js";
import { CDropAction } from "./CDropAction.js";
import { CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CMimeData } from "../core/CMimeData.js";

export class CDragMoveEvent extends CDropEvent {
	constructor(pos: CPoint, mimeData: CMimeData,
		possibleActions: CDropAction, proposedAction: CDropAction, type: CEventType = CEventType.DragMove) {
		super(pos, mimeData, possibleActions, proposedAction, type);
	}
}