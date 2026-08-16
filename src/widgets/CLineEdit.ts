import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";

export class CLineEdit extends CWidget {
	readonly textChanged = new CSignal<[string]>();

	#m_text = "";
	#m_cursorPosition = 0;
    #m_selectionAnchor = 0;

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.#m_cursorPosition = text.length;
        this.#m_selectionAnchor = this.#m_cursorPosition;

		this.textChanged.emit(this.#m_text);
		this.update();
	}

	cursorPosition(): number {
		return this.#m_cursorPosition;
	}

    setCursorPosition(position: number): void {
	    this.#moveCursor(position, false);
    }

	insert(text: string): void {
	    if (text.length === 0)
		    return;
    	if (this.hasSelection()) {
	    	const start = this.selectionStart();
		    const end = this.selectionEnd();
    		this.#m_text = this.#m_text.slice(0, start) + text
			    + this.#m_text.slice(end);
    		this.#m_cursorPosition = start + text.length;
	    	this.#m_selectionAnchor = this.#m_cursorPosition;
    		this.textChanged.emit(this.#m_text);
	    	this.update();
		    return;
	    }

	    this.#m_text = this.#m_text.slice(0, this.#m_cursorPosition) + text
		    + this.#m_text.slice(this.#m_cursorPosition);

	    this.#m_cursorPosition += text.length;
	    this.#m_selectionAnchor = this.#m_cursorPosition;
    	this.textChanged.emit(this.#m_text);
	    this.update();
    }

    selectionStart(): number {
	    return Math.min(this.#m_selectionAnchor, this.#m_cursorPosition);
    }

    selectionEnd(): number {
	    return Math.max(this.#m_selectionAnchor, this.#m_cursorPosition);
    }

    hasSelection(): boolean {
	    return this.#m_selectionAnchor !== this.#m_cursorPosition;
    }

    selectedText(): string {
	    if (!this.hasSelection())
		    return "";

	    return this.#m_text.slice(this.selectionStart(), this.selectionEnd());
    }

    setSelection(anchor: number, position: number): void {
	    const length = this.#m_text.length;
    	this.#m_selectionAnchor = Math.max(0, Math.min(anchor, length));
    	this.#m_cursorPosition = Math.max(0, Math.min(position, length));
	    this.update();
    }

    clearSelection(): void {
	    this.#m_selectionAnchor = this.#m_cursorPosition;
    }

    protected override paintEvent(painter: CPainter): void {
	    this.style().drawLineEdit(painter, this);
    }

    protected override keyPressEvent(event: CKeyEvent): void {
	    switch (event.key()) {
        case "ArrowLeft":
	        this.#moveCursor(this.#m_cursorPosition - 1, event.shift());
	        event.accept();
	        return;

        case "ArrowRight":
	        this.#moveCursor(this.#m_cursorPosition + 1, event.shift());
	        event.accept();
	        return;

        case "Backspace":
	        if (this.#deleteSelection()) {
		        event.accept();
		        return;
	        }

	        if (this.#m_cursorPosition > 0) {
		        this.#m_text = this.#m_text.slice(0, this.#m_cursorPosition - 1)
			        + this.#m_text.slice(this.#m_cursorPosition);
        		--this.#m_cursorPosition;
		        this.#m_selectionAnchor = this.#m_cursorPosition;
        		this.textChanged.emit(this.#m_text);
		        this.update();
	        }

	        event.accept();
	        return;

        case "Delete":
	        if (this.#deleteSelection()) {
		        event.accept();
		        return;
	        }
            
        	if (this.#m_cursorPosition < this.#m_text.length) {
		        this.#m_text = this.#m_text.slice(0, this.#m_cursorPosition)
			        + this.#m_text.slice(this.#m_cursorPosition + 1);
        		this.#m_selectionAnchor = this.#m_cursorPosition;
        		this.textChanged.emit(this.#m_text);
		        this.update();
	        }

	        event.accept();
	        return;
	    }

	    if (event.key().length === 1) {
		    this.insert(event.key());
		    event.accept();
		    return;
	    }
    	event.ignore();
    }

    protected override mousePressEvent(event: CMouseEvent): void {
	    if (event.button() !== CMouseButton.LeftButton) {
		    event.ignore();
		    return;
	    }
        this.setCursorPosition(this.cursorPositionAt(event.x()));
    	event.accept();
    }

    private cursorPositionAt(x: number): number {
	    const fm = new CFontMetrics(this.font());
	    const textX = x - 5;
	    if (textX <= 0)
		    return 0;
    	for (let i = 1; i <= this.#m_text.length; ++i) {
	    	const previousWidth = fm.textWidth(this.#m_text.slice(0, i - 1));
    		const width = fm.textWidth(this.#m_text.slice(0, i));
    		const middle = (previousWidth + width) / 2;
    		if (textX < middle)
	    		return i - 1;
	    }

	    return this.#m_text.length;
    }

    #moveCursor(position: number, keepAnchor: boolean): void {
	    const clamped = Math.max(0, Math.min(position, this.#m_text.length));
    	if (this.#m_cursorPosition === clamped && (keepAnchor || this.#m_selectionAnchor === clamped))
		    return;
    	this.#m_cursorPosition = clamped;
    	if (!keepAnchor)
	    	this.#m_selectionAnchor = clamped;
	    this.update();
    }

    #deleteSelection(): boolean {
	    if (!this.hasSelection())
		    return false;
    	const start = this.selectionStart();
	    const end = this.selectionEnd();
    	this.#m_text = this.#m_text.slice(0, start) + this.#m_text.slice(end);
    	this.#m_cursorPosition = start;
	    this.#m_selectionAnchor = start;
    	this.textChanged.emit(this.#m_text);
	    this.update();
    	return true;
    }
}