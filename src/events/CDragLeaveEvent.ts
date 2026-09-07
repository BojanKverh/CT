import { CEvent, CEventType } from "./CEvent.js";

export class CDragLeaveEvent extends CEvent {
	constructor() {
		super(CEventType.DragLeave);
	}
}