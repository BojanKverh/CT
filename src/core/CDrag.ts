/** @module Core/CDrag */
import { CObject } from "./CObject.js";
import { CMimeData } from "./CMimeData.js";
import { CDropAction } from "../events/CDropAction.js";

/**
 * Represents an application drag-and-drop operation.
 */
export class CDrag extends CObject {
	#m_source: CObject;
	#m_mimeData: CMimeData | null = null;
	#m_supportedActions = CDropAction.IgnoreAction;
	#m_defaultAction = CDropAction.IgnoreAction;
	#m_dropAction = CDropAction.IgnoreAction;
	#m_active = false;

    /**
    * Creates a drag operation for a source object.
    * @param source Object that initiated the drag.
    */
    constructor(source: CObject) {
		super(source);

		this.#m_source = source;
	}

    /**
    * Returns the object that initiated the drag.
    * @returns Drag source object.
    */
    source(): CObject {
		return this.#m_source;
	}

    /**
    * Returns the data carried by the drag operation.
    * @returns MIME data, or `null` if none has been assigned.
    */
    mimeData(): CMimeData | null {
		return this.#m_mimeData;
	}

    /**
    * Sets the data carried by the drag operation.
    * @param mimeData MIME data to carry, or `null`.
    */
    setMimeData(mimeData: CMimeData | null): void {
		this.#m_mimeData = mimeData;
	}

    /**
    * Returns the supported drop actions.
    * @returns Bit mask of supported drop actions.
    */
    supportedActions(): CDropAction {
		return this.#m_supportedActions;
	}

    /**
    * Returns the preferred default drop action.
    * @returns Default drop action.
    */
    defaultAction(): CDropAction {
		return this.#m_defaultAction;
	}

    /**
    * Returns the action selected when the drag finished.
    * @returns Resulting drop action.
    */
    dropAction(): CDropAction {
		return this.#m_dropAction;
	}

    /**
    * Whether the timer is currently scheduled.
    * The initial value is `false`.
    */
    isActive(): boolean {
		return this.#m_active;
	}

    /**
    * Starts the drag operation with the supplied actions.
    * @param actions Bit mask of supported drop actions.
    * @param defaultAction Preferred action; unsupported values are replaced with `IgnoreAction`.
    */
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

    /**
    * Finishes the drag operation with a selected action.
    * @param action Drop action to record; unsupported values become `IgnoreAction`.
    */
    finish(action: CDropAction): void {
		if (!this.#m_active)
			return;

		if (action !== CDropAction.IgnoreAction &&
			(this.#m_supportedActions & action) === 0)
			action = CDropAction.IgnoreAction;

		this.#m_dropAction = action;
		this.#m_active = false;
	}

    /**
    * Cancels the drag operation.
    */
    cancel(): void {
		this.finish(CDropAction.IgnoreAction);
	}
}