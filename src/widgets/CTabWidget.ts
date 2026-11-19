/** @module Widgets/CTabWidget */
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

/** Tabbed page container with enabled tabs, pointer activation and arrow-key navigation. */
export class CTabWidget extends CWidget {
	static readonly #TAB_HEIGHT = 24;
	static readonly #TAB_PADDING = 6;
    static readonly #TAB_MIN_WIDTH = 50;

	#m_tabs: CTab[] = [];
	#m_stack: CStackedWidget;
	#m_hoveredIndex = -1;
	#m_pressedIndex = -1;

    /**
    * Emitted with the zero-based page index that becomes current.
    * @group Signals
    */
    readonly currentChanged = new CSignal<[number]>();
    /**
    * Emitted with the zero-based index of the tab clicked by the pointer.
    * @group Signals
    */
    readonly tabClicked = new CSignal<[number]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_stack = new CStackedWidget(this);
		this.#m_stack.currentChanged.connect(index => {
			this.currentChanged.emit(index);
			this.update();
		});
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /**
    * Appends a page with a tab caption and returns its index.
    */
    addTab(widget: CWidget, text: string): number {
		return this.insertTab(this.#m_tabs.length, widget, text);
	}

    /**
    * Inserts a page and caption at a requested position and returns the inserted index.
    */
    insertTab(index: number, widget: CWidget, text: string): number {
		const existingIndex = this.indexOf(widget);

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
    * Removes the tab and its page from this container.
    */
    removeTab(index: number): CWidget | null {
		if (index < 0 || index >= this.#m_tabs.length)
			return null;

		this.#m_tabs.splice(index, 1);

		const widget = this.#m_stack.removeWidget(index);

		if (this.#m_hoveredIndex === index)
			this.#m_hoveredIndex = -1;
		else if (this.#m_hoveredIndex > index)
			--this.#m_hoveredIndex;

		if (this.#m_pressedIndex === index)
			this.#m_pressedIndex = -1;
		else if (this.#m_pressedIndex > index)
			--this.#m_pressedIndex;

		this.update();

		return widget;
	}

    /**
    * Returns the number of tab pages.
    */
    count(): number {
		return this.#m_tabs.length;
	}

    /**
    * Returns the active page index, or -1 without a current page.
    */
    currentIndex(): number {
		return this.#m_stack.currentIndex();
	}

    /**
    * Returns the visible page, or null.
    */
    currentWidget(): CWidget | null {
		return this.#m_stack.currentWidget();
	}

    /**
    * Activates an enabled tab. Invalid, disabled and unchanged indexes are ignored.
    */
    setCurrentIndex(index: number): void {
		if (!this.isTabEnabled(index))
			return;

		this.#m_stack.setCurrentIndex(index);
	}

    /**
    * Activates the tab owning the given page when it is present and enabled.
    */
    setCurrentWidget(widget: CWidget): void {
		const index = this.indexOf(widget);

		if (index !== -1)
			this.setCurrentIndex(index);
	}

    /**
    * Returns the page at an index, or null when out of range.
    */
    widget(index: number): CWidget | null {
		return this.#m_stack.widget(index);
	}

    /**
    * Returns the tab index for a page, or -1 when absent.
    */
    indexOf(widget: CWidget): number {
		return this.#m_stack.indexOf(widget);
	}

    /**
    * Returns the caption of a tab, or an empty string for an invalid index.
    */
    tabText(index: number): string {
		return this.#m_tabs[index]?.text ?? "";
	}

    /**
    * Changes an existing tab caption and requests layout and repaint as needed.
    */
    setTabText(index: number, text: string): void {
		const tab = this.#m_tabs[index];

		if (tab === undefined)
			return;

		if (tab.text === text)
			return;

		tab.text = text;
		this.update();
	}

    /**
    * Reports whether a tab can be activated. Invalid indexes return false.
    */
    isTabEnabled(index: number): boolean {
		return this.#m_tabs[index]?.enabled ?? false;
	}

    /**
    * Enables or disables a tab. Disabling the current tab selects an available enabled neighbor.
    */
    setTabEnabled(index: number, enabled: boolean): void {
		const tab = this.#m_tabs[index];

		if (tab === undefined)
			return;

		if (tab.enabled === enabled)
			return;

		tab.enabled = enabled;

		if (!enabled && index === this.currentIndex())
			this.#selectNextEnabledTab(index);

		this.update();
	}

    /**
    * Reports whether pointer hover feedback applies to the specified tab.
    */
    isTabHovered(index: number): boolean {
		return index === this.#m_hoveredIndex;
	}

    /**
    * Reports whether pressed feedback applies to the specified tab.
    */
    isTabPressed(index: number): boolean {
		return index === this.#m_pressedIndex;
	}

    /**
    * Returns the preferred logical width for a tab caption.
    */
    tabWidth(i: number): number {
        if (this.#m_tabs[i] !== undefined && this.#m_tabs[i].text !== undefined)
            return Math.max(
                CTabWidget.#TAB_MIN_WIDTH, 
                this.fontMetrics().textWidth(this.#m_tabs[i].text) + 2 * CTabWidget.#TAB_PADDING
            );
        else
            return 0;
    }

    /**
    * Returns the logical height of the tab-header strip.
    */
    tabHeight(): number {
		return CTabWidget.#TAB_HEIGHT;
	}

	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateStackGeometry();
	}

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

    protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const index = this.#tabAt(event.x(), event.y());

		if (!this.isTabEnabled(index)) {
			event.ignore();
			return;
		}

		this.#m_pressedIndex = index;

		event.accept();
		this.update();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const pressedIndex = this.#m_pressedIndex;
		const index = this.#tabAt(event.x(), event.y());

		this.#m_pressedIndex = -1;

		event.accept();
		this.update();

		if (pressedIndex === -1 || pressedIndex !== index)
			return;

		if (!this.isTabEnabled(index))
			return;

		this.setCurrentIndex(index);
		this.tabClicked.emit(index);
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		const index = this.#tabAt(event.x(), event.y());

		if (index === this.#m_hoveredIndex) {
			event.ignore();
			return;
		}

		this.#m_hoveredIndex = index;

		event.accept();
		this.update();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		if (this.#m_hoveredIndex === -1) {
			event.ignore();
			return;
		}

		this.#m_hoveredIndex = -1;

		event.accept();
		this.update();
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionTabWidget();
		option.initFromTabWidget(this);

		this.style().drawTabWidget(painter, option);
	}

	#tabAt(x: number, y: number): number {
		if (y < 0 || y >= CTabWidget.#TAB_HEIGHT)
			return -1;

		if (x < 0)
			return -1;

        let sum = 0;
        for (let i = 0; i < this.#m_tabs.length; ++i) {
            sum += this.tabWidth(i);
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
		for (let i = index + 1; i < this.#m_tabs.length; ++i) {
			if (this.#m_tabs[i]!.enabled) {
				this.#m_stack.setCurrentIndex(i);
				return;
			}
		}

		for (let i = index - 1; i >= 0; --i) {
			if (this.#m_tabs[i]!.enabled) {
				this.#m_stack.setCurrentIndex(i);
				return;
			}
		}
	}
}