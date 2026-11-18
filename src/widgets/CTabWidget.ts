import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CStackedWidget } from "./CStackedWidget.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionTabWidget } from "../gui/CStyleOptionTabWidget.js";

interface CTab {
	text: string;
	enabled: boolean;
}

/** Implements the tab widget widget. */
export class CTabWidget extends CWidget {
	static readonly #TAB_HEIGHT = 24;
	static readonly #TAB_PADDING = 6;
    static readonly #TAB_MIN_WIDTH = 50;

	#m_tabs: CTab[] = [];
	#m_stack: CStackedWidget;
	#m_hoveredIndex = -1;
	#m_pressedIndex = -1;
    
	/** Signal emitted when current changes. */
	readonly currentChanged = new CSignal<[number]>();
	/** Public tab clicked member. */
	readonly tabClicked = new CSignal<[number]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_stack = new CStackedWidget(this);
		this.#m_stack.currentChanged.connect(index => {
			this.currentChanged.emit(index);
			this.update();
		});
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/**
	 * Appends a tab unless the widget already has one.
	 * @param widget Widget to show as a tab page.
	 * @param text Text to show in the tab header.
	 * @returns Zero-based index of the added or existing tab.
	 */
	addTab(widget: CWidget, text: string): number {
		return this.insertTab(this.#m_tabs.length, widget, text);
	}

	/**
	 * Inserts an enabled tab and its page at the requested position. If the page is already present, returns its original index.
	 * @param index Zero-based insertion position, clamped to the current tab range.
	 * @param widget Widget to show as the tab page.
	 * @param text Text to show in the tab header.
	 * @returns Zero-based index of the added or existing tab.
	 */
	insertTab(index: number, widget: CWidget, text: string): number {
		const existingIndex = this.indexOf(widget);

		/** Provides if behavior. */
		if (existingIndex !== -1)
			return existingIndex;

		index = Math.max(0, Math.min(index, this.#m_tabs.length));

		this.#m_tabs.splice(index, 0, {
			text,
			enabled: true
		});

		const result = this.#m_stack.insertWidget(index, widget);

		this.#updateStackGeometry();
		this.update();

		return result;
	}

	/**
	 * Removes a tab and detaches its page without destroying it. Updates hover and press tracking.
	 * @param index Zero-based tab index.
	 * @returns Detached tab page, or `null` for an out-of-range index.
	 */
	removeTab(index: number): CWidget | null {
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_tabs.length)
			return null;

		this.#m_tabs.splice(index, 1);

		const widget = this.#m_stack.removeWidget(index);

		/** Provides if behavior. */
		if (this.#m_hoveredIndex === index)
			this.#m_hoveredIndex = -1;
		else if (this.#m_hoveredIndex > index)
			--this.#m_hoveredIndex;

		/** Provides if behavior. */
		if (this.#m_pressedIndex === index)
			this.#m_pressedIndex = -1;
		else if (this.#m_pressedIndex > index)
			--this.#m_pressedIndex;

		this.update();

		return widget;
	}

	/**
	 * Counts the entries in the tab widget.
	 * @returns The number of entries in the tabs.
	 */
	count(): number {
		return this.#m_tabs.length;
	}

	/**
	 * Returns the current index.
	 * @returns The current index.
	 */
	currentIndex(): number {
		return this.#m_stack.currentIndex();
	}

	/**
	 * Looks up the page of the current tab.
	 * @returns The current tab widget, or `null` if no tab is active.
	 */
	currentWidget(): CWidget | null {
		return this.#m_stack.currentWidget();
	}

	/**
	 * Sets the current index.
	 * @param index Zero-based item index.
	 */
	setCurrentIndex(index: number): void {
		/** Provides if behavior. */
		if (!this.isTabEnabled(index))
			return;

		this.#m_stack.setCurrentIndex(index);
	}

	/**
	 * Finds the tab for a registered widget and attempts to select it. Unregistered widgets are ignored.
	 * @param widget Tab page to select.
	 */
	setCurrentWidget(widget: CWidget): void {
		const index = this.indexOf(widget);

		/** Provides if behavior. */
		if (index !== -1)
			this.setCurrentIndex(index);
	}

	/**
	 * Looks up a registered page without making it current.
	 * @param index Zero-based page index.
	 * @returns The page widget, or `null` if the index is absent.
	 */
	widget(index: number): CWidget | null {
		return this.#m_stack.widget(index);
	}

	/**
	 * Finds a registered page by widget identity.
	 * @param widget Page widget to look up.
	 * @returns Zero-based page index, or `-1` if the widget is not registered.
	 */
	indexOf(widget: CWidget): number {
		return this.#m_stack.indexOf(widget);
	}

	/**
	 * Reads the caption of a tab.
	 * @param index Zero-based tab index.
	 * @returns Caption, or an empty string if the tab does not exist.
	 */
	tabText(index: number): string {
		return this.#m_tabs[index]?.text ?? "";
	}

	/**
	 * Changes a tab header caption and repaints the tabs. A missing tab is ignored.
	 * @param index Zero-based tab index.
	 * @param text New header caption.
	 */
	setTabText(index: number, text: string): void {
		const tab = this.#m_tabs[index];

		/** Provides if behavior. */
		if (tab === undefined)
			return;

		/** Provides if behavior. */
		if (tab.text === text)
			return;

		tab.text = text;
		this.update();
	}

	/**
	 * Checks whether the tab widget is tab enabled.
	 * @param index Zero-based item index.
	 * @returns `true` if the tab widget is tab enabled, otherwise `false`.
	 */
	isTabEnabled(index: number): boolean {
		return this.#m_tabs[index]?.enabled ?? false;
	}

	/**
	 * Sets the tab enabled.
	 * @param index Zero-based item index.
	 * @param enabled Whether to enable the feature.
	 */
	setTabEnabled(index: number, enabled: boolean): void {
		const tab = this.#m_tabs[index];

		/** Provides if behavior. */
		if (tab === undefined)
			return;

		/** Provides if behavior. */
		if (tab.enabled === enabled)
			return;

		tab.enabled = enabled;

		/** Provides if behavior. */
		if (!enabled && index === this.currentIndex())
			this.#selectNextEnabledTab(index);

		this.update();
	}

	/**
	 * Checks whether the tab widget is tab hovered.
	 * @param index Zero-based item index.
	 * @returns `true` if the tab widget is tab hovered, otherwise `false`.
	 */
	isTabHovered(index: number): boolean {
		return index === this.#m_hoveredIndex;
	}

	/**
	 * Checks whether the tab widget is tab pressed.
	 * @param index Zero-based item index.
	 * @returns `true` if the tab widget is tab pressed, otherwise `false`.
	 */
	isTabPressed(index: number): boolean {
		return index === this.#m_pressedIndex;
	}

    /**
     * Measures the header caption with padding and applies the minimum tab width.
     * @param i Zero-based tab index.
     * @returns Width in logical pixels, or zero if the tab is absent.
     */
    tabWidth(i: number): number {
        /** Provides if behavior. */
        if (this.#m_tabs[i] !== undefined && this.#m_tabs[i].text !== undefined)
            return Math.max(
                CTabWidget.#TAB_MIN_WIDTH, 
                this.fontMetrics().textWidth(this.#m_tabs[i].text) + 2 * CTabWidget.#TAB_PADDING
            );
        else
            return 0;
    }

	/**
	 * Reads the tab height of the tab widget.
	 * @returns The tab height.
	 */
	tabHeight(): number {
		return CTabWidget.#TAB_HEIGHT;
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
		this.#updateStackGeometry();
	}

    /**
     * Responds to a key press for the tab widget. May accept or ignore the event depending on the input.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        const key = event.key();
        if (!this.hasFocus() || (key !== "ArrowLeft" && key !== "ArrowRight")
            || event.ctrl() || event.alt() || event.meta() || event.shift()) {
            event.ignore();
            return;
        }

        const step = key === "ArrowRight" ? 1 : -1;
        const count = this.count();
        const current = this.currentIndex();
        for (let offset = 1; offset < count; offset++) {
            const index = (current + step * offset + count) % count;
            if (!this.isTabEnabled(index)) continue;
            this.setCurrentIndex(index);
            event.accept();
            return;
        }
        event.ignore();
    }

    /**
     * Responds to a pointer button press for the tab widget. May update the pressed index. May request a repaint and accept or ignore the event depending on the input.
     * @param event Event for a pointer button press.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const index = this.#tabAt(event.x(), event.y());

		/** Provides if behavior. */
		if (!this.isTabEnabled(index)) {
			event.ignore();
			return;
		}

		this.#m_pressedIndex = index;

		event.accept();
		this.update();
	}

	/**
	 * Responds to a pointer button release for the tab widget. May update the pressed index. May request a repaint and accept or ignore the event depending on the input. May emit `tabClicked`.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const pressedIndex = this.#m_pressedIndex;
		const index = this.#tabAt(event.x(), event.y());

		this.#m_pressedIndex = -1;

		event.accept();
		this.update();

		/** Provides if behavior. */
		if (pressedIndex === -1 || pressedIndex !== index)
			return;

		/** Provides if behavior. */
		if (!this.isTabEnabled(index))
			return;

		this.setCurrentIndex(index);
		this.tabClicked.emit(index);
	}

	/**
	 * Responds to pointer movement for the tab widget. May update the hovered index. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		const index = this.#tabAt(event.x(), event.y());

		/** Provides if behavior. */
		if (index === this.#m_hoveredIndex) {
			event.ignore();
			return;
		}

		this.#m_hoveredIndex = index;

		event.accept();
		this.update();
	}

	/**
	 * Responds to pointer exit for the tab widget. May update the hovered index. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (this.#m_hoveredIndex === -1) {
			event.ignore();
			return;
		}

		this.#m_hoveredIndex = -1;

		event.accept();
		this.update();
	}

	/**
	 * Draws the tab widget through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(this);

		this.style().drawTabWidget(painter, option);
	}
	
	#tabAt(x: number, y: number): number {
		/** Provides if behavior. */
		if (y < 0 || y >= CTabWidget.#TAB_HEIGHT)
			return -1;

		/** Provides if behavior. */
		if (x < 0)
			return -1;

        let sum = 0;
        /** Provides for behavior. */
        for (let i = 0; i < this.#m_tabs.length; ++i) {
            sum += this.tabWidth(i);
            /** Provides if behavior. */
            if (x < sum)
                return i;
        }
		return -1;
	}

	#updateStackGeometry(): void {
		const height = Math.max(0, this.height() - CTabWidget.#TAB_HEIGHT);

		this.#m_stack.setGeometry(
			0,
			CTabWidget.#TAB_HEIGHT,
			this.width(),
			height
		);
	}

	#selectNextEnabledTab(index: number): void {
		/** Provides for behavior. */
		for (let i = index + 1; i < this.#m_tabs.length; ++i) {
			/** Provides if behavior. */
			if (this.#m_tabs[i]!.enabled) {
				this.#m_stack.setCurrentIndex(i);
				return;
			}
		}

		/** Provides for behavior. */
		for (let i = index - 1; i >= 0; --i) {
			/** Provides if behavior. */
			if (this.#m_tabs[i]!.enabled) {
				this.#m_stack.setCurrentIndex(i);
				return;
			}
		}
	}
}