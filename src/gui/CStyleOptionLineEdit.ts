import { CStyleOption } from "./CStyleOption.js";
import type { CLineEdit } from "../widgets/CLineEdit.js";

export class CStyleOptionLineEdit extends CStyleOption {
	text = "";
	cursorPosition = 0;
	cursorVisible = false;
	selectionStart = 0;
	selectionEnd = 0;

	constructor(other: CStyleOptionLineEdit | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
		this.cursorPosition = other.cursorPosition;
		this.cursorVisible = other.cursorVisible;
		this.selectionStart = other.selectionStart;
		this.selectionEnd = other.selectionEnd;
	}

	initFromLineEdit(lineEdit: CLineEdit): void {
		this.initFrom(lineEdit);

		this.text = lineEdit.text();
		this.cursorPosition = lineEdit.cursorPosition();
		this.cursorVisible = lineEdit.cursorVisible();
		this.selectionStart = lineEdit.selectionStart();
		this.selectionEnd = lineEdit.selectionEnd();
	}
}