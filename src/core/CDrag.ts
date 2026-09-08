import { CObject } from "./CObject.js";
import { CMimeData } from "./CMimeData.js";
import { CDropAction } from "../events/CDropAction.js";

export class CDrag extends CObject {
	#m_source: CObject;
	#m_mimeData: CMimeData | null = null;
	#m_supportedActions = CDropAction.IgnoreAction;
	#m_defaultAction = CDropAction.IgnoreAction;
	#m_dropAction = CDropAction.IgnoreAction;
	#m_active = false;

	constructor(source: CObject) {
		super(source);

		this.#m_source = source;
	}

	source(): CObject {
		return this.#m_source;
	}

	mimeData(): CMimeData | null {
		return this.#m_mimeData;
	}

	setMimeData(mimeData: CMimeData | null): void {
		this.#m_mimeData = mimeData;
	}

	supportedActions(): CDropAction {
		return this.#m_supportedActions;
	}

	defaultAction(): CDropAction {
		return this.#m_defaultAction;
	}

	dropAction(): CDropAction {
		return this.#m_dropAction;
	}

	isActive(): boolean {
		return this.#m_active;
	}

	exec(actions: CDropAction,
		defaultAction: CDropAction = CDropAction.IgnoreAction): void {
		this.#m_supportedActions = actions;

		if (defaultAction !== CDropAction.IgnoreAction &&
			(actions & defaultAction) === 0)
			defaultAction = CDropAction.IgnoreAction;

		this.#m_defaultAction = defaultAction;
		this.#m_dropAction = CDropAction.IgnoreAction;
		this.#m_active = true;
	}

	finish(action: CDropAction): void {
		if (!this.#m_active)
			return;

		if (action !== CDropAction.IgnoreAction &&
			(this.#m_supportedActions & action) === 0)
			action = CDropAction.IgnoreAction;

		this.#m_dropAction = action;
		this.#m_active = false;
	}

	cancel(): void {
		this.finish(CDropAction.IgnoreAction);
	}
}