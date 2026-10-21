import { previousWordPosition, nextWordPosition } from "../util/CTextWordBoundary.js";
import { textSelectionRange } from "../util/CTextSelection.js";
import { CAction } from "../core/CAction.js";
import { CMenu } from "./CMenu.js";
import type { CContextMenuEvent } from "../events/CContextMenuEvent.js";
import { CUndoCommand } from "../core/CUndoCommand.js";
import { CUndoStack } from "../core/CUndoStack.js";
import { CSignal } from "../core/CSignal.js";
import { CTimer } from "../core/CTimer.js";
import { CScrollArea } from "./CScrollArea.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import {
	CMouseButton,
	CMouseEvent
} from "../events/CMouseEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CFont } from "../gui/CFont.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CTextDocument } from "../gui/CTextDocument.js";
import { CTextCharFormat } from "../gui/CTextCharFormat.js";
import { CClipboard } from "../core/CClipboard.js";

type CTextEditState = {
	document: CTextDocument;
	cursorPosition: number;
	selectionAnchor: number;
	currentCharFormat: CTextCharFormat;
};

type CTextEditUndoGroup =
	| "insert"
	| "backspace"
	| "delete"
	| null;

type CTextEditLineLayout = {
	text: string;
	start: number;
	y: number;
	height: number;
};

type CParsedHtmlRange = {
	start: number;
	length: number;
	format: CTextCharFormat;
};

type CParsedHtml = {
	plainText: string;
	ranges: CParsedHtmlRange[];
};

class CTextEditContentWidget extends CWidget {
	#m_textEdit: CTextEdit;

	constructor(textEdit: CTextEdit) {
		super();

		this.setFocusPolicy(CFocusPolicy.NoFocus);
		this.#m_textEdit = textEdit;
	}

	override cursor(): CCursorShape {
		return this.#m_textEdit.cursor();
	}

	protected override paintEvent(painter: CPainter): void {
		this.#m_textEdit.paintText(painter);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		this.#m_textEdit.handleMousePress(event);
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
        this.#m_textEdit.handleMouseMove(event);
    }

    protected override mouseDoubleClickEvent(event: CMouseEvent): void {
        this.#m_textEdit.handleMouseDoubleClick(event);
    }

	protected override mouseReleaseEvent(event: CMouseEvent): void {
        this.#m_textEdit.handleMouseRelease(event);
    }

    protected override contextMenuEvent(event: CContextMenuEvent): void {
        this.#m_textEdit.handleContextMenu(event);
    }
}


/** Internal snapshot command: the editor applies the initial edit after push(). */
class CTextEditUndoCommand extends CUndoCommand {
    #after: CTextEditState | null = null;
    constructor(
        private readonly before: CTextEditState,
        private readonly capture: () => CTextEditState,
        private readonly restore: (state: CTextEditState) => void,
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
        return command instanceof CTextEditUndoCommand
            && this.mergeKey !== null && this.mergeKey === command.mergeKey;
    }
}

/** Implements the text edit widget. */
export class CTextEdit extends CScrollArea {
    #m_clipboardRequest = 0;

	/** Signal emitted when text changes. */
	readonly textChanged = new CSignal<[]>();
	/** Signal emitted when selection changes. */
	readonly selectionChanged = new CSignal<[]>();
	/** Emitted only when undo availability changes. */
	readonly undoAvailable = new CSignal<[boolean]>();
	/** Emitted only when redo availability changes. */
	readonly redoAvailable = new CSignal<[boolean]>();

	#m_document = new CTextDocument();
	#m_cursorPosition = 0;
	#m_selectionAnchor = 0;
	#m_selectingWithMouse = false;
	#m_dragViewportX = 0;
	#m_dragViewportY = 0;
	#m_selectionScrollTimer = new CTimer(this);
	#m_readOnly = false;
	#m_currentCharFormat = new CTextCharFormat();
	#m_contextMenu: CMenu | null = null;
	#m_history = new CUndoStack(this);
	#m_mergeKey: object | null = null;
	#m_restoringHistory = false;
	#m_undoGroup: CTextEditUndoGroup = null;

	#m_cursorVisible = true;
	#m_cursorTimer = new CTimer(this);

	#m_contentWidget: CTextEditContentWidget;

