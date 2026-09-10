import { CDragMoveEvent } from "./CDragMoveEvent.js";
import { CDropAction } from "./CDropAction.js";
import { CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CMimeData } from "../core/CMimeData.js";

/** Event delivered when a drag operation enters a widget. */
export class CDragEnterEvent extends CDragMoveEvent {
	/** Creates a drag-enter event.
	 * @param pos Position relative to the receiving widget.
	 * @param mimeData Data carried by the drag operation.
	 * @param possibleActions Actions supported by the drag source.
	 * @param proposedAction Action proposed by the drag source.
	 */
	constructor(pos: CPoint, mimeData: CMimeData,
		possibleActions: CDropAction, proposedAction: CDropAction) {
		super(pos, mimeData, possibleActions, proposedAction, CEventType.DragEnter);
	}
}