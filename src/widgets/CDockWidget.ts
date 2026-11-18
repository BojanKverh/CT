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

/** Implements the dock widget widget. */
export class CDockWidget extends CWidget {
	static readonly TitleBarHeight = 24;
	static readonly CloseButtonWidth = 24;
	static readonly DefaultWidth = 100;
	static readonly DefaultHeight = 80;
	/** Signal emitted when top level changes. */
	readonly topLevelChanged = new CSignal<[boolean]>();
	/** Signal emitted when dock location changes. */
	readonly dockLocationChanged = new CSignal<[CDockWidgetArea]>();

	#m_title = "";
	#m_workspaceId = "";
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

	/** Creates a new instance. */
	constructor(
		title = "",
		parent: CWidget | null = null
	) {
		/** Provides super behavior. */
		super(parent);

		this.#m_title = title;
	}

	/**
	 * Reads the title.
	 * @returns The title.
	 */
	title(): string {
		return this.#m_title;
	}

	/**
	 * Reads the workspace id.
	 * @returns The workspace id.
	 */
	workspaceId(): string {
		return this.#m_workspaceId;
	}

	/**
	 * Sets the workspace id.
	 * @param id Id.
	 */
	setWorkspaceId(id: string): void {
		this.#m_workspaceId = id;
	}

