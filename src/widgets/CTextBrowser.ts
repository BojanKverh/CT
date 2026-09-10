import { CTextEdit } from "./CTextEdit.js";
import { CWidget } from "./CWidget.js";
import { CSignal } from "../core/CSignal.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import type { CPainter } from "../painting/CPainter.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CRect } from "../geometry/CRect.js";
import {
	CMouseButton,
	type CMouseEvent
} from "../events/CMouseEvent.js";

type CRichTextStyle = {
	bold: boolean;
	italic: boolean;
	heading: number;
	href: string | null;
};

type CRichTextRun = CRichTextStyle & {
	text: string;
	start: number;
	end: number;
};

type CRichTextLine = {
	runs: CRichTextRun[];
	start: number;
	end: number;
};

type CLaidOutRun = CRichTextRun & {
	x: number;
	width: number;
	font: string;
};

type CLaidOutLine = {
	runs: CLaidOutRun[];
	y: number;
	height: number;
	start: number;
	end: number;
};

/**
 * Read-only rich-text viewer.
 *
 * Supported HTML in the first implementation:
 *   <b>, <strong>, <i>, <em>, <p>, <div>, <br>, <h1>, <h2>, <h3>
 *
 * Unknown tags are ignored while their text content is preserved.
 */
export class CTextBrowser extends CTextEdit {
	readonly anchorClicked = new CSignal<[string]>();

	static readonly TextMargin = 5;
	static readonly DefaultLineHeight = 18;

	#m_html = "";
	#m_htmlMode = false;
	#m_lines: CRichTextLine[] = [];
	#m_selectingWithMouse = false;
	#m_selectionAnchor = 0;
	#m_pressedAnchor: string | null = null;
	#m_hoveredAnchor: string | null = null;

	constructor(parent: CWidget | null = null) {
		super(parent);
		super.setReadOnly(true);
	}

	override setReadOnly(_readOnly: boolean = true): void {
		super.setReadOnly(true);
	}

	override cursor(): CCursorShape {
		if (this.#m_htmlMode && this.#m_hoveredAnchor !== null)
			return CCursorShape.PointingHand;

		return super.cursor();
	}

	override setPlainText(text: string): void {
		this.#m_html = "";
		this.#m_htmlMode = false;
		this.#m_lines = [];

		super.setPlainText(text);
		this.setCursorPosition(0);
	}

	setHtml(html: string): void {
		const parsed = this.#parseHtml(html);

		this.#m_html = html;
		this.#m_htmlMode = true;
		this.#m_lines = parsed.lines;

		super.setPlainText(parsed.plainText);
		this.setCursorPosition(0);

		this.#updateHtmlContentGeometry();
		this.widget()?.update();
	}

	toHtml(): string {
		return this.#m_htmlMode ? this.#m_html : "";
	}

	override clear(): void {
		this.#m_html = "";
		this.#m_htmlMode = false;
		this.#m_lines = [];
		super.clear();
	}

	override canUndo(): boolean {
		return false;
	}

	override canRedo(): boolean {
		return false;
	}

	override undo(): void {
		// CTextBrowser is not user-editable.
	}

	override redo(): void {
		// CTextBrowser is not user-editable.
	}

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);

		if (this.#m_htmlMode)
			this.#updateHtmlContentGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);

		if (this.#m_htmlMode)
			this.#updateHtmlContentGeometry();
	}

	override paintText(painter: CPainter): void {
		if (!this.#m_htmlMode) {
			super.paintText(painter);
			return;
		}

		const content = this.widget();
		if (content === null)
			return;

		const palette = this.palette();
		painter.setBrush(
			palette.color(CPaletteColorRole.Base).toCss()
		);
		painter.fillRect(content.rect());
		painter.setTextAlign("left");
		painter.setTextBaseline("top");

		const textRole = this.isEnabled()
			? CPaletteColorRole.Text
			: CPaletteColorRole.DisabledText;

		for (const line of this.#layoutLines()) {
			for (const run of line.runs) {
				this.#paintRun(
					painter,
					run,
					line.y,
					line.height,
					textRole
				);
			}
		}
	}

