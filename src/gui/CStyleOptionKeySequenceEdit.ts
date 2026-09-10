import { CStyleOption } from "./CStyleOption.js";
import type { CKeySequenceEdit } from "../widgets/CKeySequenceEdit.js";

/**
 * Contains style information used to render a key sequence edit.
 */
export class CStyleOptionKeySequenceEdit extends CStyleOption {
		/**
	 * Returns or updates the key sequence value.
	 */
keySequence = "";

		/**
	 * Creates a new CStyleOptionKeySequenceEdit instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionKeySequenceEdit | null = null) {
		super(other);

		if (other)
			this.keySequence = other.keySequence;
	}

		/**
	 * Initializes this style option from the specified key sequence edit.
	 *
	 * @param edit Edit.
	 */
initFromKeySequenceEdit(edit: CKeySequenceEdit): void {
		this.initFrom(edit);

		this.keySequence = edit.keySequence();
	}
}