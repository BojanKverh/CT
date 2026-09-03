import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CTimer } from "../core/CTimer.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

export class CLineEdit extends CWidget {
	readonly textChanged = new CSignal<[string]>();
	
	#m_text = "";
	#m_cursorPosition = 0;
    #m_selectionAnchor = 0;
	#m_selectingWithMouse = false;
	#m_cursorVisible = true;
	#m_cursorTimer = new CTimer(this);
	#m_validator: ((text: string) => boolean) | null = null;
	#m_readOnly = false;

	readonly editingFinished = new CSignal();

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_cursorTimer.setInterval(500);

		this.#m_cursorTimer.timeout.connect(() => {
			this.#m_cursorVisible = !this.#m_cursorVisible;
			this.update();
		});
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

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

	setReadOnly(readOnly: boolean = true): void {
		if (readOnly !== this.#m_readOnly) {
			this.#m_readOnly = readOnly;
			this.update();
		}
	}

	isReadOnly(): boolean
	{
		return this.#m_readOnly;
	}

	setValidator(validator: ((text: string) => boolean) | null): void {
		this.#m_validator = validator;
	}

	override cursor(): CCursorShape {
		return this.isEnabled()? CCursorShape.IBeam : CCursorShape.Disabled;
	}

	cursorPosition(): number {
		return this.#m_cursorPosition;
	}

    setCursorPosition(position: number): void {
	    this.#moveCursor(position, false);
    }

	cursorVisible(): boolean {
		return this.#m_cursorVisible;
	}

	insert(text: string): void {
		if (text.length === 0 || this.isReadOnly())
			return;
		const start = this.hasSelection()? this.selectionStart() : this.#m_cursorPosition;
		const end = this.hasSelection()? this.selectionEnd() : this.#m_cursorPosition;
		const newText = this.#m_text.slice(0, start) + text
			+ this.#m_text.slice(end);

		if (this.#m_validator !== null && !this.#m_validator(newText))
			return;

		this.#m_text = newText;
		this.#m_cursorPosition = start + text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.textChanged.emit(this.#m_text);
		this.#resetCursorBlink();
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

	override sizeHint(): CSize {
		return new CSize(160, 28);
	}

	async copy(): Promise<void> {
		if (!this.hasSelection() || this.isReadOnly())
			return;

		await navigator.clipboard.writeText(
			this.selectedText()
		);
	}

	async cut(): Promise<void> {
		if (!this.hasSelection())
			return;

		await navigator.clipboard.writeText(
			this.selectedText()
		);

		if (this.isReadOnly())
			return;

		this.#deleteSelection();
	}

	async paste(): Promise<void> {
		if (this.isReadOnly())
			return;

		const text = await navigator.clipboard.readText();

		if (text.length === 0)
			return;

		this.insert(text);
	}

    protected override paintEvent(painter: CPainter): void {
	    this.style().drawLineEdit(painter, this);
    }

    protected override keyPressEvent(event: CKeyEvent): void {
		if (event.ctrl()) {
			switch (event.key().toLowerCase()) {
			case "c":
				void this.copy();
				event.accept();
				return;

			case "x":
				void this.cut();
				event.accept();
				return;

			case "v":
				void this.paste();
				event.accept();
				return;
			}
		}

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
			if (this.isReadOnly()) {
				event.accept();
				return;
			}
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
				this.#resetCursorBlink();
		        this.update();
	        }

	        event.accept();
	        return;

        case "Delete":
			if (this.isReadOnly()) {
				event.accept();
				return;
			}
	        if (this.#deleteSelection()) {
		        event.accept();
		        return;
	        }
            
        	if (this.#m_cursorPosition < this.#m_text.length) {
		        this.#m_text = this.#m_text.slice(0, this.#m_cursorPosition)
			        + this.#m_text.slice(this.#m_cursorPosition + 1);
        		this.#m_selectionAnchor = this.#m_cursorPosition;
        		this.textChanged.emit(this.#m_text);
				this.#resetCursorBlink();
		        this.update();
	        }

	        event.accept();
	        return;

		case "Home":
			this.#moveCursor(0, event.shift());
			event.accept();
			return;

		case "End":
			this.#moveCursor(this.#m_text.length, event.shift());
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

		const position = this.cursorPositionAt(event.x());
		this.#m_cursorPosition = position;
		this.#m_selectionAnchor = position;
		this.#m_selectingWithMouse = true;

		event.accept();
		this.update();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		const position = this.cursorPositionAt(event.x());

		this.#moveCursor(position, true);
		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		this.#m_selectingWithMouse = false;
		const position = this.cursorPositionAt(event.x());
		this.#moveCursor(position, true);

		event.accept();
	}

	protected override focusInEvent(event: CFocusEvent): void {
		this.#startCursorBlink();
		event.accept();
		this.update();
	}

	protected override focusOutEvent(event: CFocusEvent): void {
		this.#m_selectingWithMouse = false;
		this.#stopCursorBlink();
		this.editingFinished.emit();
		super.focusOutEvent(event);
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
		this.#resetCursorBlink();
	    this.update();
    }

    #deleteSelection(): boolean {
		if (!this.hasSelection() || this.isReadOnly())
		    return false;
    	const start = this.selectionStart();
	    const end = this.selectionEnd();
    	this.#m_text = this.#m_text.slice(0, start) + this.#m_text.slice(end);
    	this.#m_cursorPosition = start;
	    this.#m_selectionAnchor = start;
    	this.textChanged.emit(this.#m_text);
		this.#resetCursorBlink();
	    this.update();
    	return true;
    }

	#startCursorBlink(): void {
		this.#stopCursorBlink();
		this.#m_cursorVisible = true;
		this.#m_cursorTimer.start();
	}

	#stopCursorBlink(): void {
		this.#m_cursorTimer.stop();
		this.#m_cursorVisible = false;
	}

	#resetCursorBlink(): void {
		if (!this.hasFocus())
			return;
		this.#startCursorBlink();
	}
}