import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import type { CDockWidget } from "./CDockWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

export enum CDockWidgetArea {
	Left,
	Right,
	Top,
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

export class CDockArea extends CWidget {
	static readonly Spacing = 2;

	#m_centralWidget: CWidget | null = null;
	#m_dockWidgets: CDockAreaItem[] = [];
	#m_dockPreview: CDockPreview | null = null;

	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	centralWidget(): CWidget | null {
		return this.#m_centralWidget;
	}

	setCentralWidget(widget: CWidget | null): void {
		if (this.#m_centralWidget === widget)
			return;

		if (this.#m_centralWidget !== null)
			this.#m_centralWidget.setParent(null);

		this.#m_centralWidget = widget;

		if (widget !== null)
			widget.setParent(this);

		this.#updateGeometry();
		this.update();
	}

	addDockWidget(position: CDockWidgetArea, widget: CDockWidget): void {
		const existing = this.#indexOf(widget);

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

	removeDockWidget(widget: CDockWidget): void {
		const index = this.#indexOf(widget);

		if (index === -1)
			return;

		this.#m_dockWidgets.splice(index, 1);
		widget.setParent(null);

		this.#updateGeometry();
		this.update();
	}

	dockWidgets(position: CDockWidgetArea): readonly CDockWidget[] {
		return this.#m_dockWidgets.filter(item => item.position === position).map(item => item.widget);
	}

	dockWidgetArea(widget: CDockWidget): CDockWidgetArea | null {
		const item = this.#m_dockWidgets.find(
			item => item.widget === widget
		);

		return item?.position ?? null;
	}

	setDockPreview(
		widget: CDockWidget,
		area: CDockWidgetArea | null
	): void {
		if (area === null) {
			this.clearDockPreview();
			return;
		}

		if (this.#m_dockPreview?.widget === widget &&
			this.#m_dockPreview.area === area)
			return;

		this.#m_dockPreview = { widget, area };
		this.update();
	}

	clearDockPreview(): void {
		if (this.#m_dockPreview === null)
			return;

		this.#m_dockPreview = null;
		this.update();
	}

	override render(painter: CPainter): void {
		super.render(painter);

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

	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	override sizeHint(): CSize {
		return this.#m_centralWidget?.sizeHint()
			?? new CSize(0, 0);
	}

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

		if (this.#m_centralWidget !== null) {
			this.#m_centralWidget.setGeometry(left, top, Math.max(0, right - left),
				Math.max(0, bottom - top));
		}
	}

	#layoutTop(top: number, left: number, right: number
	): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Top);

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

		switch (area) {
		case CDockWidgetArea.Left: {
			const previewWidth = Math.min(width, widget.dockWidth());
			return new CRect(0, 0, previewWidth, height);
		}

		case CDockWidgetArea.Right: {
			const previewWidth = Math.min(width, widget.dockWidth());
			return new CRect(width - previewWidth, 0, previewWidth, height);
		}

		case CDockWidgetArea.Top: {
			const previewHeight = Math.min(height, widget.dockHeight());
			return new CRect(0, 0, width, previewHeight);
		}

		case CDockWidgetArea.Bottom: {
			const previewHeight = Math.min(height, widget.dockHeight());
			return new CRect(0, height - previewHeight, width, previewHeight);
		}
		}
	}
}