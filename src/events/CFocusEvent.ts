import { CEvent, CEventType } from "./CEvent.js";

/** Event describing a change in keyboard focus. */
export class CFocusEvent extends CEvent {
	/** Creates a focus event.
	 * @param type Focus event type, normally CEventType.FocusIn or CEventType.FocusOut.
	 */
	constructor(type: CEventType) {
		super(type);
	}
}