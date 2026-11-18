import { previousWordPosition, nextWordPosition, previousGraphemePosition, nextGraphemePosition } from "../util/CTextWordBoundary.js";
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
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import { CValidator, CValidatorState } from "../util/CValidator.js";
import type { CCompleter } from "./CCompleter.js";

/** Controls how a line editor displays its stored text. */
export enum CEchoMode {
    Normal,
    Password,
    NoEcho
}

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

    /** Captures the current editor state for redo and restores the state before the edit. */
    override undo(): void {
        this.#after = this.capture();
        this.restore(this.before);
    }

    /** Restores the editor state captured by undo, if one exists. */
    override redo(): void {
        if (this.#after !== null) this.restore(this.#after);
    }

    /**
     * Reads the id of the line edit undo command.
     * @returns The id.
     */
    override id(): number { return this.mergeKey === null ? -1 : 1; }

    /**
     * Checks whether an incoming command belongs to the same line-edit undo group.
     * @param command Incoming undo command to compare.
     * @returns `true` if both are line-edit commands sharing the same non-null merge key.
     */
    override mergeWith(command: CUndoCommand): boolean {
        return command instanceof CLineEditUndoCommand
            && this.mergeKey !== null && this.mergeKey === command.mergeKey;
    }
}

/** Implements the line edit widget. */
export class CLineEdit extends CWidget {
    #m_clipboardRequest = 0;
    #m_maxLength = Number.POSITIVE_INFINITY;
    #m_echoMode = CEchoMode.Normal;
    #m_clearButtonEnabled = false;
    #m_clearButtonPressed = false;

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
	#m_mouseX = 0;
	#m_mouseY = 0;
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

	/**
	 * Reads the text.
	 * @returns The text.
	 */
	text(): string {
		return this.#m_text;
	}

