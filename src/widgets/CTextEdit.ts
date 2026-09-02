import { CSignal } from "../core/CSignal.js";
import { CTimer } from "../core/CTimer.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";

export class CTextEdit extends CWidget {
	readonly textChanged = new CSignal<[]>();
	readonly selectionChanged = new CSignal<[]>();

	#m_text = "";
	#m_cursorPosition = 0;
	#m_selectionAnchor = 0;
	#m_selectingWithMouse = false;
	#m_readOnly = false;

	#m_cursorVisible = true;
	#m_cursorTimer = new CTimer(this);

	static readonly #TEXT_MARGIN = 5;
	static readonly #LINE_HEIGHT = 18;

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_cursorTimer.setInterval(500);
		this.#m_cursorTimer.timeout.connect(() => {
			this.#m_cursorVisible = !this.#m_cursorVisible;
			this.update();
		});
	}

	toPlainText(): string {
		return this.#m_text;
	}

	setPlainText(text: string): void {
		if (this.#m_text === text)
			return;

		const hadSelection = this.hasSelection();

		this.#m_text = text;
		this.#m_cursorPosition = text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;

		this.textChanged.emit();

		if (hadSelection)
			this.selectionChanged.emit();

		this.#resetCursorBlink();
		this.update();
	}

	clear(): void {
		this.setPlainText("");
	}

	isReadOnly(): boolean {
		return this.#m_readOnly;
	}

	setReadOnly(readOnly: boolean = true): void {
		if (this.#m_readOnly === readOnly)
			return;

		this.#m_readOnly = readOnly;
		this.update();
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
		const oldAnchor = this.#m_selectionAnchor;
		const oldPosition = this.#m_cursorPosition;

		this.#m_selectionAnchor = Math.max(0, Math.min(anchor, length));
		this.#m_cursorPosition = Math.max(0, Math.min(position, length));

		if (oldAnchor === this.#m_selectionAnchor
			&& oldPosition === this.#m_cursorPosition)
			return;

		this.selectionChanged.emit();
		this.#resetCursorBlink();
		this.update();
	}

	clearSelection(): void {
		if (!this.hasSelection())
			return;

		this.#m_selectionAnchor = this.#m_cursorPosition;
		this.selectionChanged.emit();
		this.update();
	}

	selectAll(): void {
		this.setSelection(0, this.#m_text.length);
	}

	insert(text: string): void {
		if (text.length === 0 || this.isReadOnly())
			return;

		const hadSelection = this.hasSelection();
		const start = hadSelection
			? this.selectionStart() : this.#m_cursorPosition;
		const end = hadSelection
			? this.selectionEnd() : this.#m_cursorPosition;

		this.#m_text = this.#m_text.slice(0, start)
			+ text + this.#m_text.slice(end);

		this.#m_cursorPosition = start + text.length;
		this.#m_selectionAnchor = this.#m_cursorPosition;

		this.textChanged.emit();

		if (hadSelection)
			this.selectionChanged.emit();

		this.#resetCursorBlink();
		this.update();
	}

	async copy(): Promise<void> {
		if (!this.hasSelection())
			return;

		await navigator.clipboard.writeText(this.selectedText());
	}

	async cut(): Promise<void> {
		if (!this.hasSelection())
			return;

		await navigator.clipboard.writeText(this.selectedText());

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

	override sizeHint(): CSize {
		return new CSize(240, 120);
	}

	protected override paintEvent(painter: CPainter): void {
		const palette = this.palette();
		const metrics = new CFontMetrics(this.font());
		const margin = CTextEdit.#TEXT_MARGIN;
		const lineHeight = CTextEdit.#LINE_HEIGHT;

		painter.setBrush(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(this.rect());

		painter.setPen(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(this.rect());

		painter.setFont(this.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("top");

		const textRole = this.isEnabled()? CPaletteColorRole.Text : CPaletteColorRole.DisabledText;
		const lines = this.#lines();

		for (let line = 0; line < lines.length; ++line) {
			const info = lines[line]!;
			const y = margin + line * lineHeight;

			if (y >= this.height())
				break;

			this.#paintLine(
				painter, metrics, info.text, info.start, margin, y, textRole
			);
		}

		if (this.hasFocus() && this.#m_cursorVisible) {
			const position = this.#lineColumnAt(this.#m_cursorPosition);
			const line = lines[position.line]!;

			const cursorX = margin
				+ metrics.textWidth(line.text.slice(0, position.column));
			const cursorY = margin + position.line * lineHeight;

			painter.setPen(palette.color(CPaletteColorRole.Text).toCss());
			painter.drawLine(cursorX, cursorY, cursorX, cursorY + lineHeight);
		}
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
			}
		}

		switch (event.key()) {
		case "ArrowLeft":
			this.#moveCursor(
				this.#m_cursorPosition - 1, event.shift()
			);
			event.accept();
			return;

		case "ArrowRight":
			this.#moveCursor(
				this.#m_cursorPosition + 1, event.shift()
			);
			event.accept();
			return;

		case "ArrowUp":
			this.#moveCursorVertical(-1, event.shift());
			event.accept();
			return;

		case "ArrowDown":
			this.#moveCursorVertical(1, event.shift());
			event.accept();
			return;

		case "Home":
			this.#moveCursor(
				this.#lineStart(this.#m_cursorPosition), event.shift()
			);
			event.accept();
			return;

		case "End":
			this.#moveCursor(
				this.#lineEnd(this.#m_cursorPosition), event.shift()
			);
			event.accept();
			return;

		case "Enter":
			if (!this.isReadOnly())
				this.insert("\n");
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
				this.#m_text =
					this.#m_text.slice(0, this.#m_cursorPosition - 1)
					+ this.#m_text.slice(this.#m_cursorPosition);

				--this.#m_cursorPosition;
				this.#m_selectionAnchor = this.#m_cursorPosition;

				this.textChanged.emit();
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
				this.#m_text =
					this.#m_text.slice(0, this.#m_cursorPosition)
					+ this.#m_text.slice(this.#m_cursorPosition + 1);

				this.#m_selectionAnchor = this.#m_cursorPosition;

				this.textChanged.emit();
				this.#resetCursorBlink();
				this.update();
			}

			event.accept();
			return;
		}

		if (event.key().length === 1 && !event.ctrl()) {
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

		const position = this.#cursorPositionAt(event.x(), event.y());

		this.#m_cursorPosition = position;
		this.#m_selectionAnchor = position;
		this.#m_selectingWithMouse = true;

		this.#resetCursorBlink();
		event.accept();
		this.update();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		const position = this.#cursorPositionAt(event.x(), event.y());

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

		const position = this.#cursorPositionAt(event.x(), event.y());
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
		super.focusOutEvent(event);
	}

	#paintLine(
		painter: CPainter,
		metrics: CFontMetrics,
		text: string,
		lineStart: number,
		x: number,
		y: number,
		textRole: CPaletteColorRole
	): void {
		const palette = this.palette();
		const selectionStart = this.selectionStart();
		const selectionEnd = this.selectionEnd();
		const lineEnd = lineStart + text.length;

		const start = Math.max(selectionStart, lineStart);
		const end = Math.min(selectionEnd, lineEnd);

		if (!this.hasSelection() || start >= end) {
			painter.setPen(palette.color(textRole).toCss());
			painter.drawText(text, x, y);
			return;
		}

		const localStart = start - lineStart;
		const localEnd = end - lineStart;

		const before = text.slice(0, localStart);
		const selected = text.slice(localStart, localEnd);
		const after = text.slice(localEnd);

		const selectionX = x + metrics.textWidth(before);
		const selectionWidth = metrics.textWidth(selected);

		painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
		painter.fillRect(new CRect(selectionX, y, selectionWidth, CTextEdit.#LINE_HEIGHT));

		painter.setBrush(palette.color(textRole).toCss());
		painter.drawText(before, x, y);

		painter.setPen(palette.color(CPaletteColorRole.HighlightedText).toCss());
		painter.drawText(selected, selectionX, y);

		painter.setPen(palette.color(textRole).toCss());
		painter.drawText(after, selectionX + selectionWidth, y);
	}

	#lines(): { text: string; start: number }[] {
		const result: { text: string; start: number }[] = [];
		const lines = this.#m_text.split("\n");
		let start = 0;

		for (const text of lines) {
			result.push({ text, start });
			start += text.length + 1;
		}

		return result;
	}

	#lineColumnAt(position: number): {
		line: number;
		column: number;
	} {
		const lines = this.#lines();

		for (let i = 0; i < lines.length; ++i) {
			const line = lines[i]!;
			const end = line.start + line.text.length;

			if (position <= end)
				return {
					line: i,
					column: position - line.start
				};
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
		const current = this.#lineColumnAt(this.#m_cursorPosition);
		const targetLine = Math.max(
			0, Math.min(current.line + direction, lines.length - 1)
		);

		if (targetLine === current.line)
			return;

		const line = lines[targetLine]!;
		const column = Math.min(current.column, line.text.length);

		this.#moveCursor(line.start + column, keepAnchor);
	}

	#cursorPositionAt(x: number, y: number): number {
		const metrics = new CFontMetrics(this.font());
		const lines = this.#lines();
		const margin = CTextEdit.#TEXT_MARGIN;

		const lineIndex = Math.max(0, Math.min(
			Math.floor((y - margin) / CTextEdit.#LINE_HEIGHT),
			lines.length - 1
		));

		const line = lines[lineIndex]!;
		const textX = x - margin;

		if (textX <= 0)
			return line.start;

		for (let i = 1; i <= line.text.length; ++i) {
			const previousWidth = metrics.textWidth(
				line.text.slice(0, i - 1)
			);
			const width = metrics.textWidth(line.text.slice(0, i));
			const middle = (previousWidth + width) / 2;

			if (textX < middle)
				return line.start + i - 1;
		}

		return line.start + line.text.length;
	}

	#moveCursor(position: number, keepAnchor: boolean): void {
		const clamped = Math.max(
			0, Math.min(position, this.#m_text.length)
		);

		if (this.#m_cursorPosition === clamped
			&& (keepAnchor || this.#m_selectionAnchor === clamped))
			return;

		const oldAnchor = this.#m_selectionAnchor;
		const oldPosition = this.#m_cursorPosition;

		this.#m_cursorPosition = clamped;

		if (!keepAnchor)
			this.#m_selectionAnchor = clamped;

		if (oldAnchor !== this.#m_selectionAnchor
			|| oldPosition !== this.#m_cursorPosition)
			this.selectionChanged.emit();

		this.#resetCursorBlink();
		this.update();
	}

	#deleteSelection(): boolean {
		if (!this.hasSelection() || this.isReadOnly())
			return false;

		const start = this.selectionStart();
		const end = this.selectionEnd();

		this.#m_text =
			this.#m_text.slice(0, start) + this.#m_text.slice(end);

		this.#m_cursorPosition = start;
		this.#m_selectionAnchor = start;

		this.textChanged.emit();
		this.selectionChanged.emit();
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