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

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		this.#m_textEdit.handleMouseRelease(event);
	}
}

export class CTextEdit extends CScrollArea {
	readonly textChanged = new CSignal<[]>();
	readonly selectionChanged = new CSignal<[]>();

	#m_document = new CTextDocument();
	#m_cursorPosition = 0;
	#m_selectionAnchor = 0;
	#m_selectingWithMouse = false;
	#m_readOnly = false;
	#m_currentCharFormat = new CTextCharFormat();
    #m_undoStack: CTextEditState[] = [];
	#m_redoStack: CTextEditState[] = [];
	#m_restoringHistory = false;
	#m_undoGroup: CTextEditUndoGroup = null;

	#m_cursorVisible = true;
	#m_cursorTimer = new CTimer(this);

	#m_contentWidget: CTextEditContentWidget;

	static readonly #TEXT_MARGIN = 5;
	static readonly #LINE_HEIGHT = 18;

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_contentWidget = new CTextEditContentWidget(this);
		this.setWidget(this.#m_contentWidget);

		this.#m_cursorTimer.setInterval(500);
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

	toPlainText(): string {
		return this.#m_document.toPlainText();
	}

	toHtml(): string {
		const text = this.#m_document.toPlainText();

		if (text.length === 0)
			return "";

		let html = "";

		for (const range of this.#m_document.formatRanges()) {
			const start = range.start;
			const end = range.start + range.length;
			const fragment = text.slice(start, end);

			if (fragment.length === 0)
				continue;

			html += this.#formatHtmlFragment(
				fragment,
				range.format
			);
		}

		return html;
	}

