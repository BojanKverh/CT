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
import { CClipboard } from "../core/CClipboard.js";
import { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import { CValidator, CValidatorState } from "../util/CValidator.js";
import type { CCompleter } from "./CCompleter.js";

type CLineEditValidator = CValidator | ((text: string) => boolean);

/** Implements the line edit widget. */
export class CLineEdit extends CWidget {
	/** Signal emitted when text changes. */
	readonly textChanged = new CSignal<[string]>();
	/** Signal emitted when the user edits text. */
	readonly textEdited = new CSignal<[string]>();

	/** Signal emitted when Enter or Return confirms acceptable input. */
	readonly returnPressed = new CSignal();
	
	#m_text = "";
	#m_cursorPosition = 0;
    #m_selectionAnchor = 0;
	#m_selectingWithMouse = false;
	#m_cursorVisible = true;
	#m_cursorTimer = new CTimer(this);
	#m_validator: CLineEditValidator | null = null;
	#m_readOnly = false;
	#m_completer: CCompleter | null = null;

	/** Public editing finished member. */
	readonly editingFinished = new CSignal();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_cursorTimer.setInterval(500);

		this.#m_cursorTimer.timeout.connect(() => {
			this.#m_cursorVisible = !this.#m_cursorVisible;
			this.update();
		});
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.#m_cursorPosition = text.length;
        this.#m_selectionAnchor = this.#m_cursorPosition;

		this.textChanged.emit(this.#m_text);
		this.update();
	}

	/** Sets the read only. */
	setReadOnly(readOnly: boolean = true): void {
		/** Provides if behavior. */
		if (readOnly !== this.#m_readOnly) {
			this.#m_readOnly = readOnly;
			this.update();
		}
	}

	/** Returns whether the read only condition is active. */
	isReadOnly(): boolean
	{
		return this.#m_readOnly;
	}

	/** Sets the validator. */
	setValidator(validator: CLineEditValidator | null): void {
		this.#m_validator = validator;
	}

	/** Returns the current validator. */
	validator(): CLineEditValidator | null {
		return this.#m_validator;
	}

	/** Returns the completer associated with this editor. */
	completer(): CCompleter | null {
		return this.#m_completer;
	}

	/** Associates a completer with this editor. */
	setCompleter(completer: CCompleter | null): void {
		if (completer === this.#m_completer)
			return;

		if (this.#m_completer?.widget() === this)
			this.#m_completer.setWidget(null);

		this.#m_completer = completer;
		completer?.setWidget(this);
	}

	/** Provides cursor behavior. */
	override cursor(): CCursorShape {
		return this.isEnabled()? CCursorShape.IBeam : CCursorShape.Disabled;
	}

	/** Provides cursor position behavior. */
	cursorPosition(): number {
		return this.#m_cursorPosition;
	}

    /** Sets the cursor position. */
    setCursorPosition(position: number): void {
	    this.#moveCursor(position, false);
    }

	/** Provides cursor visible behavior. */
	cursorVisible(): boolean {
		return this.#m_cursorVisible;
	}

	/** Inserts . */
	insert(text: string): void {
		/** Provides if behavior. */
		if (text.length === 0 || this.isReadOnly())
			return;
		const start = this.hasSelection()? this.selectionStart() : this.#m_cursorPosition;
		const end = this.hasSelection()? this.selectionEnd() : this.#m_cursorPosition;
		const newText = this.#m_text.slice(0, start) + text
			+ this.#m_text.slice(end);

		/** Provides if behavior. */
		if (!this.#isValidInput(newText))
			return;

		this.#m_text = newText;
		this.#m_cursorPosition = start + text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.textChanged.emit(this.#m_text);
		this.textEdited.emit(this.#m_text);
		this.#resetCursorBlink();
		this.update();
	}

	#isValidInput(text: string): boolean {
		if (this.#m_validator === null)
			return true;

		if (typeof this.#m_validator === "function")
			return this.#m_validator(text);

		return this.#m_validator.validate(text) !== CValidatorState.Invalid;
	}

	#isAcceptableInput(text: string): boolean {
		if (this.#m_validator === null)
			return true;

		if (typeof this.#m_validator === "function")
			return this.#m_validator(text);

		return this.#m_validator.validate(text) === CValidatorState.Acceptable;
	}

    /** Provides selection start behavior. */
    selectionStart(): number {
	    return Math.min(this.#m_selectionAnchor, this.#m_cursorPosition);
    }

    /** Provides selection end behavior. */
    selectionEnd(): number {
	    return Math.max(this.#m_selectionAnchor, this.#m_cursorPosition);
    }

    /** Returns whether this object has selection. */
    hasSelection(): boolean {
	    return this.#m_selectionAnchor !== this.#m_cursorPosition;
    }

    /** Returns the selected text. */
    selectedText(): string {
	    /** Provides if behavior. */
	    if (!this.hasSelection())
		    return "";

	    return this.#m_text.slice(this.selectionStart(), this.selectionEnd());
    }

    /** Sets the selection. */
    setSelection(anchor: number, position: number): void {
	    const length = this.#m_text.length;
    	this.#m_selectionAnchor = Math.max(0, Math.min(anchor, length));
    	this.#m_cursorPosition = Math.max(0, Math.min(position, length));
	    this.update();
    }

    /** Clears selection. */
    clearSelection(): void {
	    this.#m_selectionAnchor = this.#m_cursorPosition;
    }

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(160, 28);
	}

	/** Provides copy behavior. */
	copy(): void {
		/** Provides if behavior. */
		if (!this.hasSelection())
			return;

		CClipboard.instance().setText(this.selectedText());
	}

	/** Provides cut behavior. */
	cut(): void {
		/** Provides if behavior. */
		if (!this.hasSelection())
			return;

		CClipboard.instance().setText(this.selectedText());

		/** Provides if behavior. */
		if (this.isReadOnly())
			return;

		this.#deleteSelection();
	}

	/** Provides paste behavior. */
	paste(): void {
		/** Provides if behavior. */
		if (this.isReadOnly())
			return;

		const text = CClipboard.instance().text();

		/** Provides if behavior. */
		if (text.length === 0)
			return;

		this.insert(text);
	}
	
	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(this);

		this.style().drawLineEdit(painter, option);
	}

    /** Handles the key press event. */
    protected override keyPressEvent(event: CKeyEvent): void {
		if (this.#m_completer?.handleKeyEvent(event) === true)
			return;

		/** Provides if behavior. */
		if (event.ctrl()) {
			/** Provides switch behavior. */
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

	    /** Provides switch behavior. */
	    switch (event.key()) {
		case "Enter":
		case "Return":
			if (!this.#isAcceptableInput(this.#m_text)) {
				event.ignore();
				return;
			}
			this.returnPressed.emit();
			this.editingFinished.emit();
			event.accept();
			return;

        case "ArrowLeft":
	        this.#moveCursor(this.#m_cursorPosition - 1, event.shift());
	        event.accept();
	        return;

        case "ArrowRight":
	        this.#moveCursor(this.#m_cursorPosition + 1, event.shift());
	        event.accept();
	        return;

        case "Backspace":
			/** Provides if behavior. */
			if (this.isReadOnly()) {
				event.accept();
				return;
			}
	        /** Provides if behavior. */
	        if (this.#deleteSelection()) {
		        event.accept();
		        return;
	        }

	        /** Provides if behavior. */
	        if (this.#m_cursorPosition > 0) {
		        this.#m_text = this.#m_text.slice(0, this.#m_cursorPosition - 1)
			        + this.#m_text.slice(this.#m_cursorPosition);
        		--this.#m_cursorPosition;
		        this.#m_selectionAnchor = this.#m_cursorPosition;
				this.textChanged.emit(this.#m_text);
				this.textEdited.emit(this.#m_text);
				this.#resetCursorBlink();
		        this.update();
	        }

	        event.accept();
	        return;

        case "Delete":
			/** Provides if behavior. */
			if (this.isReadOnly()) {
				event.accept();
				return;
			}
	        /** Provides if behavior. */
	        if (this.#deleteSelection()) {
		        event.accept();
		        return;
	        }
            
        	/** Provides if behavior. */
        	if (this.#m_cursorPosition < this.#m_text.length) {
		        this.#m_text = this.#m_text.slice(0, this.#m_cursorPosition)
			        + this.#m_text.slice(this.#m_cursorPosition + 1);
		        this.#m_selectionAnchor = this.#m_cursorPosition;
				this.textChanged.emit(this.#m_text);
				this.textEdited.emit(this.#m_text);
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

	    /** Provides if behavior. */
	    if (event.key().length === 1) {
		    this.insert(event.key());
		    event.accept();
		    return;
	    }
    	event.ignore();
    }

    /** Handles the mouse press event. */
    protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
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

	/** Handles the mouse move event. */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		const position = this.cursorPositionAt(event.x());

		this.#moveCursor(position, true);
		event.accept();
	}

	/** Handles the mouse release event. */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		this.#m_selectingWithMouse = false;
		const position = this.cursorPositionAt(event.x());
		this.#moveCursor(position, true);

		event.accept();
	}

	/** Handles the focus in event. */
	protected override focusInEvent(event: CFocusEvent): void {
		this.#startCursorBlink();
		event.accept();
		this.update();
	}

	/** Handles the focus out event. */
	protected override focusOutEvent(event: CFocusEvent): void {
		this.#m_selectingWithMouse = false;
		this.#stopCursorBlink();
		this.editingFinished.emit();
		super.focusOutEvent(event);
	}

    private cursorPositionAt(x: number): number {
	    const fm = new CFontMetrics(this.font());
	    const textX = x - 5;
	    /** Provides if behavior. */
	    if (textX <= 0)
		    return 0;
    	/** Provides for behavior. */
    	for (let i = 1; i <= this.#m_text.length; ++i) {
	    	const previousWidth = fm.textWidth(this.#m_text.slice(0, i - 1));
    		const width = fm.textWidth(this.#m_text.slice(0, i));
    		const middle = (previousWidth + width) / 2;
    		/** Provides if behavior. */
    		if (textX < middle)
	    		return i - 1;
	    }

	    return this.#m_text.length;
    }

    #moveCursor(position: number, keepAnchor: boolean): void {
	    const clamped = Math.max(0, Math.min(position, this.#m_text.length));
    	/** Provides if behavior. */
    	if (this.#m_cursorPosition === clamped && (keepAnchor || this.#m_selectionAnchor === clamped))
		    return;
    	this.#m_cursorPosition = clamped;
    	/** Provides if behavior. */
    	if (!keepAnchor)
	    	this.#m_selectionAnchor = clamped;
		this.#resetCursorBlink();
	    this.update();
    }

    #deleteSelection(): boolean {
		/** Provides if behavior. */
		if (!this.hasSelection() || this.isReadOnly())
		    return false;
    	const start = this.selectionStart();
	    const end = this.selectionEnd();
    	this.#m_text = this.#m_text.slice(0, start) + this.#m_text.slice(end);
    	this.#m_cursorPosition = start;
	    this.#m_selectionAnchor = start;
    	this.textChanged.emit(this.#m_text);
		this.textEdited.emit(this.#m_text);
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
		/** Provides if behavior. */
		if (!this.hasFocus())
			return;
		this.#startCursorBlink();
	}

	/** Releases the completion association. */
	override destroy(): void {
		this.setCompleter(null);
		super.destroy();
	}
}
