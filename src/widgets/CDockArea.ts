import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import type { CDockWidget } from "./CDockWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

/** Defines the available dock widget area values. */
export enum CDockWidgetArea {
	/** Represents left. */
	Left,
	/** Represents right. */
	Right,
	/** Represents top. */
	Top,
	/** Represents bottom. */
	Bottom
}

type CDockAreaItem = {
	position: CDockWidgetArea;
	widget: CDockWidget;
};

type CDockPreview = {
	widget: CDockWidget;
	area: CDockWidgetArea;
};

/** Implements the dock area widget. */
export class CDockArea extends CWidget {
	static readonly Spacing = 2;

	#m_centralWidget: CWidget | null = null;
	#m_dockWidgets: CDockAreaItem[] = [];
	#m_dockPreview: CDockPreview | null = null;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
	}

	/** Provides central widget behavior. */
	centralWidget(): CWidget | null {
		return this.#m_centralWidget;
	}

	/** Sets the central widget. */
	setCentralWidget(widget: CWidget | null): void {
		/** Provides if behavior. */
		if (this.#m_centralWidget === widget)
			return;

		/** Provides if behavior. */
		if (this.#m_centralWidget !== null)
			this.#m_centralWidget.setParent(null);

		this.#m_centralWidget = widget;

		/** Provides if behavior. */
		if (widget !== null)
			widget.setParent(this);

		this.#updateGeometry();
		this.update();
	}

	/** Adds dock widget. */
	addDockWidget(position: CDockWidgetArea, widget: CDockWidget): void {
		const existing = this.#indexOf(widget);

		/** Provides if behavior. */
		if (existing !== -1)
			this.#m_dockWidgets.splice(existing, 1);

		widget.setParent(this);

		this.#m_dockWidgets.push({
			position,
			widget
		});

		this.#updateGeometry();
		this.update();
	}

	/** Removes dock widget. */
	removeDockWidget(widget: CDockWidget): void {
		const index = this.#indexOf(widget);

		/** Provides if behavior. */
		if (index === -1)
			return;

		this.#m_dockWidgets.splice(index, 1);
		widget.setParent(null);

		this.#updateGeometry();
		this.update();
	}

	/** Provides dock widgets behavior. */
	dockWidgets(position: CDockWidgetArea): readonly CDockWidget[] {
		return this.#m_dockWidgets.filter(item => item.position === position).map(item => item.widget);
	}

	/** Provides dock widget area behavior. */
	dockWidgetArea(widget: CDockWidget): CDockWidgetArea | null {
		const item = this.#m_dockWidgets.find(
			item => item.widget === widget
		);

		return item?.position ?? null;
	}

	/** Provides dock area at behavior. */
	dockAreaAt(
		widget: CDockWidget,
		canvasX: number,
		canvasY: number
	): CDockWidgetArea | null {
		const pos = this.mapFromCanvas(canvasX, canvasY);

		/** Provides if behavior. */
		if (pos.x() < 0 || pos.y() < 0 ||
			pos.x() >= this.width() ||
			pos.y() >= this.height()) {
			return null;
		}

		const thickness = this.#dockThickness(widget);
		const marginX = Math.min(thickness, this.width() / 4);
		const marginY = Math.min(thickness, this.height() / 4);

		/** Provides if behavior. */
		if (pos.x() < marginX)
			return CDockWidgetArea.Left;

		/** Provides if behavior. */
		if (pos.x() >= this.width() - marginX)
			return CDockWidgetArea.Right;

		/** Provides if behavior. */
		if (pos.y() < marginY)
			return CDockWidgetArea.Top;

		/** Provides if behavior. */
		if (pos.y() >= this.height() - marginY)
			return CDockWidgetArea.Bottom;

		return null;
	}

	/** Sets the dock preview. */
	setDockPreview(
		widget: CDockWidget,
		area: CDockWidgetArea | null
	): void {
		/** Provides if behavior. */
		if (area === null) {
			this.clearDockPreview();
			return;
		}

		/** Provides if behavior. */
		if (this.#m_dockPreview?.widget === widget &&
			this.#m_dockPreview.area === area)
			return;

		this.#m_dockPreview = { widget, area };
		this.update();
	}

	/** Clears dock preview. */
	clearDockPreview(): void {
		/** Provides if behavior. */
		if (this.#m_dockPreview === null)
			return;

		this.#m_dockPreview = null;
		this.update();
	}

	/** Renders the widget. */
	override render(painter: CPainter): void {
		super.render(painter);

		/** Provides if behavior. */
		if (this.#m_dockPreview === null ||
			!this.isVisible()) {
			return;
		}

		const rect = this.#dockPreviewRect(
			this.#m_dockPreview.widget,
			this.#m_dockPreview.area
		);
		painter.save();

		try {
			painter.translate(this.x(), this.y());
			painter.clipRect(this.rect());
			const color = this.palette().color(CPaletteColorRole.Highlight);
			color.setAlpha(64);
			painter.setBrush(color.toCss());
			painter.fillRect(rect);
			color.setAlpha(230);
			painter.setPen(color.toCss());
			painter.drawRect(rect.x(), rect.y(), rect.width(), rect.height()
			);
		} finally {
			painter.restore();
		}
	}

	/** Sets the geometry. */
	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	/** Provides resize behavior. */
	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return this.#m_centralWidget?.sizeHint()
			?? new CSize(0, 0);
	}

    /** Handles child visibility changed behavior. */
    protected override childVisibilityChanged(_child: CWidget): void {
	    this.#updateGeometry();
	    this.update();
    }

	#indexOf(widget: CWidget): number {
		return this.#m_dockWidgets.findIndex(
			item => item.widget === widget
		);
	}

    #widgets(position: CDockWidgetArea): CDockWidget[] {
		return this.#m_dockWidgets.filter(item =>
			item.position === position &&
			item.widget.isVisible()
		).map(item => item.widget);
	}

	#updateGeometry(): void {
		let left = 0;
		let top = 0;
		let right = this.width();
		let bottom = this.height();

		top = this.#layoutTop(top, left, right);
		bottom = this.#layoutBottom(bottom, left, right);
		left = this.#layoutLeft(left, top, bottom);
		right = this.#layoutRight(right, top, bottom);

		/** Provides if behavior. */
		if (this.#m_centralWidget !== null) {
			this.#m_centralWidget.setGeometry(left, top, Math.max(0, right - left),
				Math.max(0, bottom - top));
		}
	}

	#layoutTop(top: number, left: number, right: number
	): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Top);

		/** Provides for behavior. */
		for (const widget of widgets) {
			const height = widget.dockHeight();
			widget.setGeometry(left, top, Math.max(0, right - left), height);
			top += height + CDockArea.Spacing;
		}

		return top;
	}

	#layoutBottom(bottom: number, left: number, right: number): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Bottom);

		/** Provides for behavior. */
		for (
			let i = widgets.length - 1;
			i >= 0;
			--i
		) {
			const widget = widgets[i]!;
			const height = widget.dockHeight();
			bottom -= height;
			widget.setGeometry(left, bottom, Math.max(0, right - left), height);
			bottom -= CDockArea.Spacing;
		}

		return bottom;
	}

	#layoutLeft(
		left: number,
		top: number,
		bottom: number
	): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Left);

		/** Provides for behavior. */
		for (const widget of widgets) {
			const width = widget.dockWidth();
			widget.setGeometry(left, top, width, Math.max(0, bottom - top));
			left += width + CDockArea.Spacing;
		}

		return left;
	}

	#layoutRight(right: number, top: number, bottom: number): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Right);

		/** Provides for behavior. */
		for (
			let i = widgets.length - 1;
			i >= 0;
			--i
		) {
			const widget = widgets[i]!;
			const width = widget.dockWidth();
			right -= width;
			widget.setGeometry(right, top, width, Math.max(0, bottom - top));
			right -= CDockArea.Spacing;
		}

		return right;
	}

	#dockPreviewRect(
		widget: CDockWidget,
		area: CDockWidgetArea
	): CRect {
		const width = this.width();
		const height = this.height();
		const thickness = this.#dockThickness(widget);

		/** Provides switch behavior. */
		switch (area) {
		case CDockWidgetArea.Left: {
			const previewWidth = Math.min(width, thickness);
			return new CRect(0, 0, previewWidth, height);
		}

		case CDockWidgetArea.Right: {
			const previewWidth = Math.min(width, thickness);
			return new CRect(
				width - previewWidth,
				0,
				previewWidth,
				height
			);
		}

		case CDockWidgetArea.Top: {
			const previewHeight = Math.min(height, thickness);
			return new CRect(0, 0, width, previewHeight);
		}

		case CDockWidgetArea.Bottom: {
			const previewHeight = Math.min(height, thickness);
			return new CRect(
				0,
				height - previewHeight,
				width,
				previewHeight
			);
		}
		}
	}

	#dockThickness(widget: CDockWidget): number {
		const area = widget.lastDockArea();
		const horizontal =
			area === CDockWidgetArea.Top ||
			area === CDockWidgetArea.Bottom;

		return horizontal
			? widget.dockHeight()
			: widget.dockWidth();
	}
}