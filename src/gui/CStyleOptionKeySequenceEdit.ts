import { CStyleOption } from "./CStyleOption.js";
import type { CKeySequenceEdit } from "../widgets/CKeySequenceEdit.js";

export class CStyleOptionKeySequenceEdit extends CStyleOption {
	keySequence = "";

	constructor(other: CStyleOptionKeySequenceEdit | null = null) {
		super(other);

		if (other)
			this.keySequence = other.keySequence;
	}

	initFromKeySequenceEdit(edit: CKeySequenceEdit): void {
		this.initFrom(edit);

		this.keySequence = edit.keySequence();
	}
}