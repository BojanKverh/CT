import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
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

	/** Adds tab. */
	addTab(widget: CWidget, text: string): number {
		return this.insertTab(this.#m_tabs.length, widget, text);
	}

	/** Inserts tab. */
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

	/** Removes tab. */
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

	/** Provides count behavior. */
	count(): number {
		return this.#m_tabs.length;
	}

	/** Returns the current index. */
	currentIndex(): number {
		return this.#m_stack.currentIndex();
	}

	/** Returns the current widget. */
	currentWidget(): CWidget | null {
		return this.#m_stack.currentWidget();
	}

	/** Sets the current index. */
	setCurrentIndex(index: number): void {
		/** Provides if behavior. */
		if (!this.isTabEnabled(index))
			return;

		this.#m_stack.setCurrentIndex(index);
	}

	/** Sets the current widget. */
	setCurrentWidget(widget: CWidget): void {
		const index = this.indexOf(widget);

		/** Provides if behavior. */
		if (index !== -1)
			this.setCurrentIndex(index);
	}

	/** Provides widget behavior. */
	widget(index: number): CWidget | null {
		return this.#m_stack.widget(index);
	}

	/** Provides index of behavior. */
	indexOf(widget: CWidget): number {
		return this.#m_stack.indexOf(widget);
	}

	/** Provides tab text behavior. */
	tabText(index: number): string {
		return this.#m_tabs[index]?.text ?? "";
	}

	/** Sets the tab text. */
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

	/** Returns whether the tab enabled condition is active. */
	isTabEnabled(index: number): boolean {
		return this.#m_tabs[index]?.enabled ?? false;
	}

	/** Sets the tab enabled. */
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

	/** Returns whether the tab hovered condition is active. */
	isTabHovered(index: number): boolean {
		return index === this.#m_hoveredIndex;
	}

	/** Returns whether the tab pressed condition is active. */
	isTabPressed(index: number): boolean {
		return index === this.#m_pressedIndex;
	}

    /** Provides tab width behavior. */
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

	/** Provides tab height behavior. */
	tabHeight(): number {
		return CTabWidget.#TAB_HEIGHT;
	}

	/** Sets the geometry. */
	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateStackGeometry();
	}

    /** Handles the mouse press event. */
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

	/** Handles the mouse release event. */
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

	/** Handles the mouse move event. */
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

	/** Handles the mouse leave event. */
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

	/** Handles the paint event. */
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