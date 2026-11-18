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
	/** Represents left. */
	Left,
	/** Represents right. */
	Right,
	/** Represents top. */
	Top,
	/** Represents bottom. */
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
	 * Sets the orientation. May request a repaint.
	 * @param orientation Horizontal or vertical orientation.
	 */
	setOrientation(orientation: COrientation): void {
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;
		this.update();
	}

	/**
	 * Draws the tool bar separator through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
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

/** Implements the tool bar widget. */
export class CToolBar extends CWidget {
	static readonly DefaultExtent = 36;
	static readonly Spacing = 2;
	static readonly Margin = 4;
	static readonly SeparatorExtent = 8;
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

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
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
	 * Checks whether the tool bar is movable.
	 * @returns `true` if the tool bar is movable, otherwise `false`.
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
		this.update();
	}

	/**
	 * Checks whether the tool bar is floating.
	 * @returns `true` if the tool bar is floating, otherwise `false`.
	 */
	isFloating(): boolean {
		return this.#m_floating;
	}

	/**
	 * Sets the floating state.
	 * @param floating Floating flag.
	 */
	setFloatingState(floating: boolean): void {
		this.#m_floating = floating;
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
	 * Reads the extent.
	 * @returns The extent.
	 */
	extent(): number {
		return this.#m_extent;
	}

	/**
	 * Sets the extent.
	 * @param extent Extent.
	 */
	setExtent(extent: number): void {
		const value = Math.max(0, extent);

		/** Provides if behavior. */
		if (this.#m_extent === value)
			return;

		this.#m_extent = value;
		this.update();
	}

	/**
	 * Reads the orientation.
	 * @returns The orientation.
	 */
	orientation(): COrientation {
		return this.#m_orientation;
	}

	/**
	 * Sets the orientation.
	 * @param orientation Horizontal or vertical orientation.
	 */
	setOrientation(orientation: COrientation): void {
		/** Provides if behavior. */
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;

		/** Provides for behavior. */
		for (const item of this.#m_items) {
			/** Provides if behavior. */
			if (item.type === "separator")
				item.widget.setOrientation(orientation);
		}

		this.#updateItemGeometry();
		this.update();
	}

	/**
	 * Counts the entries in the tool bar.
	 * @returns The number of entries in the items.
	 */
	count(): number {
		return this.#m_items.length;
	}

	/**
	 * Adds action.
	 * @param action Action.
	 * @returns The add action.
	 */
	addAction(action: CAction): CToolButton {
		const button = new CToolButton(this);

		button.setDefaultAction(action);
		button.setAutoRaise(true);

		this.#m_items.push({type: "action", action, button});

		this.#updateItemGeometry();
		this.update();

		return button;
	}

	/**
	 * Adds separator.
	 * @returns The add separator.
	 */
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

	/**
	 * Reparents a custom widget into the toolbar, appends it to the item list and recalculates geometry.
	 * @param widget Widget to add.
	 * @returns The same widget instance.
	 */
	addWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_items.push({type: "widget", widget});
		this.#updateItemGeometry();
		this.update();

		return widget;
	}

	/**
	 * Looks up an action by its position among all toolbar items.
	 * @param index Zero-based toolbar item index.
	 * @returns The action, or `null` if that position is absent or holds a different item type.
	 */
	actionAt(index: number): CAction | null {
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined || item.type !== "action")
			return null;

		return item.action;
	}

	/**
	 * Looks up the first button representing an action.
	 * @param action Action to match by identity.
	 * @returns Associated tool button, or `null` if no item represents the action.
	 */
	widgetForAction(action: CAction): CToolButton | null {
		/** Provides for behavior. */
		for (const item of this.#m_items) {
			/** Provides if behavior. */
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
		/** Provides for behavior. */
		for (const item of this.#m_items) {
			const widget = item.type === "action"
				? item.button
				: item.widget;

			widget.setParent(null);
		}

		this.#m_items = [];

		this.update();
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns The size hint.
	 */
	override sizeHint(): CSize {
		let extent = CToolBar.Margin * 2 + CToolBar.GripExtent;

		/** Provides for behavior. */
		for (const item of this.#m_items) {
			/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_items.length > 0)
			extent -= CToolBar.Spacing;

		return this.#m_orientation === COrientation.Horizontal
			? new CSize(extent, this.#m_extent)
			: new CSize(this.#m_extent, extent);
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

		this.#updateItemGeometry();
	}

	/**
	 * Resizes the width.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateItemGeometry();
	}

	/**
	 * Draws the tool bar through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolBar();
		option.initFromToolBar(this);

		this.style().drawToolBar(painter, option);

		/** Provides if behavior. */
		if (this.#m_movable)
			this.#drawGrip(painter);
	}

	/**
	 * Responds to a pointer button press for the tool bar. May update the drag area, the dragging, the drag offset x, the drag offset y. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (
			event.button() !== CMouseButton.LeftButton ||
			!this.#m_movable ||
			!this.#gripContains(event.x(), event.y())
		) {
			event.ignore();
			return;
		}

		const mainWindow = this.#m_mainWindow;
		/** Provides if behavior. */
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

	/**
	 * Responds to pointer movement for the tool bar. May update the dragging. May accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		const mainWindow = this.#m_mainWindow;
		/** Provides if behavior. */
		if (mainWindow === null) {
			this.#m_dragging = false;
			event.ignore();
			return;
		}

		const canvasPos = this.mapToCanvas(event.x(), event.y());

		/** Provides if behavior. */
		if (!this.#m_floating)
			mainWindow.beginToolBarDrag(this);

		mainWindow.updateToolBarPreview(
			this,
			canvasPos.x(),
			canvasPos.y()
		);

		const parent = this.parent();
		/** Provides if behavior. */
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

	/**
	 * Responds to a pointer button release for the tool bar. May update the dragging. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (
			event.button() !== CMouseButton.LeftButton ||
			!this.#m_dragging
		) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;

		const mainWindow = this.#m_mainWindow;
		/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const item of this.#m_items) {
			const widget = item.type === "action"
				? item.button
				: item.widget;

			/** Provides if behavior. */
			if (item.type === "separator") {
				/** Provides if behavior. */
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

			/** Provides if behavior. */
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
		/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_orientation === COrientation.Horizontal) {
			const x1 = CToolBar.Margin + 3;
			const x2 = CToolBar.Margin + 7;

			/** Provides for behavior. */
			for (let y = 8; y <= this.height() - 8; y += 5) {
				painter.drawLine(x1, y, x1 + 1, y);
				painter.drawLine(x2, y, x2 + 1, y);
			}
		} else {
			const y1 = CToolBar.Margin + 3;
			const y2 = CToolBar.Margin + 7;

			/** Provides for behavior. */
			for (let x = 8; x <= this.width() - 8; x += 5) {
				painter.drawLine(x, y1, x, y1 + 1);
				painter.drawLine(x, y2, x, y2 + 1);
			}
		}
	}

}