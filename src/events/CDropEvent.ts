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

	/**
	 * Looks up the location of the drag or drop.
	 * @returns The stored point in coordinates relative to the receiving widget.
	 */
	pos(): CPoint {
		return this.#m_pos;
	}

	/**
	 * Exposes the payload carried by the drag.
	 * @returns The MIME data object supplied by the drag source.
	 */
	mimeData(): CMimeData {
		return this.#m_mimeData;
	}

	/**
	 * Looks up which actions the drag source supports.
	 * @returns A bit mask of supported drop actions.
	 */
	possibleActions(): CDropAction {
		return this.#m_possibleActions;
	}

	/**
	 * Looks up the action suggested by the drag source.
	 * @returns The original proposed action.
	 */
	proposedAction(): CDropAction {
		return this.#m_proposedAction;
	}

	/**
	 * Looks up the currently selected action. It starts as the proposed action.
	 * @returns The selected drop action.
	 */
	dropAction(): CDropAction {
		return this.#m_dropAction;
	}

	/**
	 * Changes the selected action without changing the event's acceptance. Unsupported actions are ignored.
	 * @param action `IgnoreAction` or an action supported by the source.
	 */
	setDropAction(action: CDropAction): void {
		if (action !== CDropAction.IgnoreAction &&
			(this.#m_possibleActions & action) === 0)
			return;

		this.#m_dropAction = action;
	}

	/** Restores the source's proposed action as the selected action and marks the event accepted. */
	acceptProposedAction(): void {
		this.#m_dropAction = this.#m_proposedAction;
		this.accept();
	}
}