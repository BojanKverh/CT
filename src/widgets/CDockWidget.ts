import { CSize } from "../geometry/CSize.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CRect } from "../geometry/CRect.js";

export class CDockWidget extends CWidget {
	static readonly TitleBarHeight = 24;
	static readonly CloseButtonWidth = 24;
	static readonly DefaultWidth = 200;
	static readonly DefaultHeight = 200;

	#m_title = "";
	#m_widget: CWidget | null = null;
	#m_closable = true;
	#m_closeHovered = false;

	constructor(
		title = "",
		parent: CWidget | null = null
	) {
		super(parent);

		this.#m_title = title;
	}

	title(): string {
		return this.#m_title;
	}

	setTitle(title: string): void {
		if (this.#m_title === title)
			return;

		this.#m_title = title;
		this.update();
	}

	widget(): CWidget | null {
		return this.#m_widget;
	}

	setWidget(widget: CWidget | null): void {
		if (this.#m_widget === widget)
			return;

		if (this.#m_widget !== null)
			this.#m_widget.setParent(null);

		this.#m_widget = widget;

		if (widget !== null)
			widget.setParent(this);

		this.#updateWidgetGeometry();
		this.update();
	}

	isClosable(): boolean {
		return this.#m_closable;
	}

	setClosable(closable: boolean): void {
		if (this.#m_closable === closable)
			return;

		this.#m_closable = closable;
		this.#m_closeHovered = false;

		this.update();
	}

	override sizeHint(): CSize {
		if (this.#m_widget === null) {
			return new CSize(
				CDockWidget.DefaultWidth,
				CDockWidget.DefaultHeight
			);
		}

		const hint = this.#m_widget.sizeHint();

		return new CSize(
			Math.max(
				CDockWidget.DefaultWidth,
				hint.width()
			),
			CDockWidget.TitleBarHeight +
			hint.height()
		);
	}

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateWidgetGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateWidgetGeometry();
	}

	protected override paintEvent(painter: CPainter): void {
		const palette = this.palette();
		painter.setBrush(palette.color(CPaletteColorRole.Window).toCss());
		painter.setPen(palette.color(CPaletteColorRole.Mid).toCss());
		painter.drawRect(0, 0, this.width(), this.height());
		painter.setBrush(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(new CRect(0, 0, this.width(), CDockWidget.TitleBarHeight));
		painter.setPen(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.setFont(this.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");
		painter.drawText(this.#m_title, 6, CDockWidget.TitleBarHeight / 2);

		if (this.#m_closable)
			this.#drawCloseButton(painter);
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		const hovered = this.#closeButtonContains(event.x(), event.y());

		if (this.#m_closeHovered !== hovered) {
			this.#m_closeHovered = hovered;
			this.update();
		}

		event.accept();
	}

	protected override mouseLeaveEvent(
		event: CMouseEvent
	): void {
		if (this.#m_closeHovered) {
			this.#m_closeHovered = false;
			this.update();
		}

		event.accept();
	}

	protected override mousePressEvent(
		event: CMouseEvent
	): void {
		if (this.#m_closable && this.#closeButtonContains(event.x(), event.y())
		) {
			this.hide();
			event.accept();
			return;
		}

		event.ignore();
	}

	#updateWidgetGeometry(): void {
		if (this.#m_widget === null)
			return;

		const y = CDockWidget.TitleBarHeight;

		this.#m_widget.setGeometry(0, y, this.width(), Math.max(0, this.height() - y));
    }

	#closeButtonContains(x: number, y: number): boolean {
		if (!this.#m_closable)
			return false;

		return (x >= this.width() - CDockWidget.CloseButtonWidth &&
			x < this.width() && y >= 0 && y < CDockWidget.TitleBarHeight);
	}

	#drawCloseButton(painter: CPainter): void {
		const x =
			this.width() -
			CDockWidget.CloseButtonWidth;

		if (this.#m_closeHovered) {
            painter.setBrush(this.palette().color(CPaletteColorRole.Mid).toCss());
			painter.fillRect(new CRect(x, 0, CDockWidget.CloseButtonWidth, CDockWidget.TitleBarHeight));
		}

		const cx = x + CDockWidget.CloseButtonWidth / 2;
		const cy = CDockWidget.TitleBarHeight / 2;
		const radius = 4;

		painter.setPen(this.palette().color(CPaletteColorRole.WindowText).toCss());

		painter.drawLine(cx - radius, cy - radius, cx + radius, cy + radius);
		painter.drawLine(cx + radius, cy - radius, cx - radius, cy + radius);
	}
}