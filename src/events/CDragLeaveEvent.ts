import { CEvent, CEventType } from "./CEvent.js";

/** Event delivered when a drag operation leaves a widget. */
export class CDragLeaveEvent extends CEvent {
	/** Creates a drag-leave event. */
	constructor() {
		super(CEventType.DragLeave);
	}
}