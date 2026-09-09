import { CStyleOption } from "./CStyleOption.js";
import type { CToolBar } from "../widgets/CToolBar.js";

export class CStyleOptionToolBar extends CStyleOption {
	constructor(other: CStyleOptionToolBar | null = null) {
		super(other);
	}

	initFromToolBar(toolBar: CToolBar): void {
		this.initFrom(toolBar);
	}
}