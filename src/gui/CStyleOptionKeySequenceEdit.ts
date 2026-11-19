/** @module GUI/CStyleOptionKeySequenceEdit */
import { CStyleOption } from "./CStyleOption.js";
import type { CKeySequenceEdit } from "../widgets/CKeySequenceEdit.js";

/**
 * Contains style information used to render a key sequence edit.
 */
export class CStyleOptionKeySequenceEdit extends CStyleOption {
    /**
    * Formatted keyboard shortcut shown in the editor, or an empty string when unset.
    */
    keySequence = "";

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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