	static readonly #TEXT_MARGIN = 5;
	static readonly #LINE_HEIGHT = 18;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_contentWidget = new CTextEditContentWidget(this);
		this.#m_history.canUndoChanged.connect(value => this.undoAvailable.emit(value));
		this.#m_history.canRedoChanged.connect(value => this.redoAvailable.emit(value));
		this.setWidget(this.#m_contentWidget);

		this.#m_cursorTimer.setInterval(500);
		this.#m_selectionScrollTimer.setInterval(40);
		this.#m_selectionScrollTimer.timeout.connect(() => this.#scrollMouseSelection());
		this.#m_cursorTimer.timeout.connect(() => {
			this.#m_cursorVisible = !this.#m_cursorVisible;
			this.#m_contentWidget.update();
		});

		this.verticalScrollBar().setSingleStep(
			CTextEdit.#LINE_HEIGHT
		);

		this.horizontalScrollBar().setSingleStep(
			CTextEdit.#LINE_HEIGHT
		);

		this.#updateContentGeometry();
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/** Provides to plain text behavior. */
	toPlainText(): string {
		return this.#m_document.toPlainText();
	}

	/** Provides to html behavior. */
	toHtml(): string {
		const text = this.#m_document.toPlainText();

		/** Provides if behavior. */
		if (text.length === 0)
			return "";

		let html = "";

		/** Provides for behavior. */
		for (const range of this.#m_document.formatRanges()) {
			const start = range.start;
			const end = range.start + range.length;
			const fragment = text.slice(start, end);

			/** Provides if behavior. */
			if (fragment.length === 0)
				continue;

			html += this.#formatHtmlFragment(
				fragment,
				range.format
			);
		}

		return html;
	}

	/** Sets the html. */
	setHtml(html: string): void {
		const parsed = this.#parseHtml(html);
		const hadSelection = this.hasSelection();

		this.#m_history.clear();
		this.#breakUndoGroup();

		this.#m_document.setPlainText(parsed.plainText);

		/** Provides for behavior. */
		for (const range of parsed.ranges) {
			/** Provides if behavior. */
			if (range.length <= 0)
				continue;

			this.#m_document.setCharFormat(
				range.start,
				range.length,
				range.format
			);
		}

		this.#m_cursorPosition = parsed.plainText.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.#syncCurrentCharFormatFromCursor();

		this.textChanged.emit();

		/** Provides if behavior. */
		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	/** Sets the plain text. */
	setPlainText(text: string): void {
		this.#m_history.clear();
		this.#breakUndoGroup();
		/** Provides if behavior. */
		if (this.#m_document.toPlainText() === text)
			return;

		const hadSelection = this.hasSelection();

		this.#m_document.setPlainText(text);
		this.#m_cursorPosition = text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.#syncCurrentCharFormatFromCursor();

		this.textChanged.emit();

		/** Provides if behavior. */
		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	/** Clears the current contents. */
	clear(): void {
		/** Provides if behavior. */
		if (this.#m_document.length() === 0)
			return;

		this.#pushUndoState();

		const hadSelection = this.hasSelection();

		this.#m_document.clear();
		this.#m_cursorPosition = 0;
		this.#m_selectionAnchor = 0;
		this.#m_currentCharFormat = new CTextCharFormat();

		this.textChanged.emit();

		/** Provides if behavior. */
		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	/** Returns whether the read only condition is active. */
	isReadOnly(): boolean {
		return this.#m_readOnly;
	}

	/** Sets the read only. */
	setReadOnly(readOnly: boolean = true): void {
		/** Provides if behavior. */
		if (this.#m_readOnly === readOnly)
			return;

		this.#breakUndoGroup();
		this.#m_readOnly = readOnly;
		this.#m_contentWidget.update();
	}

	/** Provides cursor behavior. */
	override cursor(): CCursorShape {
		return this.isEnabled()
			? CCursorShape.IBeam
			: CCursorShape.Disabled;
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

	/** Provides selection start behavior. */
	selectionStart(): number {
		return Math.min(
			this.#m_selectionAnchor,
			this.#m_cursorPosition
		);
	}

	/** Provides selection end behavior. */
	selectionEnd(): number {
		return Math.max(
			this.#m_selectionAnchor,
			this.#m_cursorPosition
		);
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

		return this.#m_document.toPlainText().slice(
			this.selectionStart(),
			this.selectionEnd()
		);
	}

	/** Sets the selection. */
	setSelection(anchor: number, position: number): void {
		this.#breakUndoGroup();
		const length = this.#m_document.length();
		const oldAnchor = this.#m_selectionAnchor;
		const oldPosition = this.#m_cursorPosition;

		this.#m_selectionAnchor = Math.max(
			0, Math.min(anchor, length)
		);

		this.#m_cursorPosition = Math.max(
			0, Math.min(position, length)
		);

		/** Provides if behavior. */
		if (oldAnchor === this.#m_selectionAnchor
			&& oldPosition === this.#m_cursorPosition)
			return;

		this.selectionChanged.emit();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	/** Clears selection. */
	clearSelection(): void {
		/** Provides if behavior. */
		if (!this.hasSelection())
			return;

		this.#breakUndoGroup();
		this.#m_selectionAnchor = this.#m_cursorPosition;

		this.selectionChanged.emit();
		this.#m_contentWidget.update();
	}

	/** Provides select all behavior. */
	selectAll(): void {
		this.setSelection(0, this.#m_document.length());
	}

	/** Inserts . */
	insert(text: string): void {
		this.#insert(text, null);
	}
	
	/** Handles text document behavior. */
	protected textDocument(): CTextDocument {
		return this.#m_document;
	}

	/** Returns the current char format. */
	currentCharFormat(): CTextCharFormat {
		/** Provides if behavior. */
		if (this.hasSelection() && this.#m_document.length() > 0)
			return this.#m_document.charFormatAt(this.selectionStart());

		return this.#m_currentCharFormat.clone();
	}

	/** Sets the current char format. */
	setCurrentCharFormat(format: CTextCharFormat): void {
		/** Provides if behavior. */
		if (this.hasSelection()) {
			this.#pushUndoState();
			this.#m_document.setCharFormat(
				this.selectionStart(),
				this.selectionEnd() - this.selectionStart(),
				format
			);
			this.#m_currentCharFormat = format.clone();
			this.textChanged.emit();
			this.#updateContentGeometry();
			this.#m_contentWidget.update();
			return;
		}

		this.#m_currentCharFormat = format.clone();
	}

	/** Sets the font bold. */
	setFontBold(bold: boolean): void {
		this.#modifyCurrentFormats(format => {
			format.setFontBold(bold);
		});
	}

	/** Sets the font italic. */
	setFontItalic(italic: boolean): void {
		this.#modifyCurrentFormats(format => {
			format.setFontItalic(italic);
		});
	}

	/** Sets the font underline. */
	setFontUnderline(underline: boolean): void {
		this.#modifyCurrentFormats(format => {
			format.setFontUnderline(underline);
		});
	}

	/** Sets the text color. */
	setTextColor(color: string | null): void {
		this.#modifyCurrentFormats(format => {
			format.setForeground(color);
		});
	}

	/** Sets the font family. */
	setFontFamily(family: string | null): void {
		this.#modifyCurrentFormats(format => {
			format.setFontFamily(family);
		});
	}

	/** Sets the font size. */
	setFontSize(size: number | null): void {
		this.#modifyCurrentFormats(format => {
			format.setFontSize(size);
		});
	}

	/** Returns whether undo is currently possible. */
	canUndo(): boolean {
		return this.#m_history.canUndo();
	}

	/** Returns whether redo is currently possible. */
	canRedo(): boolean {
		return this.#m_history.canRedo();
	}

	/** Provides undo behavior. */
	undo(): void {
        this.#breakUndoGroup();
        this.#m_history.undo();
    }

    /** Reapplies the next edit and restores its cursor, selection and formatting. */
    redo(): void {
        this.#breakUndoGroup();
        this.#m_history.redo();
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

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(240, 120);
	}

	/** Sets the geometry. */
	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);
		this.#updateContentGeometry();
	}

	/** Provides resize behavior. */
	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateContentGeometry();
	}

	/** Handles text position at behavior. */
	protected textPositionAt(x: number, y: number): number {
		return this.#cursorPositionAt(x, y);
	}

	/** Handles text char format at behavior. */
	protected textCharFormatAt(
		x: number,
		y: number
	): CTextCharFormat | null {
		const layouts = this.#lineLayouts();
		const margin = CTextEdit.#TEXT_MARGIN;

		/** Provides for behavior. */
		for (const line of layouts) {
			/** Provides if behavior. */
			if (y < line.y || y >= line.y + line.height)
				continue;

			const textX = x - margin;

			/** Provides if behavior. */
			if (textX < 0 || line.text.length === 0)
				return null;

			/** Provides for behavior. */
			for (let i = 1; i <= line.text.length; ++i) {
				const width = this.#textWidth(line.start, i);

				/** Provides if behavior. */
				if (textX < width)
					return this.#m_document.charFormatAt(
						line.start + i - 1
					);
			}

			return null;
		}

		return null;
	}

	/** Provides paint text behavior. */
	paintText(painter: CPainter): void {
		const palette = this.palette();
		const margin = CTextEdit.#TEXT_MARGIN;

		painter.setBrush(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(this.#m_contentWidget.rect());

		painter.setTextAlign("left");
		painter.setTextBaseline("top");

		const textRole = this.isEnabled()
			? CPaletteColorRole.Text
			: CPaletteColorRole.DisabledText;

		const layouts = this.#lineLayouts();

		/** Provides for behavior. */
		for (const line of layouts) {
			this.#paintFormattedLine(
				painter,
				line.text,
				line.start,
				margin,
				line.y,
				line.height,
				textRole
			);
		}

		/** Provides if behavior. */
		if (this.hasFocus() && this.#m_cursorVisible) {
			const position = this.#lineColumnAt(
				this.#m_cursorPosition
			);

			const line = layouts[position.line]!;

			const cursorX = margin + this.#textWidth(
				line.start,
				position.column
			);

			painter.setPen(
				palette.color(CPaletteColorRole.Text).toCss()
			);

			painter.drawLine(
				cursorX,
				line.y,
				cursorX,
				line.y + line.height
			);
		}
	}

	/** Provides handle mouse press behavior. */
	handleMousePress(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}
		this.#m_selectionScrollTimer.stop();

		if (event.clickCount() >= 2) {
            this.#selectMouseText(event, event.clickCount() >= 3);
            return;
        }
        this.#breakUndoGroup();
        this.setFocus();
		
		const position = this.#cursorPositionAt(
			event.x(),
			event.y()
		);

		this.#m_cursorPosition = position;
		this.#m_selectionAnchor = position;
		this.#syncCurrentCharFormatFromCursor();
		this.#m_selectingWithMouse = true;

		this.#resetCursorBlink();

		event.accept();
		this.#m_contentWidget.update();
	}


    /** Handles a double-click forwarded by the content widget. */
    handleMouseDoubleClick(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) {
            event.ignore();
            return;
        }
        this.#selectMouseText(event, event.clickCount() >= 3);
    }

    #selectMouseText(event: CMouseEvent, paragraph: boolean): void {
        this.#m_selectingWithMouse = false;
        this.#m_selectionScrollTimer.stop();
        this.setFocus();
        const position = this.#cursorPositionAt(event.x(), event.y(), false);
        const [start, end] = textSelectionRange(this.toPlainText(), position, paragraph);
        this.setSelection(start, end);
        this.#resetCursorBlink();
        event.accept();
    }

	/** Provides handle mouse move behavior. */
	handleMouseMove(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		// Content coordinates change when scrolling; retain the physical pointer
		// position relative to the viewport for subsequent timer ticks.
		this.#m_dragViewportX = event.x() - this.scrollX();
		this.#m_dragViewportY = event.y() - this.scrollY();
		this.#moveCursor(this.#cursorPositionAt(event.x(), event.y()), true);
		if (this.#dragOutsideViewport())
			this.#m_selectionScrollTimer.start();
		else
			this.#m_selectionScrollTimer.stop();
		event.accept();
	}

	#dragOutsideViewport(): boolean {
		return this.#m_dragViewportX < 0
			|| this.#m_dragViewportX >= this.viewport().width()
			|| this.#m_dragViewportY < 0
			|| this.#m_dragViewportY >= this.viewport().height();
	}

	#scrollMouseSelection(): void {
		if (!this.#m_selectingWithMouse || !this.isEnabled() || !this.#dragOutsideViewport()) {
			this.#m_selectionScrollTimer.stop();
			return;
		}
		const width = this.viewport().width();
		const height = this.viewport().height();
		const oldX = this.scrollX();
		const oldY = this.scrollY();
		const step = CTextEdit.#LINE_HEIGHT;
		const dx = this.#m_dragViewportX < 0 ? -step
			: this.#m_dragViewportX >= width ? step : 0;
		const dy = this.#m_dragViewportY < 0 ? -step
			: this.#m_dragViewportY >= height ? step : 0;
		this.scrollTo(oldX + dx, oldY + dy);
		const margin = CTextEdit.#TEXT_MARGIN;
		const x = Math.max(margin, Math.min(this.#m_dragViewportX, width - margin));
		const y = Math.max(margin, Math.min(this.#m_dragViewportY, height - margin - 1));
		this.#moveCursor(this.#cursorPositionAt(x + this.scrollX(), y + this.scrollY()), true);
		if (this.scrollX() === oldX && this.scrollY() === oldY)
			this.#m_selectionScrollTimer.stop();
	}

	/** Provides handle mouse release behavior. */
	handleMouseRelease(event: CMouseEvent): void {
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
		this.#m_selectionScrollTimer.stop();

		const position = this.#cursorPositionAt(
			event.x(),
			event.y()
		);

		this.#moveCursor(position, true);
		event.accept();
	}

	/** Handles the key press event. */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.ctrl()) {
			/** Provides switch behavior. */
			switch (event.key().toLowerCase()) {
			case "home":
				this.#moveCursor(0, event.shift());
				event.accept();
				return;
			case "end":
				this.#moveCursor(this.#m_document.length(), event.shift());
				event.accept();
				return;

            case "arrowleft":
                this.#moveCursor(previousWordPosition(this.toPlainText(),
                    this.#m_cursorPosition), event.shift());
                event.accept();
                return;
            case "arrowright":
                this.#moveCursor(nextWordPosition(this.toPlainText(),
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

            case 'z':
                /** Provides if behavior. */
                if (event.shift())
				    this.redo();
			    else
				    this.undo();

			    event.accept();
			    return;

            case 'y':
                this.redo();
			    event.accept();
			    return;
			}
		}

		/** Provides switch behavior. */
		switch (event.key()) {
		case "PageUp":
		case "PageDown":
			this.#moveCursorPage(event.key() === "PageUp" ? -1 : 1, event.shift());
			event.accept();
			return;

		case "ArrowLeft":
			this.#moveCursor(
				this.#m_cursorPosition - 1,
				event.shift()
			);
			event.accept();
			return;

		case "ArrowRight":
			this.#moveCursor(
				this.#m_cursorPosition + 1,
				event.shift()
			);
			event.accept();
			return;

		case "ArrowUp":
			this.#moveCursorVertical(
				-1,
				event.shift()
			);
			event.accept();
			return;

		case "ArrowDown":
			this.#moveCursorVertical(
				1,
				event.shift()
			);
			event.accept();
			return;

		case "Home":
			this.#moveCursor(
				this.#lineStart(
					this.#m_cursorPosition
				),
				event.shift()
			);
			event.accept();
			return;

		case "End":
			this.#moveCursor(
				this.#lineEnd(
					this.#m_cursorPosition
				),
				event.shift()
			);
			event.accept();
			return;

		case "Escape":
			this.clearSelection();
			event.accept();
			return;

		case "Enter":
			/** Provides if behavior. */
			if (!this.isReadOnly()) {
				this.#breakUndoGroup();
				this.insert("\n");
			}

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
				this.#m_document.remove(this.#m_cursorPosition - 1, 1);

				--this.#m_cursorPosition;
				this.#m_selectionAnchor = this.#m_cursorPosition;
				this.#syncCurrentCharFormatFromCursor();
				this.textChanged.emit();

				this.#updateContentGeometry();
				this.#ensureCursorVisible();
				this.#resetCursorBlink();
				this.#m_contentWidget.update();
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
			if (this.#m_cursorPosition < this.#m_document.length()) {
                this.#pushUndoState("delete");
				this.#m_document.remove(this.#m_cursorPosition, 1);

				this.#m_selectionAnchor = this.#m_cursorPosition;
				this.#syncCurrentCharFormatFromCursor();
				this.textChanged.emit();

				this.#updateContentGeometry();
				this.#ensureCursorVisible();
				this.#resetCursorBlink();
				this.#m_contentWidget.update();
			}

			event.accept();
			return;
		}

		/** Provides if behavior. */
		if (event.key().length === 1 && !event.ctrl()) {
			this.#insert(event.key(), "insert");
			event.accept();
			return;
		}

		event.ignore();
	}

	/** Handles the focus in event. */
	protected override focusInEvent(event: CFocusEvent): void {
		this.#startCursorBlink();
		event.accept();
		this.#m_contentWidget.update();
	}

	/** Handles the focus out event. */
	protected override focusOutEvent(
		event: CFocusEvent
	): void {
		this.#breakUndoGroup();
		this.#m_selectingWithMouse = false;
		this.#m_selectionScrollTimer.stop();
		this.#stopCursorBlink();

		super.focusOutEvent(event);
	}

	#paintFormattedLine(
		painter: CPainter,
		text: string,
		lineStart: number,
		x: number,
		y: number,
		lineHeight: number,
		textRole: CPaletteColorRole
	): void {
		/** Provides if behavior. */
		if (text.length === 0)
			return;

		const palette = this.palette();
		const lineEnd = lineStart + text.length;
		let currentX = x;

		/** Provides for behavior. */
		for (const range of this.#m_document.formatRanges()) {
			const start = Math.max(lineStart, range.start);
			const end = Math.min(
				lineEnd,
				range.start + range.length
			);

			/** Provides if behavior. */
			if (start >= end)
				continue;

			const segment = this.#m_document.toPlainText().slice(
				start,
				end
			);

			const font = this.#fontForFormat(range.format);
			const metrics = new CFontMetrics(font);
			const segmentWidth = metrics.textWidth(segment);

			painter.setFont(font);

			const normalColor = range.format.foreground()
				?? (range.format.anchorHref() !== null
					? palette.color(CPaletteColorRole.Link).toCss()
					: palette.color(textRole).toCss());

			const selectionStart = Math.max(
				start,
				this.selectionStart()
			);
			const selectionEnd = Math.min(
				end,
				this.selectionEnd()
			);

			/** Provides if behavior. */
			if (!this.hasSelection()
				|| selectionStart >= selectionEnd) {
				painter.setPen(normalColor);
				painter.drawText(segment, currentX, y);

				/** Provides if behavior. */
				if (range.format.fontUnderline()) {
					painter.drawLine(
						currentX,
						y + lineHeight - 3,
						currentX + segmentWidth,
						y + lineHeight - 3
					);
				}

				currentX += segmentWidth;
				continue;
			}

			const selectedLocalStart =
				selectionStart - start;
			const selectedLocalEnd =
				selectionEnd - start;

			const before = segment.slice(
				0,
				selectedLocalStart
			);
			const selected = segment.slice(
				selectedLocalStart,
				selectedLocalEnd
			);
			const after = segment.slice(selectedLocalEnd);

			const beforeWidth = metrics.textWidth(before);
			const selectedWidth = metrics.textWidth(selected);

			/** Provides if behavior. */
			if (before.length > 0) {
				painter.setPen(normalColor);
				painter.drawText(before, currentX, y);
				/** Provides if behavior. */
				if (range.format.fontUnderline()) {
					painter.drawLine(
						currentX,
						y + lineHeight - 3,
						currentX + beforeWidth,
						y + lineHeight - 3
					);
				}
			}

			painter.setBrush(
				palette.color(
					CPaletteColorRole.Highlight
				).toCss()
			);
			painter.fillRect(
				new CRect(
					currentX + beforeWidth,
					y,
					selectedWidth,
					lineHeight
				)
			);

			painter.setPen(
				palette.color(
					CPaletteColorRole.HighlightedText
				).toCss()
			);
			painter.drawText(
				selected,
				currentX + beforeWidth,
				y
			);

			/** Provides if behavior. */
			if (after.length > 0) {
				painter.setPen(normalColor);
				painter.drawText(
					after,
					currentX + beforeWidth + selectedWidth,
					y
				);

				/** Provides if behavior. */
				if (range.format.fontUnderline()) {
					const afterX = currentX + beforeWidth + selectedWidth;
					painter.drawLine(
						afterX,
						y + lineHeight - 3,
						afterX + metrics.textWidth(after),
						y + lineHeight - 3
					);
				}
			}

			currentX += segmentWidth;
		}
	}

	#lines(): { text: string; start: number }[] {
		const result: {
			text: string;
			start: number;
		}[] = [];

		const lines = this.#m_document.toPlainText().split("\n");
		let start = 0;

		/** Provides for behavior. */
		for (const text of lines) {
			result.push({
				text,
				start
			});

			start += text.length + 1;
		}

		return result;
	}


	#lineLayouts(): CTextEditLineLayout[] {
		const lines = this.#lines();
		const result: CTextEditLineLayout[] = [];
		let y = CTextEdit.#TEXT_MARGIN;

		/** Provides for behavior. */
		for (const line of lines) {
			const height = this.#lineHeight(
				line.start,
				line.text.length
			);

			result.push({
				text: line.text,
				start: line.start,
				y,
				height
			});

			y += height;
		}

		return result;
	}

	#lineHeight(start: number, length: number): number {
		let height = CTextEdit.#LINE_HEIGHT;

		/** Provides if behavior. */
		if (length === 0)
			return height;

		const end = start + length;

		/** Provides for behavior. */
		for (const range of this.#m_document.formatRanges()) {
			const rangeStart = Math.max(start, range.start);
			const rangeEnd = Math.min(
				end,
				range.start + range.length
			);

			/** Provides if behavior. */
			if (rangeStart >= rangeEnd)
				continue;

			/*
			 * Preserve CTextEdit's historical 18 px line height for the
			 * default character format.  Only an explicitly assigned rich-
			 * text font size is allowed to enlarge a line.
			 *
			 * This is important because mouse hit-testing and scrolling of
			 * ordinary plain text have always been based on #LINE_HEIGHT.
			 */
			const size = range.format.fontSize();

			/** Provides if behavior. */
			if (size === null)
				continue;

			height = Math.max(
				height,
				Math.ceil(size * 1.35)
			);
		}

		return height;
	}


	#lineColumnAt(position: number): {
		line: number;
		column: number;
	} {
		const lines = this.#lines();

		/** Provides for behavior. */
		for (let i = 0; i < lines.length; ++i) {
			const line = lines[i]!;
			const end =
				line.start + line.text.length;

			/** Provides if behavior. */
			if (position <= end) {
				return {
					line: i,
					column: position - line.start
				};
			}
		}

		const last = lines[lines.length - 1]!;

		return {
			line: lines.length - 1,
			column: last.text.length
		};
	}

	#lineStart(position: number): number {
		const info = this.#lineColumnAt(position);
		return this.#lines()[info.line]!.start;
	}

	#lineEnd(position: number): number {
		const info = this.#lineColumnAt(position);
		const line = this.#lines()[info.line]!;

		return line.start + line.text.length;
	}

	#moveCursorPage(direction: -1 | 1, keepAnchor: boolean): void {
		if (this.#m_document.length() === 0 || this.viewport().height() <= 0)
			return;
		const current = this.#lineColumnAt(this.#m_cursorPosition);
		const line = this.#lineLayouts()[current.line]!;
		const x = CTextEdit.#TEXT_MARGIN + this.#textWidth(line.start, current.column);
		const pageHeight = Math.max(1, this.viewport().height() - 2 * CTextEdit.#TEXT_MARGIN);
		const scrollY = this.scrollY();
		const y = line.y + line.height / 2 + direction * pageHeight;
		this.#moveCursor(this.#cursorPositionAt(x, y), keepAnchor);
		this.scrollTo(this.scrollX(), scrollY + direction * pageHeight);
		this.#ensureCursorVisible();
	}

	#moveCursorVertical(direction: number, keepAnchor: boolean): void {
		const lines = this.#lines();

		const current = this.#lineColumnAt(
			this.#m_cursorPosition
		);

		const targetLine = Math.max(0, Math.min(current.line + direction, lines.length - 1));
		/** Provides if behavior. */
		if (targetLine === current.line)
			return;

		const line = lines[targetLine]!;

		const column = Math.min(current.column, line.text.length);

		this.#moveCursor(line.start + column, keepAnchor);
	}

	#cursorPositionAt(x: number, y: number, nearest = true): number {
		const layouts = this.#lineLayouts();
		const margin = CTextEdit.#TEXT_MARGIN;

		let lineIndex = 0;

		/** Provides if behavior. */
		if (y <= margin) {
			lineIndex = 0;
		}
		else {
			lineIndex = layouts.length - 1;

			/** Provides for behavior. */
			for (let i = 0; i < layouts.length; ++i) {
				const line = layouts[i]!;

				/** Provides if behavior. */
				if (y < line.y + line.height) {
					lineIndex = i;
					break;
				}
			}
		}

		const line = layouts[lineIndex]!;
		const textX = x - margin;

		/** Provides if behavior. */
		if (textX <= 0)
			return line.start;

		let previousWidth = 0;

		/** Provides for behavior. */
		for (let i = 1; i <= line.text.length; ++i) {
			const width = this.#textWidth(line.start, i);
			const middle = nearest ? (previousWidth + width) / 2 : width;

			/** Provides if behavior. */
			if (textX < middle)
				return line.start + i - 1;

			previousWidth = width;
		}

		return line.start + line.text.length;
	}

	#moveCursor(
		position: number,
		keepAnchor: boolean
	): void {
		this.#breakUndoGroup();
		const clamped = Math.max(0, Math.min(position, this.#m_document.length()));

		/** Provides if behavior. */
		if (this.#m_cursorPosition === clamped && (keepAnchor || this.#m_selectionAnchor === clamped))
			return;

		const oldAnchor = this.#m_selectionAnchor;
		const oldPosition = this.#m_cursorPosition;

		this.#m_cursorPosition = clamped;

		/** Provides if behavior. */
		if (!keepAnchor) {
			this.#m_selectionAnchor = clamped;
			this.#syncCurrentCharFormatFromCursor();
		}

		/** Provides if behavior. */
		if (oldAnchor !== this.#m_selectionAnchor || oldPosition !== this.#m_cursorPosition)
			this.selectionChanged.emit();

		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}


    /** Deletes one word as an independent undo command. */
    #deleteWord(direction: -1 | 1): void {
        if (this.isReadOnly()) return;
        if (this.#deleteSelection()) return;
        const text = this.toPlainText();
        const target = direction < 0
            ? previousWordPosition(text, this.#m_cursorPosition)
            : nextWordPosition(text, this.#m_cursorPosition);
        const start = Math.min(target, this.#m_cursorPosition);
        const end = Math.max(target, this.#m_cursorPosition);
        if (start === end) return;
        this.#pushUndoState();
        this.#m_document.remove(start, end - start);
        this.#m_cursorPosition = start;
        this.#m_selectionAnchor = start;
        this.#syncCurrentCharFormatFromCursor();
        this.textChanged.emit();
        this.#updateContentGeometry();
        this.#ensureCursorVisible();
        this.#resetCursorBlink();
        this.#m_contentWidget.update();
    }

	#deleteSelection(): boolean {
		/** Provides if behavior. */
		if (!this.hasSelection() || this.isReadOnly())
			return false;

        this.#pushUndoState(null);
		const start = this.selectionStart();
		const end = this.selectionEnd();

		this.#m_document.remove(start, end - start);

		this.#m_cursorPosition = start;
		this.#m_selectionAnchor = start;
		this.#syncCurrentCharFormatFromCursor();

		this.textChanged.emit();
		this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();

		return true;
	}

	#contentWidth(): number {
		let width = 0;

		/** Provides for behavior. */
		for (const line of this.#lines()) {
			width = Math.max(
				width,
				this.#textWidth(
					line.start,
					line.text.length
				)
			);
		}

		return width + 2 * CTextEdit.#TEXT_MARGIN;
	}

	#contentHeight(): number {
		const layouts = this.#lineLayouts();

		/** Provides if behavior. */
		if (layouts.length === 0)
			return 2 * CTextEdit.#TEXT_MARGIN;

		const last = layouts[layouts.length - 1]!;

		return last.y + last.height + CTextEdit.#TEXT_MARGIN;
	}

	#updateContentGeometry(): void {
		/** Provides if behavior. */
		if (this.#m_contentWidget === undefined)
			return;

		const contentWidth = this.#contentWidth();
		const contentHeight = this.#contentHeight();

		this.#m_contentWidget.resize(
			Math.max(this.viewport().width(), contentWidth),
			Math.max(this.viewport().height(), contentHeight)
		);

		this.updateScrollBars();

		this.#m_contentWidget.resize(
			Math.max(this.viewport().width(), contentWidth),
			Math.max(this.viewport().height(), contentHeight)
		);

		this.updateScrollBars();
		this.#m_contentWidget.update();
	}

	#ensureCursorVisible(): void {
		const position = this.#lineColumnAt(
			this.#m_cursorPosition
		);

		const line = this.#lineLayouts()[position.line]!;

		const cursorX = CTextEdit.#TEXT_MARGIN
			+ this.#textWidth(
				line.start,
				position.column
			);

		const cursorY = line.y;
		const cursorHeight = line.height;

		let scrollX = this.scrollX();
		let scrollY = this.scrollY();

		/** Provides if behavior. */
		if (cursorX < scrollX + CTextEdit.#TEXT_MARGIN)
			scrollX = Math.max(
				0,
				cursorX - CTextEdit.#TEXT_MARGIN
			);
		else if (
			cursorX >
			scrollX
				+ this.viewport().width()
				- CTextEdit.#TEXT_MARGIN
		) {
			scrollX =
				cursorX
					- this.viewport().width()
					+ CTextEdit.#TEXT_MARGIN;
		}

		/** Provides if behavior. */
		if (cursorY < scrollY + CTextEdit.#TEXT_MARGIN)
			scrollY = Math.max(
				0,
				cursorY - CTextEdit.#TEXT_MARGIN
			);
		else if (
			cursorY + cursorHeight >
			scrollY
				+ this.viewport().height()
				- CTextEdit.#TEXT_MARGIN
		) {
			scrollY =
				cursorY
					+ cursorHeight
					- this.viewport().height()
					+ CTextEdit.#TEXT_MARGIN;
		}

		this.scrollTo(scrollX, scrollY);
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

	#textWidth(start: number, length: number): number {
		/** Provides if behavior. */
		if (length <= 0)
			return 0;

		const end = start + length;
		const text = this.#m_document.toPlainText();
		let width = 0;

		/** Provides for behavior. */
		for (const range of this.#m_document.formatRanges()) {
			const rangeStart = Math.max(start, range.start);
			const rangeEnd = Math.min(
				end,
				range.start + range.length
			);

			/** Provides if behavior. */
			if (rangeStart >= rangeEnd)
				continue;

			const font = this.#fontForFormat(range.format);
			const metrics = new CFontMetrics(font);

			width += metrics.textWidth(
				text.slice(rangeStart, rangeEnd)
			);
		}

		return width;
	}

	#fontForFormat(format: CTextCharFormat): CFont {
		const font = new CFont(this.font());

		/** Provides if behavior. */
		if (format.fontSize() !== null)
			font.setPixelSize(format.fontSize()!);

		/** Provides if behavior. */
		if (format.fontFamily() !== null)
			font.setFamily(format.fontFamily()!);

		/** Provides if behavior. */
		if (format.fontItalic())
			font.setItalic(true);

		/** Provides if behavior. */
		if (format.fontBold())
			font.setBold(true);

		return font;
	}

	#formatHtmlFragment(text: string, format: CTextCharFormat): string {
		const parts = text.split("\n");
		let html = "";

		/** Provides for behavior. */
		for (let i = 0; i < parts.length; ++i) {
			/** Provides if behavior. */
			if (i > 0)
				html += "<br>";

			const part = parts[i]!;

			/** Provides if behavior. */
			if (part.length === 0)
				continue;

			let content = this.#encodeHtmlEntities(part);
			const styles: string[] = [];

			/** Provides if behavior. */
			if (format.foreground() !== null)
				styles.push(`color: ${format.foreground()}`);
			/** Provides if behavior. */
			if (format.fontSize() !== null)
				styles.push(`font-size: ${format.fontSize()}px`);
			/** Provides if behavior. */
			if (format.fontFamily() !== null) {
				styles.push(`font-family: ${this.#escapeHtmlStyleValue(format.fontFamily()!)}`);
			}
			/** Provides if behavior. */
			if (format.fontUnderline())
				styles.push("text-decoration: underline");

			/** Provides if behavior. */
			if (styles.length > 0)
				content = `<span style="${styles.join("; ")}">${content}</span>`;
			/** Provides if behavior. */
			if (format.fontItalic())
				content = `<i>${content}</i>`;
			/** Provides if behavior. */
			if (format.fontBold())
				content = `<b>${content}</b>`;
			/** Provides if behavior. */
			if (format.anchorHref() !== null) {
				content = `<a href="${this.#encodeHtmlAttribute(format.anchorHref()!)}">${content}</a>`;
			}
			html += content;
		}

		return html;
	}

	#encodeHtmlEntities(text: string): string {
		return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
	}

	#escapeHtmlStyleValue(value: string): string {
		return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	#encodeHtmlAttribute(value: string): string {
		return this.#encodeHtmlEntities(value);
	}

	#parseHtml(html: string): CParsedHtml {
		const ranges: CParsedHtmlRange[] = [];
		let plainText = "";

		const baseFormat = new CTextCharFormat();
		const formatStack: CTextCharFormat[] = [baseFormat];

		const currentFormat = (): CTextCharFormat =>
			formatStack[formatStack.length - 1]!.clone();

		const appendText = (rawText: string): void => {
			let text = this.#decodeHtmlEntities(rawText);
			text = text.replace(/\s+/g, " ");

			/** Provides if behavior. */
			if (text.length === 0)
				return;

			/** Provides if behavior. */
			if (
				(plainText.length === 0 || plainText.endsWith("\n")) &&
				text.startsWith(" ")
			)
				text = text.slice(1);

			/** Provides if behavior. */
			if (text.length === 0)
				return;

			const start = plainText.length;
			plainText += text;

			ranges.push({
				start,
				length: text.length,
				format: currentFormat()
			});
		};

		const appendNewLine = (): void => {
			/** Provides if behavior. */
			if (plainText.length === 0 || plainText.endsWith("\n"))
				return;

			const start = plainText.length;
			plainText += "\n";

			ranges.push({
				start,
				length: 1,
				format: currentFormat()
			});
		};

		const pushModifiedFormat = (
			modifier: (format: CTextCharFormat) => void
		): void => {
			const format = currentFormat();
			/** Provides modifier behavior. */
			modifier(format);
			formatStack.push(format);
		};

		const popFormat = (): void => {
			/** Provides if behavior. */
			if (formatStack.length > 1)
				formatStack.pop();
		};

		const tokens = html.match(/<[^>]*>|[^<]+/g) ?? [];

		/** Provides for behavior. */
		for (const token of tokens) {
			/** Provides if behavior. */
			if (!token.startsWith("<")) {
				/** Provides append text behavior. */
				appendText(token);
				continue;
			}

			const match =
				/^<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>$/.exec(token);

			/** Provides if behavior. */
			if (match === null)
				continue;

			const closing = match[1] === "/";
			const tag = match[2]!.toLowerCase();
			const attributes = match[3] ?? "";

			/** Provides if behavior. */
			if (tag === "a") {
				/** Provides if behavior. */
				if (closing) {
					/** Provides pop format behavior. */
					popFormat();
				}
				else {
					const hrefMatch =
						/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
					const href = hrefMatch === null
						? null
						: this.#decodeHtmlEntities(
							hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? ""
						);

					/** Provides push modified format behavior. */
					pushModifiedFormat(format => {
						format.setAnchorHref(href);
						format.setFontUnderline(true);
					});
				}
				continue;
			}

			/** Provides if behavior. */
			if (tag === "u") {
				/** Provides if behavior. */
				if (closing)
					/** Provides pop format behavior. */
					popFormat();
				else
					/** Provides push modified format behavior. */
					pushModifiedFormat(format => format.setFontUnderline(true));
				continue;
			}

			/** Provides if behavior. */
			if (tag === "br") {
				/** Provides append new line behavior. */
				appendNewLine();
				continue;
			}

			/** Provides if behavior. */
			if (tag === "p" || tag === "div") {
				/** Provides if behavior. */
				if (closing)
					/** Provides append new line behavior. */
					appendNewLine();
				else if (plainText.length > 0 && !plainText.endsWith("\n"))
					/** Provides append new line behavior. */
					appendNewLine();

				continue;
			}

			/** Provides if behavior. */
			if (tag === "b" || tag === "strong") {
				/** Provides if behavior. */
				if (closing)
					/** Provides pop format behavior. */
					popFormat();
				else
					/** Provides push modified format behavior. */
					pushModifiedFormat(format => format.setFontBold(true));
				continue;
			}

			/** Provides if behavior. */
			if (tag === "i" || tag === "em") {
				/** Provides if behavior. */
				if (closing)
					/** Provides pop format behavior. */
					popFormat();
				else
					/** Provides push modified format behavior. */
					pushModifiedFormat(format => format.setFontItalic(true));
				continue;
			}

			const headingMatch = /^h([1-3])$/.exec(tag);

			/** Provides if behavior. */
			if (headingMatch !== null) {
				/** Provides if behavior. */
				if (closing) {
					/** Provides pop format behavior. */
					popFormat();
					/** Provides append new line behavior. */
					appendNewLine();
				}
				else {
					/** Provides if behavior. */
					if (plainText.length > 0 && !plainText.endsWith("\n"))
						/** Provides append new line behavior. */
						appendNewLine();

					const heading = Number(headingMatch[1]);
					const factor = heading === 1
						? 1.8
						: heading === 2
							? 1.5
							: 1.25;

					/** Provides push modified format behavior. */
					pushModifiedFormat(format => {
						format.setFontBold(true);
						format.setFontSize(
							this.#baseFontPixelSize() * factor
						);
					});
				}
				continue;
			}

			/** Provides if behavior. */
			if (tag === "span") {
				/** Provides if behavior. */
				if (closing) {
					/** Provides pop format behavior. */
					popFormat();
					continue;
				}

				/** Provides push modified format behavior. */
				pushModifiedFormat(format => {
					this.#applyInlineStyle(format, attributes);
				});
			}
		}

		/** Provides while behavior. */
		while (plainText.endsWith("\n")) {
			plainText = plainText.slice(0, -1);

			const last = ranges[ranges.length - 1];
			/** Provides if behavior. */
			if (last === undefined)
				break;

			/** Provides if behavior. */
			if (last.start + last.length > plainText.length) {
				const newLength = plainText.length - last.start;
				/** Provides if behavior. */
				if (newLength <= 0)
					ranges.pop();
				else
					last.length = newLength;
			}
		}

		return {
			plainText,
			ranges: ranges.filter(range => range.length > 0)
		};
	}

	#applyInlineStyle(
		format: CTextCharFormat,
		attributes: string
	): void {
		const styleMatch =
			/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attributes);

		/** Provides if behavior. */
		if (styleMatch === null)
			return;

		const style = styleMatch[1] ?? styleMatch[2] ?? "";

		/** Provides for behavior. */
		for (const declaration of style.split(";")) {
			const colon = declaration.indexOf(":");
			/** Provides if behavior. */
			if (colon < 0)
				continue;

			const property = declaration.slice(0, colon).trim().toLowerCase();
			const value = declaration.slice(colon + 1).trim();

			/** Provides if behavior. */
			if (property === "color" && value.length > 0) {
				format.setForeground(value);
				continue;
			}

			/** Provides if behavior. */
			if (property === "font-size") {
				const sizeMatch = /^(\d+(?:\.\d+)?)px$/i.exec(value);
				/** Provides if behavior. */
				if (sizeMatch !== null)
					format.setFontSize(Number(sizeMatch[1]));
				continue;
			}

			/** Provides if behavior. */
			if (property === "font-family" && value.length > 0) {
				format.setFontFamily(
					value.replace(/^['"]|['"]$/g, "")
				);
				continue;
			}

			/** Provides if behavior. */
			if (property === "font-weight") {
				const numericWeight = Number(value);
				format.setFontBold(
					value.toLowerCase() === "bold" ||
					(Number.isFinite(numericWeight) && numericWeight >= 600)
				);
				continue;
			}

			/** Provides if behavior. */
			if (property === "font-style") {
				format.setFontItalic(value.toLowerCase() === "italic");
				continue;
			}

			/** Provides if behavior. */
			if (property === "text-decoration") {
				format.setFontUnderline(
					value.toLowerCase().split(/\s+/).includes("underline")
				);
			}
		}
	}

	#baseFontPixelSize(): number {
		return this.font().pixelSize();
	}

	#decodeHtmlEntities(text: string): string {
		const entities: Record<string, string> = {
			amp: "&",
			lt: "<",
			gt: ">",
			quot: '"',
			apos: "'",
			nbsp: " "
		};

		return text.replace(
			/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
			(match, entity: string) => {
				/** Provides if behavior. */
				if (entity.startsWith("#x")) {
					const code = Number.parseInt(entity.slice(2), 16);
					return Number.isFinite(code)
						? String.fromCodePoint(code)
						: match;
				}

				/** Provides if behavior. */
				if (entity.startsWith("#")) {
					const code = Number.parseInt(entity.slice(1), 10);
					return Number.isFinite(code)
						? String.fromCodePoint(code)
						: match;
				}

				return entities[entity] ?? match;
			}
		);
	}

	#modifyCurrentFormats(
		modify: (format: CTextCharFormat) => void
	): void {
		/** Provides if behavior. */
		if (!this.hasSelection()) {
			const format = this.#m_currentCharFormat.clone();
			/** Provides modify behavior. */
			modify(format);
			this.#m_currentCharFormat = format;
			return;
		}

		this.#pushUndoState();

		const start = this.selectionStart();
		const end = this.selectionEnd();

		/** Provides for behavior. */
		for (const range of this.#m_document.formatRanges()) {
			const rangeStart = Math.max(start, range.start);
			const rangeEnd = Math.min(
				end,
				range.start + range.length
			);

			/** Provides if behavior. */
			if (rangeStart >= rangeEnd)
				continue;

			const format = range.format.clone();
			/** Provides modify behavior. */
			modify(format);

			this.#m_document.setCharFormat(
				rangeStart,
				rangeEnd - rangeStart,
				format
			);
		}

		this.#m_currentCharFormat =
			this.#m_document.charFormatAt(start);

		this.textChanged.emit();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
	}

	#syncCurrentCharFormatFromCursor(): void {
		/** Provides if behavior. */
		if (this.#m_document.length() === 0) {
			this.#m_currentCharFormat = new CTextCharFormat();
			return;
		}

		const position = this.#m_cursorPosition > 0
			? this.#m_cursorPosition - 1
			: 0;

		this.#m_currentCharFormat =
			this.#m_document.charFormatAt(position);
	}

	#currentState(): CTextEditState {
		return {
			document: this.#m_document.clone(),
			cursorPosition: this.#m_cursorPosition,
			selectionAnchor: this.#m_selectionAnchor,
			currentCharFormat: this.#m_currentCharFormat.clone()
		};
	}


    #pushUndoState(group: CTextEditUndoGroup = null): void {
        if (this.#m_restoringHistory) return;
        if (group === null || group !== this.#m_undoGroup)
            this.#m_mergeKey = group === null ? null : {};
        this.#m_undoGroup = group;
        this.#m_history.push(new CTextEditUndoCommand(
            this.#currentState(), () => this.#currentState(),
            state => this.#restoreState(state), this.#m_mergeKey
        ));
    }

    #breakUndoGroup(): void {
        this.#m_undoGroup = null;
        this.#m_mergeKey = null;
    }

	#restoreState(state: CTextEditState): void {
		this.#m_restoringHistory = true;

		const hadSelection = this.hasSelection();
		const textChanged =
			this.#m_document.toPlainText() !== state.document.toPlainText();

		this.#m_document = state.document.clone();
		this.#m_cursorPosition = state.cursorPosition;
		this.#m_selectionAnchor = state.selectionAnchor;
		this.#m_currentCharFormat = state.currentCharFormat.clone();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.viewport().update();

		/** Provides if behavior. */
		if (textChanged)
			this.textChanged.emit();

		/** Provides if behavior. */
		if (hadSelection !== this.hasSelection() || this.hasSelection())
			this.selectionChanged.emit();

		this.#m_restoringHistory = false;
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	#insert(text: string, group: CTextEditUndoGroup): void {
		/** Provides if behavior. */
		if (text.length === 0 || this.isReadOnly())
			return;

		const hadSelection = this.hasSelection();
		this.#pushUndoState(hadSelection ? null : group);

		const start = hadSelection? this.selectionStart() : this.#m_cursorPosition;
		const end = hadSelection? this.selectionEnd() : this.#m_cursorPosition;

		/** Provides if behavior. */
		if (hadSelection)
			this.#m_document.remove(start, end - start);

		this.#m_document.insert(
			start,
			text,
			this.#m_currentCharFormat
		);
		this.#m_cursorPosition = start + text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.textChanged.emit();

		/** Provides if behavior. */
		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}
    /** Forwards context requests from the scroll area's content widget. */
    handleContextMenu(event: CContextMenuEvent): void {
        this.contextMenuEvent(event);
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
        add("Select All", () => this.isEnabled() && this.toPlainText().length > 0
            && this.selectedText().length !== this.toPlainText().length, () => this.selectAll());
        return menu;
    }

    protected override contextMenuEvent(event: CContextMenuEvent): void {
        if (!this.isEnabled()) {
            event.ignore();
            return;
        }
        this.#disposeContextMenu();
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

    override destroy(): void {
        this.#m_cursorTimer.stop();
        ++this.#m_clipboardRequest;
        this.#m_selectingWithMouse = false;
        this.#m_selectionScrollTimer.stop();
        this.#disposeContextMenu();
        super.destroy();
    }

}
