import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CWidget } from "./CWidget.js";
import { CFrame } from "./CFrame.js";
import { CFrameShadow, CFrameShape } from "../gui/CFrameStyle.js";
import { COrientation } from "../gui/COrientation.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWheelEvent } from "../events/CWheelEvent.js";

/** Implements the scroll area widget. */
export class CScrollArea extends CFrame {
	static readonly ScrollBarExtent = 16;

	#m_viewport: CWidget;
	#m_widget: CWidget | null = null;
	#m_scrollX = 0;
	#m_scrollY = 0;
    #m_horizontalScrollBar: CScrollBar;
	#m_verticalScrollBar: CScrollBar;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_viewport = new CWidget(this);
		this.#m_horizontalScrollBar =
			new CScrollBar(COrientation.Horizontal, this);
		this.#m_verticalScrollBar =
			new CScrollBar(COrientation.Vertical, this);
        // Embedded scroll bars are mouse-focusable, but are not separate Tab stops.
        this.#m_horizontalScrollBar.setFocusPolicy(CFocusPolicy.ClickFocus);
        this.#m_verticalScrollBar.setFocusPolicy(CFocusPolicy.ClickFocus);
		this.#m_horizontalScrollBar.valueChanged.connect(value => {
			this.setScrollX(value);
		});
		this.#m_verticalScrollBar.valueChanged.connect(value => {
			this.setScrollY(value);
		});

		this.setFrameShape(CFrameShape.Panel);
		this.setFrameShadow(CFrameShadow.Sunken);
		this.#updateGeometry();
	}

	/** Provides viewport behavior. */
	viewport(): CWidget {
		return this.#m_viewport;
	}

	/** Provides widget behavior. */
	widget(): CWidget | null {
		return this.#m_widget;
	}

	/** Sets the widget. */
	setWidget(widget: CWidget): CWidget | null {
		/** Provides if behavior. */
		if (this.#m_widget === widget)
			return null;

		const oldWidget = this.#m_widget;

		/** Provides if behavior. */
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

    /** @internal Reveals a focused control within the scroll content. */
    override revealTabFocus(widget: CWidget): void {
        const content = this.#m_widget;
        if (content === null) return;

        // Focus proxies may point at the entire scrolling surface.
        let parent = widget.parent();
        while (parent !== null && parent !== content) parent = parent.parent();
        if (parent === null) return;

        const origin = widget.mapToCanvas(0, 0);
        const position = this.#m_viewport.mapFromCanvas(origin.x(), origin.y());
        const delta = (start: number, size: number, viewportSize: number): number => {
            const end = start + Math.min(size, viewportSize);
            return start < 0 ? start : Math.max(0, end - viewportSize);
        };

        this.scrollTo(
            this.#m_scrollX + delta(position.x(), widget.width(), this.#m_viewport.width()),
            this.#m_scrollY + delta(position.y(), widget.height(), this.#m_viewport.height())
        );
    }

    /** @internal Touch panning starts in the viewport, including its content. */
    override touchScrollAreaFor(child: CWidget): CScrollArea | false | null {
        if (child !== this.#m_viewport) return false;
        return this.canTouchScroll(COrientation.Horizontal) || this.canTouchScroll(COrientation.Vertical)
            ? this : null;
    }

    /** @internal Returns whether the viewport can be panned along this axis. */
    canTouchScroll(orientation: COrientation): boolean {
        const bar = orientation === COrientation.Horizontal
            ? this.#m_horizontalScrollBar : this.#m_verticalScrollBar;
        return bar.isVisible() && bar.maximum() > bar.minimum();
    }

    /** Provides scroll x behavior. */
    scrollX(): number {
		return this.#m_scrollX;
	}

	/** Provides scroll y behavior. */
	scrollY(): number {
		return this.#m_scrollY;
	}

	/** Sets the scroll x. */
	setScrollX(x: number): void {
		this.scrollTo(x, this.#m_scrollY);
	}

	/** Sets the scroll y. */
	setScrollY(y: number): void {
		this.scrollTo(this.#m_scrollX, y);
	}

    /** Provides scroll to behavior. */
    scrollTo(x: number, y: number): void {
	    const maxX = Math.max(0,
		    (this.#m_widget?.width() ?? 0) - this.#m_viewport.width());

	    const maxY = Math.max(0,
		    (this.#m_widget?.height() ?? 0) - this.#m_viewport.height());

	    const scrollX = Math.max(0, Math.min(x, maxX));
	    const scrollY = Math.max(0, Math.min(y, maxY));
	    /** Provides if behavior. */
	    if (scrollX === this.#m_scrollX && scrollY === this.#m_scrollY)
		    return;

	    this.#m_scrollX = scrollX;
	    this.#m_scrollY = scrollY;
	    this.#updateWidgetPosition();

	    /** Provides if behavior. */
	    if (this.#m_horizontalScrollBar.value() !== scrollX)
		    this.#m_horizontalScrollBar.setValue(scrollX);

	    /** Provides if behavior. */
	    if (this.#m_verticalScrollBar.value() !== scrollY)
		    this.#m_verticalScrollBar.setValue(scrollY);

	    this.update();
    }

	/** Provides horizontal scroll bar behavior. */
	horizontalScrollBar(): CScrollBar {
		return this.#m_horizontalScrollBar;
	}

	/** Provides vertical scroll bar behavior. */
	verticalScrollBar(): CScrollBar {
		return this.#m_verticalScrollBar;
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

	/** Handles frame changed behavior. */
	protected override frameChanged(): void
	{
		this.#updateGeometry();
	}

    /** Handles the wheel event. */
    protected override wheelEvent(event: CWheelEvent): void {
    	/** Provides if behavior. */
    	if (!this.#m_verticalScrollBar.isVisible()) {
	    	event.ignore();
		    return;
	    }

	    this.setScrollY(this.#m_scrollY + event.deltaY() / 4);
	    event.accept();
    }

	/** Handles update scroll bars behavior. */
	protected updateScrollBars(): void
	{
		this.#updateGeometry();
	}

	#updateWidgetPosition(): void {
		/** Provides if behavior. */
		if (this.#m_widget === null)
			return;

		const x = this.#m_scrollX === 0 ? 0 : -this.#m_scrollX;
		const y = this.#m_scrollY === 0 ? 0 : -this.#m_scrollY;

		this.#m_widget.move(x, y);
	}

	#updateGeometry(): void {
		const scrollBarSize = CScrollArea.ScrollBarExtent;
		const frameWidth = this.frameWidth();

		const contentWidth = this.#m_widget?.width() ?? 0;
		const contentHeight = this.#m_widget?.height() ?? 0;

		let viewportWidth = Math.max(0, this.width() - 2 * frameWidth);
		let viewportHeight = Math.max(0, this.height() - 2 * frameWidth);

		let horizontalVisible = contentWidth > viewportWidth;
		let verticalVisible = contentHeight > viewportHeight;

		/** Provides if behavior. */
		if (verticalVisible)
			viewportWidth -= scrollBarSize;

		/** Provides if behavior. */
		if (horizontalVisible)
			viewportHeight -= scrollBarSize;

		/** Provides if behavior. */
		if (!horizontalVisible && contentWidth > viewportWidth) {
			horizontalVisible = true;
			viewportHeight -= scrollBarSize;
		}

		/** Provides if behavior. */
		if (!verticalVisible && contentHeight > viewportHeight) {
			verticalVisible = true;
			viewportWidth -= scrollBarSize;
		}

		viewportWidth = Math.max(0, viewportWidth);
		viewportHeight = Math.max(0, viewportHeight);

		this.#m_viewport.setGeometry(
			frameWidth, frameWidth, viewportWidth, viewportHeight
		);

		this.#m_horizontalScrollBar.setVisible(horizontalVisible);
		this.#m_verticalScrollBar.setVisible(verticalVisible);

		/** Provides if behavior. */
		if (horizontalVisible) {
			this.#m_horizontalScrollBar.setGeometry(
				frameWidth,
				frameWidth + viewportHeight,
				viewportWidth,
				scrollBarSize
			);

			this.#m_horizontalScrollBar.setRange(
				0, Math.max(0, contentWidth - viewportWidth)
			);

			this.#m_horizontalScrollBar.setPageStep(viewportWidth);
			this.#m_horizontalScrollBar.setValue(this.#m_scrollX);
		}

		/** Provides if behavior. */
		if (verticalVisible) {
			this.#m_verticalScrollBar.setGeometry(
				frameWidth + viewportWidth,
				frameWidth,
				scrollBarSize,
				viewportHeight
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
