import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CMimeData } from "../core/CMimeData.js";
import { CDropAction } from "./CDropAction.js";

/** Event containing data and actions for a drag-and-drop operation. */
export class CDropEvent extends CEvent {
	#m_pos: CPoint;
	#m_mimeData: CMimeData;
	#m_possibleActions: CDropAction;
	#m_proposedAction: CDropAction;
	#m_dropAction: CDropAction;

	/** Creates a drop event.
	 * @param pos Position relative to the receiving widget.
	 * @param mimeData Data carried by the drag operation.
	 * @param possibleActions Actions supported by the drag source.
	 * @param proposedAction Action proposed by the drag source.
	 * @param type Event type; defaults to CEventType.Drop.
	 */
	constructor(pos: CPoint, mimeData: CMimeData,
		possibleActions: CDropAction, proposedAction: CDropAction, type: CEventType = CEventType.Drop) {
		super(type);

		this.#m_pos = pos;
		this.#m_mimeData = mimeData;
		this.#m_possibleActions = possibleActions;
		this.#m_proposedAction = proposedAction;
		this.#m_dropAction = proposedAction;
	}

	/** Returns the widget-relative drop position. */
	pos(): CPoint {
		return this.#m_pos;
	}

	/** Returns the MIME data carried by the drag operation. */
	mimeData(): CMimeData {
		return this.#m_mimeData;
	}

	/** Returns the actions supported by the drag source. */
	possibleActions(): CDropAction {
		return this.#m_possibleActions;
	}

	/** Returns the action proposed by the drag source. */
	proposedAction(): CDropAction {
		return this.#m_proposedAction;
	}

	/** Returns the currently selected drop action. */
	dropAction(): CDropAction {
		return this.#m_dropAction;
	}

	/** Sets the drop action when it is supported by the drag source.
	 * @param action Drop action to select.
	 */
	setDropAction(action: CDropAction): void {
		if (action !== CDropAction.IgnoreAction &&
			(this.#m_possibleActions & action) === 0)
			return;

		this.#m_dropAction = action;
	}

	/** Selects the proposed action and accepts the event. */
	acceptProposedAction(): void {
		this.#m_dropAction = this.#m_proposedAction;
		this.accept();
	}
}