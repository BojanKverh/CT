/** @module GUI/CStyleOptionLineEdit */
import { CStyleOption } from "./CStyleOption.js";
import type { CLineEdit } from "../widgets/CLineEdit.js";

/**
 * Contains style information used to render a line edit.
 */
export class CStyleOptionLineEdit extends CStyleOption {
    /**
    * Editor text copied from CLineEdit.text() for the style to draw.
    */
    text = "";
    /** Horizontal displacement of text and selection, in pixels. */
    horizontalOffset = 0;
    /**
    * UTF-16 insertion offset within the displayed editor string.
    */
    cursorPosition = 0;
    /**
    * Whether the current caret blink phase paints the insertion marker.
    */
    cursorVisible = false;
    /**
    * UTF-16 boundary at which the highlighted selection begins.
    */
    selectionStart = 0;
    /**
    * UTF-16 boundary at which the highlighted selection ends.
    */
    selectionEnd = 0;
    /**
    * Hint drawn while the input value is empty.
    */
    placeholderText = "";
    /**
    * Whether the line editor currently owns keyboard focus.
    */
    focus = false;
    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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
		this.placeholderText = other.placeholderText;
		this.focus = other.focus;
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
		this.placeholderText = lineEdit.placeholderText();
		this.focus = lineEdit.hasFocus();
	}
}