	setHtml(html: string): void {
		const parsed = this.#parseHtml(html);
		const hadSelection = this.hasSelection();

		this.#m_undoStack = [];
		this.#m_redoStack = [];
		this.#m_undoGroup = null;

		this.#m_document.setPlainText(parsed.plainText);

		for (const range of parsed.ranges) {
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

		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	setPlainText(text: string): void {
		if (this.#m_document.toPlainText() === text)
			return;

		const hadSelection = this.hasSelection();

        this.#m_undoStack = [];
		this.#m_redoStack = [];
		this.#m_undoGroup = null;

		this.#m_document.setPlainText(text);
		this.#m_cursorPosition = text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.#syncCurrentCharFormatFromCursor();

		this.textChanged.emit();

		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	clear(): void {
		if (this.#m_document.length() === 0)
			return;

		this.#pushUndoState();

		const hadSelection = this.hasSelection();

		this.#m_document.clear();
		this.#m_cursorPosition = 0;
		this.#m_selectionAnchor = 0;
		this.#m_currentCharFormat = new CTextCharFormat();

		this.textChanged.emit();

		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	isReadOnly(): boolean {
		return this.#m_readOnly;
	}

	setReadOnly(readOnly: boolean = true): void {
		if (this.#m_readOnly === readOnly)
			return;

		this.#m_readOnly = readOnly;
		this.#m_contentWidget.update();
	}

	override cursor(): CCursorShape {
		return this.isEnabled()
			? CCursorShape.IBeam
			: CCursorShape.Disabled;
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

	selectionStart(): number {
		return Math.min(
			this.#m_selectionAnchor,
			this.#m_cursorPosition
		);
	}

	selectionEnd(): number {
		return Math.max(
			this.#m_selectionAnchor,
			this.#m_cursorPosition
		);
	}

	hasSelection(): boolean {
		return this.#m_selectionAnchor !== this.#m_cursorPosition;
	}

	selectedText(): string {
		if (!this.hasSelection())
			return "";

		return this.#m_document.toPlainText().slice(
			this.selectionStart(),
			this.selectionEnd()
		);
	}

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

		if (oldAnchor === this.#m_selectionAnchor
			&& oldPosition === this.#m_cursorPosition)
			return;

		this.selectionChanged.emit();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	clearSelection(): void {
		if (!this.hasSelection())
			return;

		this.#breakUndoGroup();
		this.#m_selectionAnchor = this.#m_cursorPosition;

		this.selectionChanged.emit();
		this.#m_contentWidget.update();
	}

	selectAll(): void {
		this.setSelection(0, this.#m_document.length());
	}

	insert(text: string): void {
		this.#insert(text, null);
	}
	
	protected textDocument(): CTextDocument {
		return this.#m_document;
	}

	currentCharFormat(): CTextCharFormat {
		if (this.hasSelection() && this.#m_document.length() > 0)
			return this.#m_document.charFormatAt(this.selectionStart());

		return this.#m_currentCharFormat.clone();
	}

	setCurrentCharFormat(format: CTextCharFormat): void {
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

	setFontBold(bold: boolean): void {
		this.#modifyCurrentFormats(format => {
			format.setFontBold(bold);
		});
	}

	setFontItalic(italic: boolean): void {
		this.#modifyCurrentFormats(format => {
			format.setFontItalic(italic);
		});
	}

	setTextColor(color: string | null): void {
		this.#modifyCurrentFormats(format => {
			format.setForeground(color);
		});
	}

	setFontFamily(family: string | null): void {
		this.#modifyCurrentFormats(format => {
			format.setFontFamily(family);
		});
	}

	setFontSize(size: number | null): void {
		this.#modifyCurrentFormats(format => {
			format.setFontSize(size);
		});
	}

	canUndo(): boolean {
		return this.#m_undoStack.length > 0;
	}

	canRedo(): boolean {
		return this.#m_redoStack.length > 0;
	}

	undo(): void {
		this.#breakUndoGroup();
		const state = this.#m_undoStack.pop();

		if (state === undefined)
			return;

		this.#m_redoStack.push(this.#currentState());
		this.#restoreState(state);
	}

	redo(): void {
		this.#breakUndoGroup();
		const state = this.#m_redoStack.pop();

		if (state === undefined)
			return;

		this.#m_undoStack.push(this.#currentState());
		this.#restoreState(state);
	}

	copy(): void {
		if (!this.hasSelection())
			return;

		CClipboard.instance().setText(this.selectedText());
	}

	cut(): void {
		if (!this.hasSelection())
			return;

		CClipboard.instance().setText(this.selectedText());

		if (this.isReadOnly())
			return;

		this.#deleteSelection();
	}

	paste(): void {
		if (this.isReadOnly())
			return;

		const text = CClipboard.instance().text();

		if (text.length === 0)
			return;

		this.insert(text);
	}

	override sizeHint(): CSize {
		return new CSize(240, 120);
	}

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);
		this.#updateContentGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateContentGeometry();
	}

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

	handleMousePress(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
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

	handleMouseMove(event: CMouseEvent): void {
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		const position = this.#cursorPositionAt(
			event.x(),
			event.y()
		);

		this.#moveCursor(position, true);
		event.accept();
	}

	handleMouseRelease(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		this.#m_selectingWithMouse = false;

		const position = this.#cursorPositionAt(
			event.x(),
			event.y()
		);

		this.#moveCursor(position, true);
		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.ctrl()) {
			switch (event.key().toLowerCase()) {
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

		switch (event.key()) {
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
			if (!this.isReadOnly()) {
				this.#breakUndoGroup();
				this.insert("\n");
			}

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
			if (this.isReadOnly()) {
				event.accept();
				return;
			}

			if (this.#deleteSelection()) {
				event.accept();
				return;
			}

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

		if (event.key().length === 1 && !event.ctrl()) {
			this.#insert(event.key(), "insert");
			event.accept();
			return;
		}

		event.ignore();
	}

	protected override focusInEvent(event: CFocusEvent): void {
		this.#startCursorBlink();
		event.accept();
		this.#m_contentWidget.update();
	}

	protected override focusOutEvent(
		event: CFocusEvent
	): void {
		this.#m_selectingWithMouse = false;
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
		if (text.length === 0)
			return;

		const palette = this.palette();
		const lineEnd = lineStart + text.length;
		let currentX = x;

		for (const range of this.#m_document.formatRanges()) {
			const start = Math.max(lineStart, range.start);
			const end = Math.min(
				lineEnd,
				range.start + range.length
			);

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

			const selectionStart = Math.max(
				start,
				this.selectionStart()
			);
			const selectionEnd = Math.min(
				end,
				this.selectionEnd()
			);

			if (!this.hasSelection()
				|| selectionStart >= selectionEnd) {
				painter.setPen(
					range.format.foreground()
						?? palette.color(textRole).toCss()
				);
				painter.drawText(segment, currentX, y);
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

			if (before.length > 0) {
				painter.setPen(
					range.format.foreground()
						?? palette.color(textRole).toCss()
				);
				painter.drawText(before, currentX, y);
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

			if (after.length > 0) {
				painter.setPen(
					range.format.foreground()
						?? palette.color(textRole).toCss()
				);
				painter.drawText(
					after,
					currentX + beforeWidth + selectedWidth,
					y
				);
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

		if (length === 0)
			return height;

		const end = start + length;

		for (const range of this.#m_document.formatRanges()) {
			const rangeStart = Math.max(start, range.start);
			const rangeEnd = Math.min(
				end,
				range.start + range.length
			);

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

		for (let i = 0; i < lines.length; ++i) {
			const line = lines[i]!;
			const end =
				line.start + line.text.length;

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

	#moveCursorVertical(direction: number, keepAnchor: boolean): void {
		const lines = this.#lines();

		const current = this.#lineColumnAt(
			this.#m_cursorPosition
		);

		const targetLine = Math.max(0, Math.min(current.line + direction, lines.length - 1));
		if (targetLine === current.line)
			return;

		const line = lines[targetLine]!;

		const column = Math.min(current.column, line.text.length);

		this.#moveCursor(line.start + column, keepAnchor);
	}

	#cursorPositionAt(x: number, y: number): number {
		const layouts = this.#lineLayouts();
		const margin = CTextEdit.#TEXT_MARGIN;

		let lineIndex = 0;

		if (y <= margin) {
			lineIndex = 0;
		}
		else {
			lineIndex = layouts.length - 1;

			for (let i = 0; i < layouts.length; ++i) {
				const line = layouts[i]!;

				if (y < line.y + line.height) {
					lineIndex = i;
					break;
				}
			}
		}

		const line = layouts[lineIndex]!;
		const textX = x - margin;

		if (textX <= 0)
			return line.start;

		let previousWidth = 0;

		for (let i = 1; i <= line.text.length; ++i) {
			const width = this.#textWidth(line.start, i);
			const middle = (previousWidth + width) / 2;

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

		if (this.#m_cursorPosition === clamped && (keepAnchor || this.#m_selectionAnchor === clamped))
			return;

		const oldAnchor = this.#m_selectionAnchor;
		const oldPosition = this.#m_cursorPosition;

		this.#m_cursorPosition = clamped;

		if (!keepAnchor) {
			this.#m_selectionAnchor = clamped;
			this.#syncCurrentCharFormatFromCursor();
		}

		if (oldAnchor !== this.#m_selectionAnchor || oldPosition !== this.#m_cursorPosition)
			this.selectionChanged.emit();

		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}

	#deleteSelection(): boolean {
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

		if (layouts.length === 0)
			return 2 * CTextEdit.#TEXT_MARGIN;

		const last = layouts[layouts.length - 1]!;

		return last.y + last.height + CTextEdit.#TEXT_MARGIN;
	}

	#updateContentGeometry(): void {
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
		if (!this.hasFocus())
			return;

		this.#startCursorBlink();
	}

	#textWidth(start: number, length: number): number {
		if (length <= 0)
			return 0;

		const end = start + length;
		const text = this.#m_document.toPlainText();
		let width = 0;

		for (const range of this.#m_document.formatRanges()) {
			const rangeStart = Math.max(start, range.start);
			const rangeEnd = Math.min(
				end,
				range.start + range.length
			);

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

	#fontForFormat(format: CTextCharFormat): string {
		let font = this.font();

		if (format.fontSize() !== null) {
			font = font.replace(
				/(\d+(?:\.\d+)?)px/,
				`${format.fontSize()}px`
			);
		}

		if (format.fontFamily() !== null) {
			const family = format.fontFamily()!;
			font = font.replace(
				/(\d+(?:\.\d+)?)px(?:\/[^\s]+)?\s+.+$/,
				(_match, size: string) =>
					`${size}px ${family}`
			);
		}

		const prefixes: string[] = [];

		if (format.fontItalic())
			prefixes.push("italic");

		if (format.fontBold())
			prefixes.push("bold");

		return prefixes.length > 0
			? `${prefixes.join(" ")} ${font}`
			: font;
	}

	#formatHtmlFragment(text: string, format: CTextCharFormat): string {
		const parts = text.split("\n");
		let html = "";

		for (let i = 0; i < parts.length; ++i) {
			if (i > 0)
				html += "<br>";

			const part = parts[i]!;

			if (part.length === 0)
				continue;

			let content = this.#encodeHtmlEntities(part);
			const styles: string[] = [];

			if (format.foreground() !== null)
				styles.push(`color: ${format.foreground()}`);
			if (format.fontSize() !== null)
				styles.push(`font-size: ${format.fontSize()}px`);
			if (format.fontFamily() !== null) {
				styles.push(`font-family: ${this.#escapeHtmlStyleValue(format.fontFamily()!)}`);
			}

			if (styles.length > 0)
				content = `<span style="${styles.join("; ")}">${content}</span>`;
			if (format.fontItalic())
				content = `<i>${content}</i>`;
			if (format.fontBold())
				content = `<b>${content}</b>`;
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

			if (text.length === 0)
				return;

			if (
				(plainText.length === 0 || plainText.endsWith("\n")) &&
				text.startsWith(" ")
			)
				text = text.slice(1);

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
			modifier(format);
			formatStack.push(format);
		};

		const popFormat = (): void => {
			if (formatStack.length > 1)
				formatStack.pop();
		};

		const tokens = html.match(/<[^>]*>|[^<]+/g) ?? [];

		for (const token of tokens) {
			if (!token.startsWith("<")) {
				appendText(token);
				continue;
			}

			const match =
				/^<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>$/.exec(token);

			if (match === null)
				continue;

			const closing = match[1] === "/";
			const tag = match[2]!.toLowerCase();
			const attributes = match[3] ?? "";

			if (tag === "br") {
				appendNewLine();
				continue;
			}

			if (tag === "p" || tag === "div") {
				if (closing)
					appendNewLine();
				else if (plainText.length > 0 && !plainText.endsWith("\n"))
					appendNewLine();

				continue;
			}

			if (tag === "b" || tag === "strong") {
				if (closing)
					popFormat();
				else
					pushModifiedFormat(format => format.setFontBold(true));
				continue;
			}

			if (tag === "i" || tag === "em") {
				if (closing)
					popFormat();
				else
					pushModifiedFormat(format => format.setFontItalic(true));
				continue;
			}

			const headingMatch = /^h([1-3])$/.exec(tag);

			if (headingMatch !== null) {
				if (closing) {
					popFormat();
					appendNewLine();
				}
				else {
					if (plainText.length > 0 && !plainText.endsWith("\n"))
						appendNewLine();

					const heading = Number(headingMatch[1]);
					const factor = heading === 1
						? 1.8
						: heading === 2
							? 1.5
							: 1.25;

					pushModifiedFormat(format => {
						format.setFontBold(true);
						format.setFontSize(
							this.#baseFontPixelSize() * factor
						);
					});
				}
				continue;
			}

			if (tag === "span") {
				if (closing) {
					popFormat();
					continue;
				}

				pushModifiedFormat(format => {
					this.#applyInlineStyle(format, attributes);
				});
			}
		}

		while (plainText.endsWith("\n")) {
			plainText = plainText.slice(0, -1);

			const last = ranges[ranges.length - 1];
			if (last === undefined)
				break;

			if (last.start + last.length > plainText.length) {
				const newLength = plainText.length - last.start;
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

		if (styleMatch === null)
			return;

		const style = styleMatch[1] ?? styleMatch[2] ?? "";

		for (const declaration of style.split(";")) {
			const colon = declaration.indexOf(":");
			if (colon < 0)
				continue;

			const property = declaration.slice(0, colon).trim().toLowerCase();
			const value = declaration.slice(colon + 1).trim();

			if (property === "color" && value.length > 0) {
				format.setForeground(value);
				continue;
			}

			if (property === "font-size") {
				const sizeMatch = /^(\d+(?:\.\d+)?)px$/i.exec(value);
				if (sizeMatch !== null)
					format.setFontSize(Number(sizeMatch[1]));
				continue;
			}

			if (property === "font-family" && value.length > 0) {
				format.setFontFamily(
					value.replace(/^['"]|['"]$/g, "")
				);
				continue;
			}

			if (property === "font-weight") {
				const numericWeight = Number(value);
				format.setFontBold(
					value.toLowerCase() === "bold" ||
					(Number.isFinite(numericWeight) && numericWeight >= 600)
				);
				continue;
			}

			if (property === "font-style") {
				format.setFontItalic(value.toLowerCase() === "italic");
			}
		}
	}

	#baseFontPixelSize(): number {
		const match = /(\d+(?:\.\d+)?)px/.exec(this.font());
		return match === null ? 14 : Number(match[1]);
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
				if (entity.startsWith("#x")) {
					const code = Number.parseInt(entity.slice(2), 16);
					return Number.isFinite(code)
						? String.fromCodePoint(code)
						: match;
				}

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
		if (!this.hasSelection()) {
			const format = this.#m_currentCharFormat.clone();
			modify(format);
			this.#m_currentCharFormat = format;
			return;
		}

		this.#pushUndoState();

		const start = this.selectionStart();
		const end = this.selectionEnd();

		for (const range of this.#m_document.formatRanges()) {
			const rangeStart = Math.max(start, range.start);
			const rangeEnd = Math.min(
				end,
				range.start + range.length
			);

			if (rangeStart >= rangeEnd)
				continue;

			const format = range.format.clone();
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
		if (this.#m_restoringHistory)
			return;

		if (group === null || group !== this.#m_undoGroup)
			this.#m_undoStack.push(this.#currentState());

		this.#m_undoGroup = group;
		this.#m_redoStack = [];
	}

	#breakUndoGroup(): void {
		this.#m_undoGroup = null;
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

		if (textChanged)
			this.textChanged.emit();

		if (hadSelection !== this.hasSelection() || this.hasSelection())
			this.selectionChanged.emit();

		this.#m_restoringHistory = false;
	}

	#insert(text: string, group: CTextEditUndoGroup): void {
		if (text.length === 0 || this.isReadOnly())
			return;

		this.#pushUndoState(group);
		const hadSelection = this.hasSelection();

		const start = hadSelection? this.selectionStart() : this.#m_cursorPosition;
		const end = hadSelection? this.selectionEnd() : this.#m_cursorPosition;

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

		if (hadSelection)
			this.selectionChanged.emit();

		this.#updateContentGeometry();
		this.#ensureCursorVisible();
		this.#resetCursorBlink();
		this.#m_contentWidget.update();
	}
}