/** @module Widgets/CToolBar */
import { CAction } from "../core/CAction.js";
import { CSize } from "../geometry/CSize.js";
import { COrientation } from "../gui/COrientation.js";
import { CPainter } from "../painting/CPainter.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CStyleOptionToolBar } from "../gui/CStyleOptionToolBar.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import type { CMainWindow } from "./CMainWindow.js";

/** Defines the available tool bar area values. */
export enum CToolBarArea {
    /** Place toolbars along the left edge of the main window. */
    Left,
    /** Place toolbars along the right edge of the main window. */
    Right,
    /** Place toolbars along the top edge of the main window. */
    Top,
    /** Place toolbars along the bottom edge of the main window. */
    Bottom
}

type CToolBarItem =
	| {
		type: "action";
		action: CAction;
		button: CToolButton;
	}
	| {
		type: "separator";
		widget: CToolBarSeparator;
	}
	| {
		type: "widget";
		widget: CWidget;
	};

class CToolBarSeparator extends CWidget {
	#m_orientation: COrientation;

	constructor(
		orientation: COrientation,
		parent: CWidget
	) {
		super(parent);

		this.#m_orientation = orientation;
	}

    /**
    * Changes whether toolbar entries are arranged horizontally or vertically.
    */
    setOrientation(orientation: COrientation): void {
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;
		this.update();
	}

	protected override paintEvent(painter: CPainter): void {
		const palette = this.palette();

		painter.setPen(
			palette.color(
				CPaletteColorRole.Mid
			).toCss()
		);

		if (this.#m_orientation === COrientation.Horizontal) {
			const x = this.width() / 2;

			painter.drawLine(
				x, 4,
				x, this.height() - 4
			);
		} else {
			const y = this.height() / 2;

			painter.drawLine(
				4, y,
				this.width() - 4, y
			);
		}
	}
}

/** Action strip with buttons, separators, custom widgets and docking integration. */
export class CToolBar extends CWidget {
    /** Default toolbar thickness along its cross axis. */
    static readonly DefaultExtent = 36;
    /** Default logical gap between adjacent items. */
    static readonly Spacing = 2;
    /** Default logical inset around contents. */
    static readonly Margin = 4;
    /** Logical space allocated to a toolbar separator. */
    static readonly SeparatorExtent = 8;
    /** Logical space allocated to the toolbar drag grip. */
    static readonly GripExtent = 12;

