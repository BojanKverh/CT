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

	/**
	 * Reads the viewport.
	 * @returns The viewport.
	 */
	viewport(): CWidget {
		return this.#m_viewport;
	}

	/**
	 * Reads the widget.
	 * @returns The widget.
	 */
	widget(): CWidget | null {
		return this.#m_widget;
	}

	/**
	 * Detaches the previous content, installs the replacement in the viewport and resets both scroll offsets.
	 * @param widget Widget to install in the viewport.
	 * @returns The previous widget, or `null` when there was no previous widget or the supplied widget is already installed.
	 */
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

    /**
     * Scrolls a focused descendant into view using the minimum required change on each axis.
     * @param widget Focused widget to reveal within the scroll content.
     * @internal
     */
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

    /**
     * Selects this scroll area for a touch gesture originating in its viewport when either axis can pan.
     * @param child Direct child on the gesture's hit path.
     * @returns This area if the viewport can pan, `null` if neither axis can pan, or `false` for a child outside the viewport.
     * @internal
     */
    override touchScrollAreaFor(child: CWidget): CScrollArea | false | null {
        if (child !== this.#m_viewport) return false;
        return this.canTouchScroll(COrientation.Horizontal) || this.canTouchScroll(COrientation.Vertical)
            ? this : null;
    }

    /**
     * Checks whether the requested scrollbar is visible and has a nonempty range.
     * @param orientation Axis to test.
     * @returns `true` if the viewport can pan along the requested axis.
     * @internal
     */
    canTouchScroll(orientation: COrientation): boolean {
        const bar = orientation === COrientation.Horizontal
            ? this.#m_horizontalScrollBar : this.#m_verticalScrollBar;
        return bar.isVisible() && bar.maximum() > bar.minimum();
    }

    /**
     * Reads the horizontal scroll offset.
     * @returns The scroll x.
     */
    scrollX(): number {
		return this.#m_scrollX;
	}

	/**
	 * Reads the vertical scroll offset.
	 * @returns The scroll y.
	 */
	scrollY(): number {
		return this.#m_scrollY;
	}

	/**
	 * Sets the scroll x.
	 * @param x Horizontal coordinate.
	 */
	setScrollX(x: number): void {
		this.scrollTo(x, this.#m_scrollY);
	}

	/**
	 * Sets the scroll y.
	 * @param y Vertical coordinate.
	 */
	setScrollY(y: number): void {
		this.scrollTo(this.#m_scrollX, y);
	}

    /**
     * Scrolls the to. May update the scroll x, the scroll y. May request a repaint.
     * @param x Horizontal coordinate.
     * @param y Vertical coordinate.
     */
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

	/**
	 * Reads the horizontal scroll bar.
	 * @returns The horizontal scroll bar.
	 */
	horizontalScrollBar(): CScrollBar {
		return this.#m_horizontalScrollBar;
	}

	/**
	 * Reads the vertical scroll bar.
	 * @returns The vertical scroll bar.
	 */
	verticalScrollBar(): CScrollBar {
		return this.#m_verticalScrollBar;
	}
	
	/**
	 * Sets the geometry.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	/**
	 * Resizes the width.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	/**
	 * Refreshes the scroll area in response to a change in frame.
	 */
	protected override frameChanged(): void
	{
		this.#updateGeometry();
	}

    /**
     * Scrolls visible axes using the wheel deltas. Shift routes vertical input to horizontal scrolling if the browser has not already done so. Accepts the event only if an offset changed.
     * @param event Wheel event containing axis deltas and the Shift state.
     */
    protected override wheelEvent(event: CWheelEvent): void {
        const shift = event.shiftKey();
        // Use the browser's horizontal delta when it already remapped the wheel.
        const horizontalDelta = shift && event.deltaX() === 0 ? event.deltaY() : event.deltaX();
        const dx = this.#m_horizontalScrollBar.isVisible() ? horizontalDelta : 0;
        const dy = !shift && this.#m_verticalScrollBar.isVisible() ? event.deltaY() : 0;
        if (dx === 0 && dy === 0) {
            event.ignore();
            return;
        }

        const previousX = this.#m_scrollX;
        const previousY = this.#m_scrollY;
        this.scrollTo(previousX + dx / 4, previousY + dy / 4);
        if (this.#m_scrollX !== previousX || this.#m_scrollY !== previousY) {
            event.accept();
        } else {
            event.ignore();
        }
    }

	/**
	 * Updates the scroll bars.
	 */
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
