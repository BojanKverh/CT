import { CBoxLayout, CBoxLayoutDirection } from "./CBoxLayout.js";

export class CVBoxLayout extends CBoxLayout {
	constructor() {
		super(CBoxLayoutDirection.TopToBottom);
	}
}