import { CEvent, CEventType } from "./CEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CMimeData } from "../core/CMimeData.js";
import { CDropAction } from "./CDropAction.js";

export class CDropEvent extends CEvent {
	#m_pos: CPoint;
	#m_mimeData: CMimeData;
	#m_possibleActions: CDropAction;
	#m_proposedAction: CDropAction;
	#m_dropAction: CDropAction;

	constructor(pos: CPoint, mimeData: CMimeData,
		possibleActions: CDropAction, proposedAction: CDropAction, type: CEventType = CEventType.Drop) {
		super(type);

		this.#m_pos = pos;
		this.#m_mimeData = mimeData;
		this.#m_possibleActions = possibleActions;
		this.#m_proposedAction = proposedAction;
		this.#m_dropAction = proposedAction;
	}

	pos(): CPoint {
		return this.#m_pos;
	}

	mimeData(): CMimeData {
		return this.#m_mimeData;
	}

	possibleActions(): CDropAction {
		return this.#m_possibleActions;
	}

	proposedAction(): CDropAction {
		return this.#m_proposedAction;
	}

	dropAction(): CDropAction {
		return this.#m_dropAction;
	}

	setDropAction(action: CDropAction): void {
		if (action !== CDropAction.IgnoreAction &&
			(this.#m_possibleActions & action) === 0)
			return;

		this.#m_dropAction = action;
	}

	acceptProposedAction(): void {
		this.#m_dropAction = this.#m_proposedAction;
		this.accept();
	}
}