import { CBoxLayout, CBoxLayoutDirection } from "./CBoxLayout.js";

export class CHBoxLayout extends CBoxLayout {
	constructor() {
		super(CBoxLayoutDirection.LeftToRight);
	}
}