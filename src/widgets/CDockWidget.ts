import { CSize } from "../geometry/CSize.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CMouseButton } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CRect } from "../geometry/CRect.js";
import { CSignal } from "../core/CSignal.js";
import { CDockWidgetArea } from "./CDockArea.js";
import type { CMainWindow } from "./CMainWindow.js";

export class CDockWidget extends CWidget {
	static readonly TitleBarHeight = 24;
	static readonly CloseButtonWidth = 24;
	static readonly DefaultWidth = 100;
	static readonly DefaultHeight = 80;
	readonly topLevelChanged = new CSignal<[boolean]>();
	readonly dockLocationChanged = new CSignal<[CDockWidgetArea]>();

	#m_title = "";
	#m_widget: CWidget | null = null;
	#m_closable = true;
	#m_closeHovered = false;
	#m_dockWidth = CDockWidget.DefaultWidth;
	#m_dockHeight = CDockWidget.DefaultHeight;
	
	#m_floating = false;
	#m_movable = true;
	#m_lastDockArea = CDockWidgetArea.Left;
	#m_dragging = false;
	#m_dragOffsetX = 0;
	#m_dragOffsetY = 0;
	#m_mainWindow: CMainWindow | null = null;
	#m_dragWasFloating = false;
	#m_dragDockArea = CDockWidgetArea.Left;

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

		const hint = this.sizeHint();
		this.#m_dockWidth = hint.width();
		this.#m_dockHeight = hint.height();

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

	isFloating(): boolean {
		return this.#m_floating;
	}

	isMovable(): boolean {
		return this.#m_movable;
	}

	setMovable(movable: boolean): void {
		this.#m_movable = movable;
	}

	lastDockArea(): CDockWidgetArea {
		return this.#m_lastDockArea;
	}

	setFloatingState(floating: boolean): void {
		if (this.#m_floating === floating)
			return;

		this.#m_floating = floating;
		this.topLevelChanged.emit(floating);
	}

	setDockWidgetArea(area: CDockWidgetArea): void {
		if (this.#m_lastDockArea === area)
			return;

		this.#m_lastDockArea = area;
		this.dockLocationChanged.emit(area);
	}

	dockWidth(): number {
		return this.#m_dockWidth;
	}

	setDockWidth(width: number): void {
		this.#m_dockWidth = Math.max(0, width);
	}

	dockHeight(): number {
		return this.#m_dockHeight;
	}

	setDockHeight(height: number): void {
		this.#m_dockHeight = Math.max(0, height);
	}

	mainWindow(): CMainWindow | null {
		return this.#m_mainWindow;
	}

	setMainWindow(mainWindow: CMainWindow | null): void {
		this.#m_mainWindow = mainWindow;
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

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (this.#m_closable &&
			this.#closeButtonContains(event.x(), event.y())) {
			this.hide();
			event.accept();
			return;
		}

		if (!this.#m_movable ||
			event.y() < 0 ||
			event.y() >= CDockWidget.TitleBarHeight) {
			event.ignore();
			return;
		}

		this.#m_dragWasFloating = this.#m_floating;
		this.#m_dragDockArea = this.#m_lastDockArea;

		this.#m_dragging = true;
		this.#m_dragOffsetX = event.x();
		this.#m_dragOffsetY = event.y();

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (this.#m_dragging) {
			const canvasPos = this.mapToCanvas(
				event.x(), event.y()
			);

			const mainWindow = this.#m_mainWindow;

			if (mainWindow === null) {
				this.#m_dragging = false;
				event.ignore();
				return;
			}

			if (!this.#m_floating)
				mainWindow.setDockWidgetFloating(this, true);

			const parent = this.parent();

			if (parent !== null) {
				const pos = parent.mapFromCanvas(
					canvasPos.x(), canvasPos.y()
				);

				this.move(
					pos.x() - this.#m_dragOffsetX,
					pos.y() - this.#m_dragOffsetY
				);
			}

			mainWindow.updateDockPreview(
				this,
				canvasPos.x(),
				canvasPos.y()
			);
			event.accept();
			return;
		}

		const hovered = this.#closeButtonContains(
			event.x(), event.y()
		);

		if (this.#m_closeHovered !== hovered) {
			this.#m_closeHovered = hovered;
			this.update();
		}

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton ||
			!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;

		const mainWindow = this.#m_mainWindow;

		if (mainWindow !== null) {
			mainWindow.clearDockPreview();
		}

		if (mainWindow !== null && this.#m_floating) {
			const canvasPos = this.mapToCanvas(event.x(), event.y());
			const area = mainWindow.dockAreaAt(canvasPos.x(), canvasPos.y());

			if (area !== null) {
				mainWindow.dockWidget(this, area);
			} else if (!this.#m_dragWasFloating) {
				mainWindow.dockWidget(
					this,
					this.#m_dragDockArea
				);
			}
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