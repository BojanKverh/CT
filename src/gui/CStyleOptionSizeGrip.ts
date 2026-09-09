import { CStyleOption } from "./CStyleOption.js";
import type { CSizeGrip } from "../widgets/CSizeGrip.js";

export class CStyleOptionSizeGrip extends CStyleOption {
	constructor(other: CStyleOptionSizeGrip | null = null) {
		super(other);
	}

	initFromSizeGrip(sizeGrip: CSizeGrip): void {
		this.initFrom(sizeGrip);
	}
}