	/**
	 * Sets the title.
	 * @param title Title.
	 */
	setTitle(title: string): void {
		/** Provides if behavior. */
		if (this.#m_title === title)
			return;

		this.#m_title = title;
		this.update();
	}

	/**
	 * Reads the widget.
	 * @returns The widget.
	 */
	widget(): CWidget | null {
		return this.#m_widget;
	}

	/**
	 * Detaches existing content, installs the replacement and recomputes preferred dock dimensions.
	 * @param widget Widget to show inside this dock, or `null` to clear it.
	 */
	setWidget(widget: CWidget | null): void {
		/** Provides if behavior. */
		if (this.#m_widget === widget)
			return;

		/** Provides if behavior. */
		if (this.#m_widget !== null)
			this.#m_widget.setParent(null);

		this.#m_widget = widget;

		/** Provides if behavior. */
		if (widget !== null)
			widget.setParent(this);

		const hint = this.sizeHint();
		this.#m_dockWidth = hint.width();
		this.#m_dockHeight = hint.height();

		this.#updateWidgetGeometry();
		this.update();
	}

	/**
	 * Checks whether the dock widget is closable.
	 * @returns `true` if the dock widget is closable, otherwise `false`.
	 */
	isClosable(): boolean {
		return this.#m_closable;
	}

	/**
	 * Sets the closable.
	 * @param closable Closable flag.
	 */
	setClosable(closable: boolean): void {
		/** Provides if behavior. */
		if (this.#m_closable === closable)
			return;

		this.#m_closable = closable;
		this.#m_closeHovered = false;

		this.update();
	}

	/**
	 * Checks whether the dock widget is floating.
	 * @returns `true` if the dock widget is floating, otherwise `false`.
	 */
	isFloating(): boolean {
		return this.#m_floating;
	}

	/**
	 * Checks whether the dock widget is movable.
	 * @returns `true` if the dock widget is movable, otherwise `false`.
	 */
	isMovable(): boolean {
		return this.#m_movable;
	}

	/**
	 * Sets the movable.
	 * @param movable Movable flag.
	 */
	setMovable(movable: boolean): void {
		this.#m_movable = movable;
	}

	/**
	 * Reads the last dock area.
	 * @returns The last dock area.
	 */
	lastDockArea(): CDockWidgetArea {
		return this.#m_lastDockArea;
	}

	/**
	 * Sets the floating state.
	 * @param floating Floating flag.
	 */
	setFloatingState(floating: boolean): void {
		/** Provides if behavior. */
		if (this.#m_floating === floating)
			return;

		this.#m_floating = floating;
		this.topLevelChanged.emit(floating);
	}

	/**
	 * Sets the dock widget area.
	 * @param area Area.
	 */
	setDockWidgetArea(area: CDockWidgetArea): void {
		/** Provides if behavior. */
		if (this.#m_lastDockArea === area)
			return;

		this.#m_lastDockArea = area;
		this.dockLocationChanged.emit(area);
	}

	/**
	 * Reads the dock width.
	 * @returns The dock width.
	 */
	dockWidth(): number {
		return this.#m_dockWidth;
	}

	/**
	 * Sets the dock width.
	 * @param width Width.
	 */
	setDockWidth(width: number): void {
		this.#m_dockWidth = Math.max(0, width);
	}

	/**
	 * Reads the dock height.
	 * @returns The dock height.
	 */
	dockHeight(): number {
		return this.#m_dockHeight;
	}

	/**
	 * Sets the dock height.
	 * @param height Height.
	 */
	setDockHeight(height: number): void {
		this.#m_dockHeight = Math.max(0, height);
	}

	/**
	 * Reads the main window.
	 * @returns The main window.
	 */
	mainWindow(): CMainWindow | null {
		return this.#m_mainWindow;
	}

	/**
	 * Sets the main window.
	 * @param mainWindow Main window.
	 */
	setMainWindow(mainWindow: CMainWindow | null): void {
		this.#m_mainWindow = mainWindow;
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns The size hint.
	 */
	override sizeHint(): CSize {
		/** Provides if behavior. */
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

	/**
	 * Sets the geometry.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateWidgetGeometry();
	}

	/**
	 * Resizes the width.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateWidgetGeometry();
	}

	/**
	 * Draws the dock widget through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
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

		/** Provides if behavior. */
		if (this.#m_closable)
			this.#drawCloseButton(painter);
	}

	/**
	 * Responds to a pointer button press for the dock widget. May update the drag was floating, the drag dock area, the dragging, the drag offset x. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (this.#m_closable &&
			this.#closeButtonContains(event.x(), event.y())) {
			this.hide();
			event.accept();
			return;
		}

		/** Provides if behavior. */
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

	/**
	 * Responds to pointer movement for the dock widget. May update the dragging, the close hovered. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (this.#m_dragging) {
			const canvasPos = this.mapToCanvas(
				event.x(), event.y()
			);

			const mainWindow = this.#m_mainWindow;

			/** Provides if behavior. */
			if (mainWindow === null) {
				this.#m_dragging = false;
				event.ignore();
				return;
			}

			/** Provides if behavior. */
			if (!this.#m_floating)
				mainWindow.setDockWidgetFloating(this, true);

			const parent = this.parent();

			/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_closeHovered !== hovered) {
			this.#m_closeHovered = hovered;
			this.update();
		}

		event.accept();
	}

	/**
	 * Responds to a pointer button release for the dock widget. May update the dragging. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton ||
			!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;

		const mainWindow = this.#m_mainWindow;

		/** Provides if behavior. */
		if (mainWindow !== null) {
			mainWindow.clearDockPreview();
		}

		/** Provides if behavior. */
		if (mainWindow !== null && this.#m_floating) {
			const canvasPos = this.mapToCanvas(event.x(), event.y());
			const area = mainWindow.dockAreaAt(this, canvasPos.x(), canvasPos.y());

			/** Provides if behavior. */
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

	/**
	 * Responds to pointer exit for the dock widget. May update the close hovered. May request a repaint and accept the event.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(
		event: CMouseEvent
	): void {
		/** Provides if behavior. */
		if (this.#m_closeHovered) {
			this.#m_closeHovered = false;
			this.update();
		}

		event.accept();
	}

	#updateWidgetGeometry(): void {
		/** Provides if behavior. */
		if (this.#m_widget === null)
			return;

		const y = CDockWidget.TitleBarHeight;

		this.#m_widget.setGeometry(0, y, this.width(), Math.max(0, this.height() - y));
    }

	#closeButtonContains(x: number, y: number): boolean {
		/** Provides if behavior. */
		if (!this.#m_closable)
			return false;

		/** Provides return behavior. */
		return (x >= this.width() - CDockWidget.CloseButtonWidth &&
			x < this.width() && y >= 0 && y < CDockWidget.TitleBarHeight);
	}

	#drawCloseButton(painter: CPainter): void {
		const x =
			this.width() -
			CDockWidget.CloseButtonWidth;

		/** Provides if behavior. */
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