    /**
     * Returns the current text display mode.
     * @returns The echo mode.
     */
    echoMode(): CEchoMode { return this.#m_echoMode; }

    /**
     * Changes display only; stored text and undo history are preserved.
     * @param mode Mode.
     */
    setEchoMode(mode: CEchoMode): void {
        if (mode === this.#m_echoMode) return;
        this.#breakUndoGroup();
        this.#m_echoMode = mode;
        this.#m_horizontalOffset = 0;
        if (this.#m_completer !== null) {
            this.#m_completer.hidePopup();
            this.#m_completer.setWidget(mode === CEchoMode.Normal ? this : null);
        }
        this.update();
    }

    /**
     * Computes what is shown without changing the stored text.
     * @returns Original text in normal mode, one bullet per UTF-16 code unit in password mode, or an empty string in no-echo mode.
     */
    displayText(): string {
        if (this.#m_echoMode === CEchoMode.NoEcho) return "";
        if (this.#m_echoMode === CEchoMode.Password) return "•".repeat(this.#m_text.length);
        return this.#m_text;
    }

    /**
     * Whether selected text may be exported to either clipboard.
     * @returns `true` if the line edit can copy, otherwise `false`.
     */
    canCopy(): boolean { return this.#m_echoMode === CEchoMode.Normal && this.hasSelection(); }

    /**
     * Maximum UTF-16 length; Infinity means unlimited.
     * @returns The max length.
     */
    maxLength(): number { return this.#m_maxLength; }

    /**
     * Limits future input and truncates existing text when necessary.
     * Lowering the limit clears undo/redo so older states cannot exceed it.
     * @param length Length.
     */
    setMaxLength(length: number): void {
        if (Number.isNaN(length) || length === Number.NEGATIVE_INFINITY) return;
        const maximum = Math.max(0, Math.floor(length));
        if (maximum === this.#m_maxLength) return;
        const lowered = maximum < this.#m_maxLength;
        this.#m_maxLength = maximum;
        this.#breakUndoGroup();
        if (this.#m_text.length > maximum) {
            this.setText(this.#truncateToLength(this.#m_text, maximum));
        } else if (lowered) {
            this.#m_history.clear();
        }
    }

    #truncateToLength(text: string, maximum: number): string {
        if (text.length <= maximum) return text;
        let end = maximum;
        // Never leave half of a supplementary Unicode character at the boundary.
        if (end > 0 && text.charCodeAt(end - 1) >= 0xd800 && text.charCodeAt(end - 1) <= 0xdbff
            && text.charCodeAt(end) >= 0xdc00 && text.charCodeAt(end) <= 0xdfff) --end;
        return text.slice(0, end);
    }

    /**
     * Horizontal displacement of the text, in pixels.
     * @returns The horizontal offset.
     */
    horizontalOffset(): number {
        this.#ensureCursorVisible();
        return this.#m_horizontalOffset;
    }

	/**
	 * Changes the hint displayed when the editor is empty.
	 * @param text Placeholder text, or an empty string to clear it.
	 */
	setPlaceholderText(text: string): void {
		this.#m_placeholderText = text;
		this.update();
	}

	/**
	 * Reads the placeholder text.
	 * @returns The placeholder text.
	 */
	placeholderText(): string {
		return this.#m_placeholderText;
	}

    /**
     * Returns whether the optional clear button is enabled.
     * @returns `true` if the line edit is clear button enabled, otherwise `false`.
     */
    isClearButtonEnabled(): boolean {
        return this.#m_clearButtonEnabled;
    }

    /**
     * Shows a clear button for nonempty, editable text.
     * @param enabled Whether to enable the feature.
     */
    setClearButtonEnabled(enabled: boolean): void {
        if (enabled === this.#m_clearButtonEnabled) return;
        this.#m_clearButtonEnabled = enabled;
        this.#m_clearButtonPressed = false;
        this.update();
    }

    #clearButtonWidth(): number {
        return this.#m_clearButtonEnabled && this.#m_text.length > 0
            && !this.isReadOnly() && this.width() >= 34 && this.height() >= 16 ? 24 : 0;
    }

    #textRight(): number {
        return this.width() - 6 - this.#clearButtonWidth();
    }

    #inClearButton(event: CMouseEvent): boolean {
        const width = this.#clearButtonWidth();
        return width > 0 && event.x() >= this.width() - width - 1
            && event.x() < this.width() - 1 && event.y() >= 1 && event.y() < this.height() - 1;
    }

    #clearFromButton(): void {
        if (!this.isEnabled() || this.#clearButtonWidth() === 0) return;
        this.#pushUndoState();
        this.#m_text = "";
        this.#m_cursorPosition = 0;
        this.#m_selectionAnchor = 0;
        this.#m_horizontalOffset = 0;
        this.textChanged.emit("");
        this.textEdited.emit("");
        this.#m_completer?.hidePopup();
        this.#resetCursorBlink();
        this.update();
    }

    #paintClearButton(painter: CPainter): void {
        const width = this.#clearButtonWidth();
        if (width === 0) return;
        const rect = new CRect(this.width() - width - 1, 1, width, this.height() - 2);
        const palette = this.palette();
        painter.save();
        painter.clipRect(rect);
        // Erase text, selection and caret underneath the complete button area.
        painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
        painter.fillRect(rect);
        const bg = palette.color(this.isEnabled()
            ? CPaletteColorRole.PlaceholderText : CPaletteColorRole.DisabledText).toCss();
        painter.setBrush(bg);
		const ctr = rect.center();
		const r = Math.min(rect.width(), rect.height()) / 2 - 4;
        painter.fillEllipse(ctr.x(), ctr.y(), r, r);
        painter.setPen(palette.color(CPaletteColorRole.Base).toCss());
        painter.setLineWidth(this.#m_clearButtonPressed ? 3 : 2);
        const x = rect.x() + width / 2;
        const y = this.height() / 2;
        painter.drawLine(x - 4, y - 4, x + 4, y + 4);
        painter.drawLine(x - 4, y + 4, x + 4, y - 4);
        painter.restore();
    }

    #ensureCursorVisible(): void {
        const metrics = new CFontMetrics(this.font());
        const available = Math.max(0, this.#textRight() - 5);
        const display = this.displayText();
        const cursor = metrics.textWidth(display.slice(0, this.#m_cursorPosition));
        const maximum = Math.max(0, metrics.textWidth(display) - available);
        let offset = Math.min(this.#m_horizontalOffset, maximum);
        if (cursor < offset) offset = cursor;
        if (cursor > offset + available) offset = cursor - available;
        this.#m_horizontalOffset = Math.max(0, Math.min(offset, maximum));
    }

    #scrollMouseSelection(): void {
        if (!this.#m_selectingWithMouse) return;
        const direction = this.#m_dragX < 5 ? -1
            : this.#m_dragX > this.#textRight() ? 1 : 0;
        if (direction === 0) {
            this.#m_scrollTimer.stop();
            return;
        }
        const previous = this.#m_cursorPosition;
        this.#moveCursor(previous + direction, true);
        if (this.#m_cursorPosition === previous)
            this.#m_scrollTimer.stop();
    }

	/**
	 * Replaces the line contents, clears undo history and moves the cursor to the end if the text changed.
	 * @param text New text, truncated to the configured maximum length.
	 */
	setText(text: string): void {
        text = this.#truncateToLength(text, this.#m_maxLength);
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

	/**
	 * Sets the read only.
	 * @param readOnly Read only flag. Defaults to `true`.
	 */
	setReadOnly(readOnly: boolean = true): void {
		/** Provides if behavior. */
		if (readOnly !== this.#m_readOnly) {
			this.#breakUndoGroup();
			this.#m_readOnly = readOnly;
			this.update();
		}
	}

	/**
	 * Checks whether the line edit is read only.
	 * @returns `true` if the line edit is read only, otherwise `false`.
	 */
	isReadOnly(): boolean
	{
		return this.#m_readOnly;
	}

	/**
	 * Sets the validator.
	 * @param validator Validator.
	 */
	setValidator(validator: CLineEditValidator | null): void {
		this.#m_validator = validator;
	}

	/**
	 * Returns the current validator.
	 * @returns The validator.
	 */
	validator(): CLineEditValidator | null {
		return this.#m_validator;
	}

	/**
	 * Returns whether the editor is marked as containing invalid data.
	 * @returns `true` if the line edit has validation error, otherwise `false`.
	 */
	hasValidationError(): boolean {
		return this.#m_validationError;
	}

	/**
	 * Controls the visual validation-error marker.
	 * @param error Error flag. Defaults to `true`.
	 */
	setValidationError(error: boolean = true): void {
		if (error === this.#m_validationError)
			return;

		this.#m_validationError = error;
		this.update();
	}

	/**
	 * Returns the completer associated with this editor.
	 * @returns The completer.
	 */
	completer(): CCompleter | null {
		return this.#m_completer;
	}

	/**
	 * Associates a completer with this editor.
	 * @param completer Completer.
	 */
	setCompleter(completer: CCompleter | null): void {
		if (completer === this.#m_completer)
			return;

		if (this.#m_completer?.widget() === this)
			this.#m_completer.setWidget(null);

		this.#m_completer = completer;
		completer?.setWidget(this.#m_echoMode === CEchoMode.Normal ? this : null);
	}

	/**
	 * Reads the cursor of the line edit.
	 * @returns The cursor.
	 */
	override cursor(): CCursorShape {
 	   if (!this.isEnabled())
    	    return CCursorShape.Disabled;

    	const width = this.#clearButtonWidth();
    	const overClearButton = width > 0
        	&& this.#m_mouseX >= this.width() - width - 1
        	&& this.#m_mouseX < this.width() - 1
			&& this.#m_mouseY >= 1
			&& this.#m_mouseY < this.height() - 1;
    	return overClearButton? CCursorShape.Arrow : CCursorShape.IBeam;
	}

	/**
	 * Reads the cursor position.
	 * @returns The cursor position.
	 */
	cursorPosition(): number {
		return this.#m_cursorPosition;
	}

    /**
     * Sets the cursor position.
     * @param position Requested cursor offset in UTF-16 code units, clamped to the text bounds.
     */
    setCursorPosition(position: number): void {
	    this.#moveCursor(position, false);
    }

	/**
	 * Reads the current cursor blink state.
	 * @returns `true` if the cursor visibility flag is on.
	 */
	cursorVisible(): boolean {
		return this.#m_cursorVisible;
	}

	/**
	 * Inserts text at the cursor or replaces the selection. Read-only editors refuse the edit, and length and validation constraints still apply.
	 * @param text Nonempty text to insert.
	 */
	insert(text: string): void {
		this.#insert(text, null);
	}

    /**
     * Supplies text and selection information to the browser input bridge for an unmasked, editable plain line edit.
     * @returns Text and selection bounds in UTF-16 offsets, or `null` for a derived, read-only or masked editor.
     * @internal
     */
    nativeTextState(): { text: string; start: number; end: number } | null {
        if (this.constructor !== CLineEdit || this.isReadOnly() || this.#m_echoMode !== CEchoMode.Normal) return null;
        return { text: this.#m_text, start: this.selectionStart(), end: this.selectionEnd() };
    }

    /**
     * Replaces the reported range when native editing is available. Strips carriage returns and line feeds before applying the normal input constraints.
     * @param start Start UTF-16 offset, inclusive.
     * @param end End UTF-16 offset, exclusive.
     * @param text Replacement text supplied by the browser.
     * @internal
     */
    applyNativeTextUpdate(start: number, end: number, text: string): void {
        if (this.nativeTextState() === null || start < 0 || end < start || end > this.#m_text.length)
            return;
        this.#replaceInput(start, end, text.replace(/[\r\n]/g, ""), null);
    }

    #insert(text: string, group: CLineEditUndoGroup): void {
        if (text.length === 0) return;
        this.#replaceInput(this.selectionStart(), this.selectionEnd(), text, group);
    }

    #replaceInput(start: number, end: number, text: string, group: CLineEditUndoGroup): void {
        if (this.isReadOnly()) return;
        const remaining = this.#m_maxLength - (this.#m_text.length - (end - start));
        if (text.length !== 0) {
            text = this.#truncateToLength(text, remaining);
            if (text.length === 0) return;
        } else if (start === end) {
            return;
        }
		const newText = this.#m_text.slice(0, start) + text
			+ this.#m_text.slice(end);

		/** Provides if behavior. */
		if (!this.#isValidInput(newText))
			return;

		this.#pushUndoState(start !== end ? null : group);
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

    /**
     * Reads the selection start of the line edit.
     * @returns The selection start.
     */
    selectionStart(): number {
	    return Math.min(this.#m_selectionAnchor, this.#m_cursorPosition);
    }

    /**
     * Reads the selection end of the line edit.
     * @returns The selection end.
     */
    selectionEnd(): number {
	    return Math.max(this.#m_selectionAnchor, this.#m_cursorPosition);
    }

    /**
     * Returns whether this object has selection.
     * @returns `true` if the line edit has selection, otherwise `false`.
     */
    hasSelection(): boolean {
	    return this.#m_selectionAnchor !== this.#m_cursorPosition;
    }

    /**
     * Reads the text between the selection endpoints.
     * @returns Selected plain text, or an empty string when nothing is selected.
     */
    selectedText(): string {
	    /** Provides if behavior. */
	    if (!this.hasSelection())
		    return "";

	    return this.#m_text.slice(this.selectionStart(), this.selectionEnd());
    }

    /**
     * Sets the selection.
     * @param anchor Anchor.
     * @param position UTF-16 offset of the moving end of the selection.
     */
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

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize {
		return new CSize(160, 28);
	}

	/** Copies the selection into the toolkit clipboard when the echo mode and selection permit copying. */
	copy(): void {
		/** Provides if behavior. */
		if (!this.canCopy())
			return;

		CClipboard.instance().setText(this.selectedText());
	}

	/** Copies the selection if copying is permitted and deletes it only when the editor is writable. */
	cut(): void {
		/** Provides if behavior. */
		if (!this.canCopy())
			return;

		CClipboard.instance().setText(this.selectedText());

		/** Provides if behavior. */
		if (this.isReadOnly())
			return;

		this.#deleteSelection();
	}

	/** Inserts stored clipboard text at the cursor or replaces the selection. A read-only editor or empty clipboard leaves the text unchanged. */
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
	
    /**
     * Reads the system clipboard for a user-invoked Paste command.
     * @returns A promise that resolves when the operation completes.
     */
    async pasteFromSystem(): Promise<void> {
        if (this.isReadOnly() || !this.isEnabled()) return;
        const request = ++this.#m_clipboardRequest;
        const text = await CClipboard.instance().readSystemText();
        if (text === null || text.length === 0 || request !== this.#m_clipboardRequest ||
            this.isReadOnly() || !this.isEnabled()) return;
        this.insert(text);
    }

	/**
	 * Draws the line edit through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(this);
        option.text = this.displayText();
        if (this.#m_echoMode === CEchoMode.NoEcho) {
            option.cursorPosition = 0;
            option.selectionStart = 0;
            option.selectionEnd = 0;
            if (this.#m_text.length > 0) option.placeholderText = "";
        }

		this.style().drawLineEdit(painter, option);
        this.#paintClearButton(painter);

		if (this.#m_validationError) {
			painter.save();
			painter.setStrokeStyle("#d32f2f");
			painter.setLineWidth(2);
			painter.strokeRect(new CRect(1, 1,
				Math.max(0, this.width() - 2), Math.max(0, this.height() - 2)));
			painter.restore();
		}
	}

    /**
     * Responds to a key press for the line edit. May update the text, the cursor position, the selection anchor. May request a repaint and accept or ignore the event depending on the input. May emit `returnPressed`, `editingFinished`, `textChanged`, `textEdited`.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
		if (this.#m_echoMode === CEchoMode.Normal && this.#m_completer?.handleKeyEvent(event) === true)
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
	        this.#moveCursor(this.#previousCharacter(this.#m_cursorPosition), event.shift());
	        event.accept();
	        return;

        case "ArrowRight":
	        this.#moveCursor(this.#nextCharacter(this.#m_cursorPosition), event.shift());
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
		        const start = this.#previousCharacter(this.#m_cursorPosition);
                this.#m_text = this.#m_text.slice(0, start) + this.#m_text.slice(this.#m_cursorPosition);
                this.#m_cursorPosition = start;
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
			        + this.#m_text.slice(this.#nextCharacter(this.#m_cursorPosition));
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

    /**
     * Responds to a pointer button press for the line edit. May update the selecting with mouse, the clear button pressed, the cursor position, the selection anchor. May request focus and request a repaint and accept or ignore the event depending on the input.
     * @param event Event for a pointer button press.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        if (this.isEnabled() && this.#inClearButton(event)) {
            this.#m_selectingWithMouse = false;
            this.#m_scrollTimer.stop();
            this.#m_clearButtonPressed = true;
            this.setFocus();
            event.accept();
            this.update();
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

    /**
     * Responds to a double-click for the line edit. May mark the event ignored.
     * @param event Event for a double-click.
     */
    protected override mouseDoubleClickEvent(event: CMouseEvent): void {
        if (event.button() === CMouseButton.LeftButton && this.#inClearButton(event)) {
            this.mousePressEvent(event);
            return;
        }
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
        const range = paragraph || this.#m_echoMode !== CEchoMode.Normal ? [0, this.#m_text.length] as const
            : textSelectionRange(this.#m_text, this.cursorPositionAt(event.x(), false));
        this.setSelection(range[0], range[1]);
        this.#resetCursorBlink();
        event.accept();
    }

	/**
	 * Responds to pointer movement for the line edit. May update the mouse x, the mouse y, the drag x. May accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void {
        if (this.#m_clearButtonPressed) {
            event.accept();
            return;
        }
		this.#m_mouseX = event.x();
		this.#m_mouseY = event.y();

		/** Provides if behavior. */
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		this.#m_dragX = event.x();
        const position = this.cursorPositionAt(event.x());
        this.#moveCursor(position, true);
        if (event.x() < 5 || event.x() > this.#textRight()) {
            this.#scrollMouseSelection();
            this.#m_scrollTimer.start();
        } else {
            this.#m_scrollTimer.stop();
        }
		event.accept();
	}

	/**
	 * Responds to a pointer button release for the line edit. May update the clear button pressed, the selecting with mouse. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() === CMouseButton.LeftButton && this.#m_clearButtonPressed) {
            this.#m_clearButtonPressed = false;
            if (this.#inClearButton(event)) this.#clearFromButton();
            event.accept();
            this.update();
            return;
        }
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

	/**
	 * Responds to focus entry for the line edit. May accept the event and request a repaint.
	 * @param event Event for focus entry.
	 */
	protected override focusInEvent(event: CFocusEvent): void {
		this.#startCursorBlink();
		event.accept();
		this.update();
	}

	/**
	 * Responds to focus exit for the line edit. May update the clear button pressed, the selecting with mouse. May emit `editingFinished`.
	 * @param event Event for focus exit.
	 */
	protected override focusOutEvent(event: CFocusEvent): void {
        this.#m_clearButtonPressed = false;
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
        if (this.#m_echoMode === CEchoMode.NoEcho) return this.#m_text.length;
        const display = this.displayText();
	    const textX = x - 5 + this.horizontalOffset();
	    /** Provides if behavior. */
	    if (textX <= 0)
		    return 0;
    	/** Provides for behavior. */
    	for (let start = 0; start < this.#m_text.length;) {
            const i = this.#nextCharacter(start);
            const previousWidth = fm.textWidth(display.slice(0, start));
    		const width = fm.textWidth(display.slice(0, i));
    		const middle = nearest ? (previousWidth + width) / 2 : width;
    		/** Provides if behavior. */
    		if (textX < middle)
	    		return start;
            start = i;
	    }

	    return this.#m_text.length;
    }

    #nextCharacter(position: number): number {
        return nextGraphemePosition(this.#m_text, position);
    }

    #previousCharacter(position: number): number {
        return previousGraphemePosition(this.#m_text, position);
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


    /**
     * Returns whether an edit can be undone.
     * @returns `true` if the line edit can undo, otherwise `false`.
     */
    canUndo(): boolean { return this.#m_history.canUndo(); }

    /**
     * Returns whether an undone edit can be restored.
     * @returns `true` if the line edit can redo, otherwise `false`.
     */
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
     * @returns The new `CMenu` instance.
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
        add("Cut", () => editable() && this.canCopy(), () => this.cut());
        add("Copy", () => this.isEnabled() && this.canCopy(), () => this.copy());
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

    /**
     * Responds to a context menu request for the line edit. May update the context menu. May accept or ignore the event depending on the input.
     * @param event Event for a context menu request.
     */
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
