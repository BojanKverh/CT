import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";

export enum CDockWidgetArea {
	Left,
	Right,
	Top,
	Bottom
}

type CDockAreaItem = {
	position: CDockWidgetArea;
	widget: CWidget;
};

export class CDockArea extends CWidget {
	static readonly Spacing = 2;

	#m_centralWidget: CWidget | null = null;
	#m_dockWidgets: CDockAreaItem[] = [];

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

	addDockWidget(
		position: CDockWidgetArea,
		widget: CWidget
	): void {
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

	removeDockWidget(widget: CWidget): void {
		const index = this.#indexOf(widget);

		if (index === -1)
			return;

		this.#m_dockWidgets.splice(index, 1);
		widget.setParent(null);

		this.#updateGeometry();
		this.update();
	}

	dockWidgets(
		position: CDockWidgetArea
	): readonly CWidget[] {
		return this.#m_dockWidgets
			.filter(item => item.position === position)
			.map(item => item.widget);
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

    #widgets(position: CDockWidgetArea): CWidget[] {
	    return this.#m_dockWidgets.filter(item => item.position === position &&
				item.widget.isVisible()).map(item => item.widget);
    }

	#updateGeometry(): void {
		let left = 0;
		let top = 0;
		let right = this.width();
		let bottom = this.height();

		top = this.#layoutTop(
			top,
			left,
			right
		);

		bottom = this.#layoutBottom(
			bottom,
			left,
			right
		);

		left = this.#layoutLeft(
			left,
			top,
			bottom
		);

		right = this.#layoutRight(
			right,
			top,
			bottom
		);

		if (this.#m_centralWidget !== null) {
			this.#m_centralWidget.setGeometry(
				left,
				top,
				Math.max(0, right - left),
				Math.max(0, bottom - top)
			);
		}
	}

	#layoutTop(
		top: number,
		left: number,
		right: number
	): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Top);

		for (const widget of widgets) {
			const height =
				widget.sizeHint().height();

			widget.setGeometry(
				left,
				top,
				Math.max(0, right - left),
				height
			);

			top += height + CDockArea.Spacing;
		}

		return top;
	}

	#layoutBottom(
		bottom: number,
		left: number,
		right: number
	): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Bottom);

		for (
			let i = widgets.length - 1;
			i >= 0;
			--i
		) {
			const widget = widgets[i];

			if (widget === undefined)
				continue;

			const height =
				widget.sizeHint().height();

			bottom -= height;

			widget.setGeometry(
				left,
				bottom,
				Math.max(0, right - left),
				height
			);

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
			const width =
				widget.sizeHint().width();

			widget.setGeometry(
				left,
				top,
				width,
				Math.max(0, bottom - top)
			);

			left += width + CDockArea.Spacing;
		}

		return left;
	}

	#layoutRight(
		right: number,
		top: number,
		bottom: number
	): number {
		const widgets =
			this.#widgets(CDockWidgetArea.Right);

		for (
			let i = widgets.length - 1;
			i >= 0;
			--i
		) {
			const widget = widgets[i];

			if (widget === undefined)
				continue;

			const width =
				widget.sizeHint().width();

			right -= width;

			widget.setGeometry(
				right,
				top,
				width,
				Math.max(0, bottom - top)
			);

			right -= CDockArea.Spacing;
		}

		return right;
	}
}