	override handleMousePress(event: CMouseEvent): void {
		if (!this.#m_htmlMode) {
			super.handleMousePress(event);
			return;
		}

		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.setFocus();

		const position = this.#positionAt(
			event.x(),
			event.y()
		);

		this.#m_selectionAnchor = position;
		this.#m_selectingWithMouse = true;
		this.#m_pressedAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);
		this.setSelection(position, position);

		event.accept();
		this.widget()?.update();
	}

	override handleMouseMove(event: CMouseEvent): void {
		if (!this.#m_htmlMode) {
			super.handleMouseMove(event);
			return;
		}

		const hoveredAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);

		if (hoveredAnchor !== this.#m_hoveredAnchor) {
			this.#m_hoveredAnchor = hoveredAnchor;
			this.widget()?.update();
		}

		if (!this.#m_selectingWithMouse) {
			event.accept();
			return;
		}

		const position = this.#positionAt(
			event.x(),
			event.y()
		);

		this.setSelection(
			this.#m_selectionAnchor,
			position
		);

		event.accept();
	}

	override handleMouseRelease(event: CMouseEvent): void {
		if (!this.#m_htmlMode) {
			super.handleMouseRelease(event);
			return;
		}

		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (!this.#m_selectingWithMouse) {
			event.ignore();
			return;
		}

		this.#m_selectingWithMouse = false;

		const position = this.#positionAt(
			event.x(),
			event.y()
		);

		this.setSelection(
			this.#m_selectionAnchor,
			position
		);

		const releasedAnchor = this.#anchorAt(
			event.x(),
			event.y()
		);

		if (
			this.#m_pressedAnchor !== null &&
			this.#m_pressedAnchor === releasedAnchor &&
			!this.hasSelection()
		) {
			this.anchorClicked.emit(
				this.#m_pressedAnchor
			);
		}

		this.#m_pressedAnchor = null;
		event.accept();
	}

	#paintRun(
		painter: CPainter,
		run: CLaidOutRun,
		y: number,
		lineHeight: number,
		textRole: CPaletteColorRole
	): void {
		const palette = this.palette();
		const selectionStart = this.selectionStart();
		const selectionEnd = this.selectionEnd();

		const start = Math.max(
			selectionStart,
			run.start
		);
		const end = Math.min(
			selectionEnd,
			run.end
		);

		painter.setFont(run.font);

		const normalColor = run.href !== null
			? palette.color(CPaletteColorRole.Link).toCss()
			: palette.color(textRole).toCss();

		if (!this.hasSelection() || start >= end) {
			painter.setPen(normalColor);
			painter.drawText(run.text, run.x, y);

			if (run.href !== null) {
				painter.drawLine(
					run.x,
					y + lineHeight - 3,
					run.x + run.width,
					y + lineHeight - 3
				);
			}

			return;
		}

		const localStart = start - run.start;
		const localEnd = end - run.start;

		const before = run.text.slice(0, localStart);
		const selected = run.text.slice(
			localStart,
			localEnd
		);
		const after = run.text.slice(localEnd);

		const metrics = new CFontMetrics(run.font);
		const beforeWidth = metrics.textWidth(before);
		const selectedWidth =
			metrics.textWidth(selected);

		const selectionX = run.x + beforeWidth;

		painter.setBrush(
			palette.color(
				CPaletteColorRole.Highlight
			).toCss()
		);
		painter.fillRect(
			new CRect(
				selectionX,
				y,
				selectedWidth,
				lineHeight
			)
		);

		painter.setPen(normalColor);
		painter.drawText(before, run.x, y);

		painter.setPen(
			palette.color(
				CPaletteColorRole.HighlightedText
			).toCss()
		);
		painter.drawText(
			selected,
			selectionX,
			y
		);

		painter.setPen(normalColor);
		painter.drawText(
			after,
			selectionX + selectedWidth,
			y
		);
	}

	#layoutLines(): CLaidOutLine[] {
		const result: CLaidOutLine[] = [];
		let y = CTextBrowser.TextMargin;

		for (const line of this.#m_lines) {
			let x = CTextBrowser.TextMargin;
			let lineHeight =
				CTextBrowser.DefaultLineHeight;

			const laidOutRuns: CLaidOutRun[] = [];

			for (const run of line.runs) {
				const font = this.#fontFor(run);
				const metrics = new CFontMetrics(font);
				const width =
					metrics.textWidth(run.text);

				lineHeight = Math.max(
					lineHeight,
					this.#lineHeightFor(run)
				);

				laidOutRuns.push({
					...run,
					x,
					width,
					font
				});

				x += width;
			}

			result.push({
				runs: laidOutRuns,
				y,
				height: lineHeight,
				start: line.start,
				end: line.end
			});

			y += lineHeight;
		}

		return result;
	}

	#positionAt(x: number, y: number): number {
		const lines = this.#layoutLines();

		if (lines.length === 0)
			return 0;

		let line = lines[lines.length - 1]!;

		for (const candidate of lines) {
			if (y < candidate.y + candidate.height) {
				line = candidate;
				break;
			}
		}

		if (line.runs.length === 0)
			return line.start;

		for (const run of line.runs) {
			if (x >= run.x + run.width)
				continue;

			if (x <= run.x)
				return run.start;

			const metrics = new CFontMetrics(run.font);
			const localX = x - run.x;

			for (let i = 1; i <= run.text.length; ++i) {
				const previousWidth =
					metrics.textWidth(
						run.text.slice(0, i - 1)
					);
				const width =
					metrics.textWidth(
						run.text.slice(0, i)
					);

				if (localX <
					(previousWidth + width) / 2) {
					return run.start + i - 1;
				}
			}

			return run.end;
		}

		return line.end;
	}

	#anchorAt(x: number, y: number): string | null {
		for (const line of this.#layoutLines()) {
			if (y < line.y || y >= line.y + line.height)
				continue;

			for (const run of line.runs) {
				if (
					run.href !== null &&
					x >= run.x &&
					x < run.x + run.width
				)
					return run.href;
			}
		}

		return null;
	}

	#updateHtmlContentGeometry(): void {
		if (!this.#m_htmlMode)
			return;

		const content = this.widget();
		if (content === null)
			return;

		const lines = this.#layoutLines();

		let width = 2 * CTextBrowser.TextMargin;
		let height = 2 * CTextBrowser.TextMargin;

		for (const line of lines) {
			const lineWidth = line.runs.reduce(
				(total, run) => total + run.width,
				0
			);

			width = Math.max(
				width,
				lineWidth +
					2 * CTextBrowser.TextMargin
			);

			height += line.height;
		}

		content.resize(
			Math.max(this.viewport().width(), width),
			Math.max(this.viewport().height(), height)
		);

		this.updateScrollBars();

		content.resize(
			Math.max(this.viewport().width(), width),
			Math.max(this.viewport().height(), height)
		);

		this.updateScrollBars();
		content.update();
	}

	#fontFor(style: CRichTextStyle): string {
		let font = this.font();

		if (style.heading > 0) {
			const factor =
				style.heading === 1
					? 1.8
					: style.heading === 2
						? 1.5
						: 1.25;

			font = this.#scaledFont(font, factor);
		}

		const prefixes: string[] = [];

		if (style.italic)
			prefixes.push("italic");

		if (style.bold || style.heading > 0)
			prefixes.push("bold");

		return prefixes.length > 0
			? `${prefixes.join(" ")} ${font}`
			: font;
	}

	#lineHeightFor(style: CRichTextStyle): number {
		const size = this.#fontPixelSize(
			this.#fontFor(style)
		);

		return Math.max(
			CTextBrowser.DefaultLineHeight,
			Math.ceil(size * 1.35)
		);
	}

	#scaledFont(font: string, factor: number): string {
		return font.replace(
			/(\d+(?:\.\d+)?)px/,
			(_match, value: string) =>
				`${Number(value) * factor}px`
		);
	}

	#fontPixelSize(font: string): number {
		const match = /(\d+(?:\.\d+)?)px/.exec(font);

		return match === null
			? 14
			: Number(match[1]);
	}

	#parseHtml(html: string): {
		plainText: string;
		lines: CRichTextLine[];
	} {
		const lines: CRichTextLine[] = [{
			runs: [],
			start: 0,
			end: 0
		}];

		let plainText = "";
		let position = 0;

		let boldDepth = 0;
		let italicDepth = 0;
		let heading = 0;
		let href: string | null = null;

		const headingStack: number[] = [];
		const hrefStack: Array<string | null> = [];

		const currentLine = (): CRichTextLine =>
			lines[lines.length - 1]!;

		const appendNewLine = (): void => {
			if (
				plainText.length > 0 &&
				plainText.endsWith("\n")
			)
				return;

			currentLine().end = position;
			plainText += "\n";
			++position;

			lines.push({
				runs: [],
				start: position,
				end: position
			});
		};

		const appendText = (rawText: string): void => {
			let text = this.#decodeEntities(rawText);
			text = text.replace(/\s+/g, " ");

			if (text.length === 0)
				return;

			if (
				currentLine().runs.length === 0 &&
				text.startsWith(" ")
			)
				text = text.slice(1);

			if (text.length === 0)
				return;

			const run: CRichTextRun = {
				text,
				start: position,
				end: position + text.length,
				bold: boldDepth > 0,
				italic: italicDepth > 0,
				heading,
				href
			};

			currentLine().runs.push(run);
			plainText += text;
			position += text.length;
			currentLine().end = position;
		};

		const tokens =
			html.match(/<[^>]*>|[^<]+/g) ?? [];

		for (const token of tokens) {
			if (!token.startsWith("<")) {
				appendText(token);
				continue;
			}

			const match =
				/^<\s*(\/?)\s*([a-zA-Z0-9]+)[^>]*>$/
					.exec(token);

			if (match === null)
				continue;

			const closing = match[1] === "/";
			const tag = match[2]!.toLowerCase();

			if (tag === "a") {
				if (closing) {
					href = hrefStack.pop() ?? null;
				} else {
					hrefStack.push(href);

					const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(token);
					href = hrefMatch === null
						? null
						: this.#decodeEntities(
							hrefMatch[1] ??
							hrefMatch[2] ??
							hrefMatch[3] ??
							""
						);
				}
				continue;
			}

			if (tag === "br") {
				appendNewLine();
				continue;
			}

			if (tag === "b" || tag === "strong") {
				boldDepth = Math.max(
					0,
					boldDepth + (closing ? -1 : 1)
				);
				continue;
			}

			if (tag === "i" || tag === "em") {
				italicDepth = Math.max(
					0,
					italicDepth + (closing ? -1 : 1)
				);
				continue;
			}

			if (
				tag === "p" ||
				tag === "div"
			) {
				if (closing)
					appendNewLine();
				else if (
					plainText.length > 0 &&
					!plainText.endsWith("\n")
				)
					appendNewLine();

				continue;
			}

			const headingMatch =
				/^h([1-3])$/.exec(tag);

			if (headingMatch !== null) {
				if (closing) {
					heading =
						headingStack.pop() ?? 0;
					appendNewLine();
				} else {
					if (
						plainText.length > 0 &&
						!plainText.endsWith("\n")
					)
						appendNewLine();

					headingStack.push(heading);
					heading =
						Number(headingMatch[1]);
				}
			}
		}

		while (
			lines.length > 1 &&
			lines[lines.length - 1]!.runs.length === 0
		) {
			lines.pop();

			if (plainText.endsWith("\n")) {
				plainText =
					plainText.slice(0, -1);
				--position;
			}
		}

		if (lines.length === 0) {
			lines.push({
				runs: [],
				start: 0,
				end: 0
			});
		}

		return {plainText, lines};
	}

	#decodeEntities(text: string): string {
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
					const code = Number.parseInt(
						entity.slice(2),
						16
					);

					return Number.isFinite(code)
						? String.fromCodePoint(code)
						: match;
				}

				if (entity.startsWith("#")) {
					const code = Number.parseInt(
						entity.slice(1),
						10
					);

					return Number.isFinite(code)
						? String.fromCodePoint(code)
						: match;
				}

				return entities[entity] ?? match;
			}
		);
	}
}
