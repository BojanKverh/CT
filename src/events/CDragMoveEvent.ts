/** @module Events/CDragMoveEvent */
import { CDropEvent } from "./CDropEvent.js";
import { CDropAction } from "./CDropAction.js";
import { CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CMimeData } from "../core/CMimeData.js";

/** Event delivered while a drag operation moves within a widget. */
export class CDragMoveEvent extends CDropEvent {
    /** Creates a drag-move event.
    * @param pos Position relative to the receiving widget.
    * @param mimeData Data carried by the drag operation.
    * @param possibleActions Actions supported by the drag source.
    * @param proposedAction Action proposed by the drag source.
    * @param type Event type; defaults to CEventType.DragMove.
    */
    constructor(pos: CPoint, mimeData: CMimeData,
		possibleActions: CDropAction, proposedAction: CDropAction, type: CEventType = CEventType.DragMove) {
		super(pos, mimeData, possibleActions, proposedAction, type);
	}
}