	#m_items: CToolBarItem[] = [];
	#m_workspaceId = "";
	#m_orientation = COrientation.Horizontal;
	#m_movable = true;
	#m_dragging = false;
	#m_floating = false;
	#m_dragOffsetX = 0;
	#m_dragOffsetY = 0;
	#m_dragArea = CToolBarArea.Top;
	#m_mainWindow: CMainWindow | null = null;
	#m_extent = CToolBar.DefaultExtent;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
	}

    /**
    * Stable identifier used to match this component during state restoration.
    * The initial value is `""`.
    */
    workspaceId(): string {
		return this.#m_workspaceId;
	}

    /**
    * Sets a stable toolbar identifier for workspace restoration.
    */
    setWorkspaceId(id: string): void {
		this.#m_workspaceId = id;
	}

    /**
    * Reports whether the toolbar's drag grip is available.
    */
    isMovable(): boolean {
		return this.#m_movable;
	}

    /**
    * Enables or disables user dragging through the toolbar grip.
    */
    setMovable(movable: boolean): void {
		this.#m_movable = movable;
		this.update();
	}

    /**
    * Whether the panel is displayed outside its dock area.
    * The initial value is `false`.
    */
    isFloating(): boolean {
		return this.#m_floating;
	}

    /**
    * @internal Updates floating presentation after a docking operation.
    */
    setFloatingState(floating: boolean): void {
		this.#m_floating = floating;
	}

    /**
    * Returns the window managing this toolbar, or null.
    */
    mainWindow(): CMainWindow | null {
		return this.#m_mainWindow;
	}

    /**
    * @internal Assigns the window responsible for toolbar docking.
    */
    setMainWindow(mainWindow: CMainWindow | null): void {
		this.#m_mainWindow = mainWindow;
	}

    /**
    * Returns the logical cross-axis thickness of the toolbar.
    */
    extent(): number {
		return this.#m_extent;
	}

    /**
    * Changes logical toolbar thickness and updates managed item geometry.
    */
    setExtent(extent: number): void {
		const value = Math.max(0, extent);

		if (this.#m_extent === value)
			return;

		this.#m_extent = value;
		this.update();
	}

    /**
    * Axis along which the control arranges its contents.
    * The initial value is `COrientation.Horizontal`.
    */
    orientation(): COrientation {
		return this.#m_orientation;
	}

    /**
    * Changes whether toolbar entries are arranged horizontally or vertically.
    */
    setOrientation(orientation: COrientation): void {
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;

		for (const item of this.#m_items) {
			if (item.type === "separator")
				item.widget.setOrientation(orientation);
		}

		this.#updateItemGeometry();
		this.update();
	}

    /**
    * Returns the number of retained toolbar entries.
    */
    count(): number {
		return this.#m_items.length;
	}

    /** Adds action. */
    addAction(action: CAction): CToolButton {
		const button = new CToolButton(this);

		button.setDefaultAction(action);
		button.setAutoRaise(true);

		this.#m_items.push({type: "action", action, button});

		this.#updateItemGeometry();
		this.update();

		return button;
	}

    /** Adds separator. */
    addSeparator(): CWidget {
		const separator = new CToolBarSeparator(
			this.#m_orientation,
			this
		);

		this.#m_items.push({
			type: "separator",
			widget: separator
		});

		this.#updateItemGeometry();
		this.update();

		return separator;
	}

    /** Adds widget. */
    addWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_items.push({type: "widget", widget});
		this.#updateItemGeometry();
		this.update();

		return widget;
	}

    /**
    * Returns the action associated with an entry position, or null.
    */
    actionAt(index: number): CAction | null {
		const item = this.#m_items[index];

		if (item === undefined || item.type !== "action")
			return null;

		return item.action;
	}

    /**
    * Returns the widget representing a registered action, or null.
    */
    widgetForAction(action: CAction): CToolButton | null {
		for (const item of this.#m_items) {
			if (
				item.type === "action" &&
				item.action === action
			) {
				return item.button;
			}
		}

		return null;
	}

    /** Clears the current contents. */
    clear(): void {
		for (const item of this.#m_items) {
			const widget = item.type === "action"
				? item.button
				: item.widget;

			widget.setParent(null);
		}

		this.#m_items = [];

		this.update();
	}

	override sizeHint(): CSize {
		let extent = CToolBar.Margin * 2 + CToolBar.GripExtent;

		for (const item of this.#m_items) {
			if (item.type === "separator") {
				extent += CToolBar.SeparatorExtent + CToolBar.Spacing;
				continue;
			}

			const widget = item.type === "action"
				? item.button
				: item.widget;

			const hint = widget.sizeHint();
			extent += (
				this.#m_orientation === COrientation.Horizontal
					? hint.width()
					: hint.height()
			) + CToolBar.Spacing;
		}

		if (this.#m_items.length > 0)
			extent -= CToolBar.Spacing;

		return this.#m_orientation === COrientation.Horizontal
			? new CSize(extent, this.#m_extent)
			: new CSize(this.#m_extent, extent);
	}

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateItemGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateItemGeometry();
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolBar();
		option.initFromToolBar(this);

		this.style().drawToolBar(painter, option);

		if (this.#m_movable)
			this.#drawGrip(painter);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (
			event.button() !== CMouseButton.LeftButton ||
			!this.#m_movable ||
			!this.#gripContains(event.x(), event.y())
		) {
			event.ignore();
			return;
		}

		const mainWindow = this.#m_mainWindow;
		if (mainWindow === null) {
			event.ignore();
			return;
		}

		this.#m_dragArea =
			mainWindow.toolBarArea(this) ?? CToolBarArea.Top;
		this.#m_dragging = true;
		this.#m_dragOffsetX = event.x();
		this.#m_dragOffsetY = event.y();

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		const mainWindow = this.#m_mainWindow;
		if (mainWindow === null) {
			this.#m_dragging = false;
			event.ignore();
			return;
		}

		const canvasPos = this.mapToCanvas(event.x(), event.y());

		if (!this.#m_floating)
			mainWindow.beginToolBarDrag(this);

		mainWindow.updateToolBarPreview(
			this,
			canvasPos.x(),
			canvasPos.y()
		);

		const parent = this.parent();
		if (parent !== null) {
			const pos = parent.mapFromCanvas(
				canvasPos.x(),
				canvasPos.y()
			);

			this.move(
				pos.x() - this.#m_dragOffsetX,
				pos.y() - this.#m_dragOffsetY
			);
		}

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (
			event.button() !== CMouseButton.LeftButton ||
			!this.#m_dragging
		) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;

		const mainWindow = this.#m_mainWindow;
		if (mainWindow !== null) {
			mainWindow.clearToolBarPreview();

			const canvasPos = this.mapToCanvas(
				event.x(),
				event.y()
			);

			const area = mainWindow.toolBarAreaAt(
				canvasPos.x(),
				canvasPos.y()
			);

			mainWindow.dockToolBar(
				this,
				area ?? this.#m_dragArea
			);
		}

		event.accept();
	}

	#updateItemGeometry(): void {
		const margin = CToolBar.Margin;
		const spacing = CToolBar.Spacing;

		let position = margin + CToolBar.GripExtent;

		for (const item of this.#m_items) {
			const widget = item.type === "action"
				? item.button
				: item.widget;

			if (item.type === "separator") {
				if (this.#m_orientation === COrientation.Horizontal) {
					widget.setGeometry(
						position,
						margin,
						CToolBar.SeparatorExtent,
						Math.max(0, this.height() - 2 * margin)
					);

					position += CToolBar.SeparatorExtent + spacing;
				} else {
					widget.setGeometry(
						margin,
						position,
						Math.max(0, this.width() - 2 * margin),
						CToolBar.SeparatorExtent
					);

					position += CToolBar.SeparatorExtent + spacing;
				}

				continue;
			}

			const hint = widget.sizeHint();

			if (this.#m_orientation === COrientation.Horizontal) {
				const height = Math.max(0, this.height() - 2 * margin);
				widget.setGeometry(position, margin, hint.width(), height);

				position += hint.width() + spacing;
			} else {
				const width = Math.max(
					0,
					this.width() - 2 * margin
				);

				widget.setGeometry(margin, position, width, hint.height());
				position += hint.height() + spacing;
			}
		}
	}
	#gripContains(x: number, y: number): boolean {
		if (this.#m_orientation === COrientation.Horizontal) {
			return x >= 0 &&
				x < CToolBar.Margin + CToolBar.GripExtent &&
				y >= 0 &&
				y < this.height();
		}

		return y >= 0 &&
			y < CToolBar.Margin + CToolBar.GripExtent &&
			x >= 0 &&
			x < this.width();
	}

	#drawGrip(painter: CPainter): void {
		painter.setPen(
			this.palette().color(CPaletteColorRole.Mid).toCss()
		);

		if (this.#m_orientation === COrientation.Horizontal) {
			const x1 = CToolBar.Margin + 3;
			const x2 = CToolBar.Margin + 7;

			for (let y = 8; y <= this.height() - 8; y += 5) {
				painter.drawLine(x1, y, x1 + 1, y);
				painter.drawLine(x2, y, x2 + 1, y);
			}
		} else {
			const y1 = CToolBar.Margin + 3;
			const y2 = CToolBar.Margin + 7;

			for (let x = 8; x <= this.width() - 8; x += 5) {
				painter.drawLine(x, y1, x, y1 + 1);
				painter.drawLine(x, y2, x, y2 + 1);
			}
		}
	}

}