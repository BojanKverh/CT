import { previousWordPosition, nextWordPosition } from "../util/CTextWordBoundary.js";
import { textSelectionRange } from "../util/CTextSelection.js";
import { CAction } from "../core/CAction.js";
import { CMenu } from "./CMenu.js";
import type { CContextMenuEvent } from "../events/CContextMenuEvent.js";
import { CUndoCommand } from "../core/CUndoCommand.js";
import { CUndoStack } from "../core/CUndoStack.js";
import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CRect } from "../geometry/CRect.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CTimer } from "../core/CTimer.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CClipboard } from "../core/CClipboard.js";
import { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import { CValidator, CValidatorState } from "../util/CValidator.js";
import type { CCompleter } from "./CCompleter.js";

type CLineEditValidator = CValidator | ((text: string) => boolean);

type CLineEditState = { text: string; cursorPosition: number; selectionAnchor: number };
type CLineEditUndoGroup = "insert" | "backspace" | "delete" | null;

/** Internal snapshot command: the editor applies the initial edit after push(). */
class CLineEditUndoCommand extends CUndoCommand {
    #after: CLineEditState | null = null;
    constructor(
        private readonly before: CLineEditState,
        private readonly capture: () => CLineEditState,
        private readonly restore: (state: CLineEditState) => void,
        private readonly mergeKey: object | null
    ) { super("Edit text"); }

    override undo(): void {
        this.#after = this.capture();
        this.restore(this.before);
    }

    override redo(): void {
        if (this.#after !== null) this.restore(this.#after);
    }

    override id(): number { return this.mergeKey === null ? -1 : 1; }

    override mergeWith(command: CUndoCommand): boolean {
        return command instanceof CLineEditUndoCommand
            && this.mergeKey !== null && this.mergeKey === command.mergeKey;
    }
}

/** Implements the line edit widget. */
export class CLineEdit extends CWidget {
    #m_clipboardRequest = 0;

	/** Signal emitted when text changes. */
	readonly textChanged = new CSignal<[string]>();
	/** Signal emitted when the user edits text. */
	readonly textEdited = new CSignal<[string]>();
	/** Emitted only when undo availability changes. */
	readonly undoAvailable = new CSignal<[boolean]>();
	/** Emitted only when redo availability changes. */
	readonly redoAvailable = new CSignal<[boolean]>();

	/** Signal emitted when Enter or Return confirms acceptable input. */
	readonly returnPressed = new CSignal();
	
	#m_contextMenu: CMenu | null = null;
	#m_history = new CUndoStack(this);
	#m_undoGroup: CLineEditUndoGroup = null;
	#m_mergeKey: object | null = null;
	#m_text = "";
    #m_horizontalOffset = 0;
    #m_dragX = 0;
    #m_scrollTimer = new CTimer(this);
	#m_cursorPosition = 0;
    #m_selectionAnchor = 0;
	#m_selectingWithMouse = false;
	#m_cursorVisible = true;
	#m_cursorTimer = new CTimer(this);
	#m_validator: CLineEditValidator | null = null;
	#m_readOnly = false;
	#m_completer: CCompleter | null = null;
	#m_validationError = false;
	#m_placeholderText: string = '';

	/** Public editing finished member. */
	readonly editingFinished = new CSignal();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		this.#m_history.canUndoChanged.connect(value => this.undoAvailable.emit(value));
		this.#m_history.canRedoChanged.connect(value => this.redoAvailable.emit(value));

		this.#m_cursorTimer.setInterval(500);

		this.#m_cursorTimer.timeout.connect(() => {
			this.#m_cursorVisible = !this.#m_cursorVisible;
			this.update();
		});
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.#m_scrollTimer.setInterval(40);
        this.#m_scrollTimer.timeout.connect(() => this.#scrollMouseSelection());
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_text;
	}

    /** Horizontal displacement of the text, in pixels. */
    horizontalOffset(): number {
        this.#ensureCursorVisible();
        return this.#m_horizontalOffset;
    }

	setPlaceholderText(text: string): void {
		this.#m_placeholderText = text;
		this.update();
	}

	placeholderText(): string {
		return this.#m_placeholderText;
	}

    #ensureCursorVisible(): void {
        const metrics = new CFontMetrics(this.font());
        const available = Math.max(0, this.width() - 11);
        const cursor = metrics.textWidth(this.#m_text.slice(0, this.#m_cursorPosition));
        const maximum = Math.max(0, metrics.textWidth(this.#m_text) - available);
        let offset = Math.min(this.#m_horizontalOffset, maximum);
        if (cursor < offset) offset = cursor;
        if (cursor > offset + available) offset = cursor - available;
        this.#m_horizontalOffset = Math.max(0, Math.min(offset, maximum));
    }

    #scrollMouseSelection(): void {
        if (!this.#m_selectingWithMouse) return;
        const direction = this.#m_dragX < 5 ? -1
            : this.#m_dragX > this.width() - 6 ? 1 : 0;
        if (direction === 0) {
            this.#m_scrollTimer.stop();
            return;
        }
        const previous = this.#m_cursorPosition;
        this.#moveCursor(previous + direction, true);
        if (this.#m_cursorPosition === previous)
            this.#m_scrollTimer.stop();
    }

	/** Sets the text. */
	setText(text: string): void {
		this.#m_history.clear();
		this.#breakUndoGroup();
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
			this.#breakUndoGroup();
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

	/** Returns whether the editor is marked as containing invalid data. */
	hasValidationError(): boolean {
		return this.#m_validationError;
	}

	/** Controls the visual validation-error marker. */
	setValidationError(error: boolean = true): void {
		if (error === this.#m_validationError)
			return;

		this.#m_validationError = error;
		this.update();
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
		this.#insert(text, null);
	}

	#insert(text: string, group: CLineEditUndoGroup): void {
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

		this.#pushUndoState(this.hasSelection() ? null : group);
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
		this.#breakUndoGroup();
	    const length = this.#m_text.length;
    	this.#m_selectionAnchor = Math.max(0, Math.min(anchor, length));
    	this.#m_cursorPosition = Math.max(0, Math.min(position, length));
	    this.update();
    }

    /** Selects the entire text. */
    selectAll(): void {
        this.setSelection(0, this.#m_text.length);
    }

    /** Clears selection. */
    clearSelection(): void {
		this.#breakUndoGroup();
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
	
    /** Reads the system clipboard for a user-invoked Paste command. */
    async pasteFromSystem(): Promise<void> {
        if (this.isReadOnly() || !this.isEnabled()) return;
        const request = ++this.#m_clipboardRequest;
        const text = await CClipboard.instance().readSystemText();
        if (text === null || text.length === 0 || request !== this.#m_clipboardRequest ||
            this.isReadOnly() || !this.isEnabled()) return;
        this.insert(text);
    }

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(this);

		this.style().drawLineEdit(painter, option);

		if (this.#m_validationError) {
			painter.save();
			painter.setStrokeStyle("#d32f2f");
			painter.setLineWidth(2);
			painter.strokeRect(new CRect(1, 1,
				Math.max(0, this.width() - 2), Math.max(0, this.height() - 2)));
			painter.restore();
		}
	}

    /** Handles the key press event. */
    protected override keyPressEvent(event: CKeyEvent): void {
		if (this.#m_completer?.handleKeyEvent(event) === true)
			return;

		/** Provides if behavior. */
		if (event.ctrl()) {
			/** Provides switch behavior. */
			switch (event.key().toLowerCase()) {

            case "arrowleft":
                this.#moveCursor(previousWordPosition(this.#m_text,
                    this.#m_cursorPosition), event.shift());
                event.accept();
                return;
            case "arrowright":
                this.#moveCursor(nextWordPosition(this.#m_text,
                    this.#m_cursorPosition), event.shift());
                event.accept();
                return;
            case "backspace":
                this.#deleteWord(-1);
                event.accept();
                return;
            case "delete":
                this.#deleteWord(1);
                event.accept();
                return;

			case "a":
                this.selectAll();
                event.accept();
                return;
            case "z":
                if (event.shift()) this.redo(); else this.undo();
                event.accept();
                return;
            case "y":
                this.redo();
                event.accept();
                return;
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
			this.#breakUndoGroup();
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
				this.#pushUndoState("backspace");
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
				this.#pushUndoState("delete");
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
	    if (event.key().length === 1 && !event.ctrl() && !event.alt()) {
		    this.#insert(event.key(), "insert");
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

		if (event.clickCount() >= 2) {
            this.#selectMouseText(event, event.clickCount() >= 3);
            return;
        }
        this.#breakUndoGroup();
        const position = this.cursorPositionAt(event.x());
		this.#m_cursorPosition = position;
		this.#m_selectionAnchor = position;
		this.#m_selectingWithMouse = true;
        this.#resetCursorBlink();

		event.accept();
		this.update();
	}

    protected override mouseDoubleClickEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) {
            event.ignore();
            return;
        }
        this.#selectMouseText(event, event.clickCount() >= 3);
    }

    #selectMouseText(event: CMouseEvent, paragraph: boolean): void {
        this.#m_selectingWithMouse = false;
        this.#m_scrollTimer.stop();
        this.setFocus();
        const range = paragraph ? [0, this.#m_text.length] as const
            : textSelectionRange(this.#m_text, this.cursorPositionAt(event.x(), false));
        this.setSelection(range[0], range[1]);
        this.#resetCursorBlink();
        event.accept();
    }

	/** Handles the mouse move event. */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		this.#m_dragX = event.x();
        const position = this.cursorPositionAt(event.x());
        this.#moveCursor(position, true);
        if (event.x() < 5 || event.x() > this.width() - 6) {
            this.#scrollMouseSelection();
            this.#m_scrollTimer.start();
        } else {
            this.#m_scrollTimer.stop();
        }
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
        this.#m_scrollTimer.stop();
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
		this.#breakUndoGroup();
		this.#m_selectingWithMouse = false;
        this.#m_scrollTimer.stop();
		this.#stopCursorBlink();
		if (this.#m_contextMenu?.isOpen() !== true)
			this.editingFinished.emit();
		super.focusOutEvent(event);
	}

    private cursorPositionAt(x: number, nearest = true): number {
	    const fm = new CFontMetrics(this.font());
	    const textX = x - 5 + this.horizontalOffset();
	    /** Provides if behavior. */
	    if (textX <= 0)
		    return 0;
    	/** Provides for behavior. */
    	for (let i = 1; i <= this.#m_text.length; ++i) {
	    	const previousWidth = fm.textWidth(this.#m_text.slice(0, i - 1));
    		const width = fm.textWidth(this.#m_text.slice(0, i));
    		const middle = nearest ? (previousWidth + width) / 2 : width;
    		/** Provides if behavior. */
    		if (textX < middle)
	    		return i - 1;
	    }

	    return this.#m_text.length;
    }

    #moveCursor(position: number, keepAnchor: boolean): void {
		this.#breakUndoGroup();
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


    /** Deletes one word as an independent undo command. */
    #deleteWord(direction: -1 | 1): void {
        if (this.isReadOnly()) return;
        if (this.#deleteSelection()) return;
        const text = this.#m_text;
        const target = direction < 0
            ? previousWordPosition(text, this.#m_cursorPosition)
            : nextWordPosition(text, this.#m_cursorPosition);
        const start = Math.min(target, this.#m_cursorPosition);
        const end = Math.max(target, this.#m_cursorPosition);
        if (start === end) return;
        this.#pushUndoState();
        this.#m_text = text.slice(0, start) + text.slice(end);
        this.#m_cursorPosition = start;
        this.#m_selectionAnchor = start;
        this.textChanged.emit(this.#m_text);
        this.textEdited.emit(this.#m_text);
        this.#resetCursorBlink();
        this.update();
    }

    #deleteSelection(): boolean {
		/** Provides if behavior. */
		if (!this.hasSelection() || this.isReadOnly())
		    return false;
    	this.#pushUndoState();
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


    /** Returns whether an edit can be undone. */
    canUndo(): boolean { return this.#m_history.canUndo(); }

    /** Returns whether an undone edit can be restored. */
    canRedo(): boolean { return this.#m_history.canRedo(); }

    /** Restores the previous text, cursor and selection. */
    undo(): void {
        this.#breakUndoGroup();
        this.#m_history.undo();
        this.#m_completer?.hidePopup();
    }

    /** Reapplies the next edit, including its cursor and selection. */
    redo(): void {
        this.#breakUndoGroup();
        this.#m_history.redo();
        this.#m_completer?.hidePopup();
    }

    #currentState(): CLineEditState {
        return {
            text: this.#m_text,
            cursorPosition: this.#m_cursorPosition,
            selectionAnchor: this.#m_selectionAnchor
        };
    }

    #pushUndoState(group: CLineEditUndoGroup = null): void {
        if (group === null || group !== this.#m_undoGroup)
            this.#m_mergeKey = group === null ? null : {};
        this.#m_undoGroup = group;
        this.#m_history.push(new CLineEditUndoCommand(
            this.#currentState(), () => this.#currentState(),
            state => this.#restoreState(state), this.#m_mergeKey
        ));
    }

    #breakUndoGroup(): void {
        this.#m_undoGroup = null;
        this.#m_mergeKey = null;
    }

    #restoreState(state: CLineEditState): void {
        const changed = state.text !== this.#m_text;
        this.#m_text = state.text;
        this.#m_cursorPosition = state.cursorPosition;
        this.#m_selectionAnchor = state.selectionAnchor;
        this.#resetCursorBlink();
        this.update();
        if (changed) {
            this.textChanged.emit(this.#m_text);
            this.textEdited.emit(this.#m_text);
        }
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
        this.#ensureCursorVisible();
		/** Provides if behavior. */
		if (!this.hasFocus())
			return;
		this.#startCursorBlink();
	}


    /**
     * Creates a menu using the current editor state.
     * The caller owns the returned menu and must destroy it after use.
     */
    createStandardContextMenu(): CMenu {
        const menu = new CMenu();
        const editable = (): boolean => this.isEnabled() && !this.isReadOnly();
        const add = (text: string, available: () => boolean, execute: () => void): void => {
            const action = new CAction(text);
            action.setEnabled(available());
            action.triggered.connect(() => {
                if (available()) execute();
            });
            menu.addAction(action);
        };

        add("Undo", () => editable() && this.canUndo(), () => this.undo());
        add("Redo", () => editable() && this.canRedo(), () => this.redo());
        menu.addSeparator();
        add("Cut", () => editable() && this.hasSelection(), () => this.cut());
        add("Copy", () => this.isEnabled() && this.hasSelection(), () => this.copy());
        add("Paste", () => editable() && (CClipboard.instance().canReadSystemText() || CClipboard.instance().text().length > 0),
            () => {
                if (CClipboard.instance().canReadSystemText()) void this.pasteFromSystem();
                else this.paste();
            });
        menu.addSeparator();
        add("Select All", () => this.isEnabled() && this.text().length > 0
            && this.selectedText().length !== this.text().length, () => this.selectAll());
        return menu;
    }

    protected override contextMenuEvent(event: CContextMenuEvent): void {
        if (!this.isEnabled()) {
            event.ignore();
            return;
        }
        this.#disposeContextMenu();
        this.#m_completer?.hidePopup();
        const menu = this.createStandardContextMenu();
        this.#m_contextMenu = menu;
        menu.closed.connect(() => {
            if (this.#m_contextMenu !== menu) return;
            this.#m_contextMenu = null;
            menu.destroy();
            if (this.isEnabled() && this.isVisible()) this.setFocus();
        });
        event.accept();
        menu.exec(event.globalPos());
    }

    #disposeContextMenu(): void {
        const menu = this.#m_contextMenu;
        if (menu === null) return;
        this.#m_contextMenu = null;
        menu.close();
        menu.destroy();
    }

	/** Releases the completion association. */
	override destroy(): void {
        ++this.#m_clipboardRequest;
		this.#m_scrollTimer.stop();
        this.#disposeContextMenu();
		this.setCompleter(null);
		super.destroy();
	}
}
