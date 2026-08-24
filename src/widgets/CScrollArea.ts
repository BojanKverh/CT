import { CWidget } from "./CWidget.js";
import { COrientation } from "../gui/COrientation.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWheelEvent } from "../events/CWheelEvent.js";

export class CScrollArea extends CWidget {
	#m_viewport: CWidget;
	#m_widget: CWidget | null = null;
	#m_scrollX = 0;
	#m_scrollY = 0;
    #m_horizontalScrollBar: CScrollBar;
	#m_verticalScrollBar: CScrollBar;

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_viewport = new CWidget(this);
		this.#m_horizontalScrollBar =
			new CScrollBar(COrientation.Horizontal, this);
		this.#m_verticalScrollBar =
			new CScrollBar(COrientation.Vertical, this);
		this.#m_horizontalScrollBar.valueChanged.connect(value => {
			this.setScrollX(value);
		});
		this.#m_verticalScrollBar.valueChanged.connect(value => {
			this.setScrollY(value);
		});

		this.#updateGeometry();
	}

	viewport(): CWidget {
		return this.#m_viewport;
	}

	widget(): CWidget | null {
		return this.#m_widget;
	}

	setWidget(widget: CWidget): CWidget | null {
		if (this.#m_widget === widget)
			return null;

		const oldWidget = this.#m_widget;

		if (oldWidget !== null)
			oldWidget.setParent(null);

		this.#m_widget = widget;
		widget.setParent(this.#m_viewport);

		this.#m_scrollX = 0;
		this.#m_scrollY = 0;

		this.#updateWidgetPosition();
		this.#updateGeometry();
		this.update();

		return oldWidget;
	}

    scrollX(): number {
		return this.#m_scrollX;
	}

	scrollY(): number {
		return this.#m_scrollY;
	}

	setScrollX(x: number): void {
		this.scrollTo(x, this.#m_scrollY);
	}

	setScrollY(y: number): void {
		this.scrollTo(this.#m_scrollX, y);
	}

    scrollTo(x: number, y: number): void {
	    const maxX = Math.max(0,
		    (this.#m_widget?.width() ?? 0) - this.#m_viewport.width());

	    const maxY = Math.max(0,
		    (this.#m_widget?.height() ?? 0) - this.#m_viewport.height());

	    const scrollX = Math.max(0, Math.min(x, maxX));
	    const scrollY = Math.max(0, Math.min(y, maxY));
	    if (scrollX === this.#m_scrollX && scrollY === this.#m_scrollY)
		    return;

	    this.#m_scrollX = scrollX;
	    this.#m_scrollY = scrollY;
	    this.#updateWidgetPosition();

	    if (this.#m_horizontalScrollBar.value() !== scrollX)
		    this.#m_horizontalScrollBar.setValue(scrollX);

	    if (this.#m_verticalScrollBar.value() !== scrollY)
		    this.#m_verticalScrollBar.setValue(scrollY);

	    this.update();
    }

	horizontalScrollBar(): CScrollBar {
		return this.#m_horizontalScrollBar;
	}

	verticalScrollBar(): CScrollBar {
		return this.#m_verticalScrollBar;
	}
	
	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

    protected override wheelEvent(event: CWheelEvent): void {
    	if (!this.#m_verticalScrollBar.isVisible()) {
	    	event.ignore();
		    return;
	    }

	    this.setScrollY(this.#m_scrollY + event.deltaY() / 4);
	    event.accept();
    }

	protected updateScrollBars(): void
	{
		this.#updateGeometry();
	}

	#updateWidgetPosition(): void {
		if (this.#m_widget === null)
			return;

		const x = this.#m_scrollX === 0 ? 0 : -this.#m_scrollX;
		const y = this.#m_scrollY === 0 ? 0 : -this.#m_scrollY;

		this.#m_widget.move(x, y);
	}

	#updateGeometry(): void {
		const scrollBarSize = 16;

		const contentWidth = this.#m_widget?.width() ?? 0;
		const contentHeight = this.#m_widget?.height() ?? 0;

		let viewportWidth = this.width();
		let viewportHeight = this.height();

		let horizontalVisible = contentWidth > viewportWidth;
		let verticalVisible = contentHeight > viewportHeight;

		if (verticalVisible)
			viewportWidth -= scrollBarSize;

		if (horizontalVisible)
			viewportHeight -= scrollBarSize;

		if (!horizontalVisible && contentWidth > viewportWidth) {
			horizontalVisible = true;
			viewportHeight -= scrollBarSize;
		}

		if (!verticalVisible && contentHeight > viewportHeight) {
			verticalVisible = true;
			viewportWidth -= scrollBarSize;
		}

		viewportWidth = Math.max(0, viewportWidth);
		viewportHeight = Math.max(0, viewportHeight);

		this.#m_viewport.setGeometry(0, 0, viewportWidth, viewportHeight);

		this.#m_horizontalScrollBar.setVisible(horizontalVisible);
		this.#m_verticalScrollBar.setVisible(verticalVisible);

		if (horizontalVisible) {
			this.#m_horizontalScrollBar.setGeometry(
				0, viewportHeight, viewportWidth, scrollBarSize
			);

			this.#m_horizontalScrollBar.setRange(
				0, Math.max(0, contentWidth - viewportWidth)
			);

			this.#m_horizontalScrollBar.setPageStep(viewportWidth);
			this.#m_horizontalScrollBar.setValue(this.#m_scrollX);
		}

		if (verticalVisible) {
			this.#m_verticalScrollBar.setGeometry(
				viewportWidth, 0, scrollBarSize, viewportHeight
			);

			this.#m_verticalScrollBar.setRange(
				0, Math.max(0, contentHeight - viewportHeight)
			);

			this.#m_verticalScrollBar.setPageStep(viewportHeight);
			this.#m_verticalScrollBar.setValue(this.#m_scrollY);
		}

		this.scrollTo(this.#m_scrollX, this.#m_scrollY);
	}
}