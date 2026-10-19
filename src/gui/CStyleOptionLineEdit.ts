import { CStyleOption } from "./CStyleOption.js";
import type { CLineEdit } from "../widgets/CLineEdit.js";

/**
 * Contains style information used to render a line edit.
 */
export class CStyleOptionLineEdit extends CStyleOption {
		/**
	 * Returns or updates the text value.
	 */
text = "";
	/** Horizontal displacement of text and selection, in pixels. */
	horizontalOffset = 0;
		/**
	 * Returns or updates the cursor position value.
	 */
cursorPosition = 0;
		/**
	 * Returns or updates the cursor visible value.
	 */
cursorVisible = false;
		/**
	 * Returns or updates the selection start value.
	 */
selectionStart = 0;
		/**
	 * Returns or updates the selection end value.
	 */
selectionEnd = 0;

		/**
	 * Creates a new CStyleOptionLineEdit instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionLineEdit | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
		this.horizontalOffset = other.horizontalOffset;
		this.cursorPosition = other.cursorPosition;
		this.cursorVisible = other.cursorVisible;
		this.selectionStart = other.selectionStart;
		this.selectionEnd = other.selectionEnd;
	}

		/**
	 * Initializes this style option from the specified line edit.
	 *
	 * @param lineEdit Line edit.
	 */
initFromLineEdit(lineEdit: CLineEdit): void {
		this.initFrom(lineEdit);

		this.text = lineEdit.text();
		this.horizontalOffset = lineEdit.horizontalOffset();
		this.cursorPosition = lineEdit.cursorPosition();
		this.cursorVisible = lineEdit.cursorVisible();
		this.selectionStart = lineEdit.selectionStart();
		this.selectionEnd = lineEdit.selectionEnd();
	}
}