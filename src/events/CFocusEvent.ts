import { CEvent, CEventType } from "./CEvent.js";

export class CFocusEvent extends CEvent {
	constructor(type: CEventType) {
		super(type);
	}
}