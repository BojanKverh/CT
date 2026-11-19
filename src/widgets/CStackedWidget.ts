/** @module Widgets/CStackedWidget */
import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CFrame } from "./CFrame.js";

/** Page container presenting one child page at a time and hiding the others.
 *
 * @example
 * With an existing application and parent widget, add pages to the stack and retain the returned indexes for navigation. Each page can have its own layout.
 * ```ts
 * import { CPushButton, CStackedWidget, CWidget } from "canvas-toolkit-lib";
 *
 * function createPageControls(parent: CWidget) {
 *     const pages = new CStackedWidget(parent);
 *     const overviewIndex = pages.addWidget(new CWidget());
 *     const detailsIndex = pages.addWidget(new CWidget());
 *     pages.setCurrentIndex(overviewIndex);
 *     const showDetails = new CPushButton(parent);
 *     showDetails.setText("Show details");
 *     showDetails.clicked.connect(() => pages.setCurrentIndex(detailsIndex));
 *     return { pages, showDetails };
 * }
 * ```
 */
export class CStackedWidget extends CFrame {
	#m_widgets: CWidget[] = [];
	#m_currentIndex = -1;

    /**
    * Emitted with the zero-based page index that becomes current.
    * @group Signals
    */
    readonly currentChanged = new CSignal<[number]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);
	}

    /**
    * Appends an owned page and returns its index. The first page becomes current.
    */
    addWidget(widget: CWidget): number
	{
		return this.insertWidget(this.#m_widgets.length, widget);
	}

    /**
    * Inserts an owned page and preserves or adjusts the current-page index.
    */
    insertWidget(index: number, widget: CWidget): number
	{
		const existingIndex = this.indexOf(widget);

		if (existingIndex !== -1)
			return existingIndex;

		index = Math.max(0, Math.min(index, this.#m_widgets.length));

		const currentWidget = this.currentWidget();

		widget.setParent(this);
		widget.setGeometry(0, 0, this.width(), this.height());
		widget.hide();

		this.#m_widgets.splice(index, 0, widget);

		if (currentWidget === null) {
			this.#m_currentIndex = 0;
			widget.show();
			this.currentChanged.emit(0);
		} else {
			this.#m_currentIndex = this.indexOf(currentWidget);
		}

		this.update();

		return index;
	}

    /**
    * Detaches a registered page and updates the current selection.
    */
    removeWidget(index: number): CWidget | null
	{
		if (index < 0 || index >= this.#m_widgets.length)
			return null;

		const currentWidget = this.currentWidget();
		const widget = this.#m_widgets[index]!;

		this.#m_widgets.splice(index, 1);

		widget.hide();
		widget.setParent(null);

		if (this.#m_widgets.length === 0) {
			this.#m_currentIndex = -1;

			if (currentWidget === widget)
				this.currentChanged.emit(-1);

			this.update();
			return widget;
		}

		if (currentWidget === widget) {
			this.#m_currentIndex = Math.min(index, this.#m_widgets.length - 1);

			this.#m_widgets[this.#m_currentIndex]!.show();
			this.currentChanged.emit(this.#m_currentIndex);
		} else if (currentWidget !== null) {
			this.#m_currentIndex = this.indexOf(currentWidget);
		}

		this.update();

		return widget;
	}

    /**
    * Returns the number of retained pages.
    */
    count(): number
	{
		return this.#m_widgets.length;
	}

    /**
    * Zero-based current item index.
    * The initial value is `-1`.
    */
    currentIndex(): number
	{
		return this.#m_currentIndex;
	}

    /**
    * Returns the visible page widget, or null.
    */
    currentWidget(): CWidget | null
	{
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_widgets[this.#m_currentIndex] ?? null;
	}

    /**
    * Returns a page's index or -1 when absent.
    */
    indexOf(widget: CWidget): number
	{
		return this.#m_widgets.indexOf(widget);
	}

    /**
    * Returns a page by zero-based index, or null.
    */
    widget(index: number): CWidget | null
	{
		return this.#m_widgets[index] ?? null;
	}

    /**
    * Hides the old page and shows the requested valid page, assigning the stack's content size.
    */
    setCurrentIndex(index: number): void
	{
		if (index < 0 || index >= this.#m_widgets.length)
			return;

		if (index === this.#m_currentIndex)
			return;

		this.currentWidget()?.hide();

		this.#m_currentIndex = index;

		const widget = this.#m_widgets[index]!;

		widget.setGeometry(0, 0, this.width(), this.height());
		widget.show();

		this.currentChanged.emit(index);
		this.update();
	}

    /**
    * Shows a page already registered with this stack.
    */
    setCurrentWidget(widget: CWidget): void
	{
		const index = this.indexOf(widget);

		if (index !== -1)
			this.setCurrentIndex(index);
	}

	override setGeometry(
		x: number, y: number, width: number, height: number
	): void
	{
		const sizeChanged = width !== this.width() || height !== this.height();

		super.setGeometry(x, y, width, height);

		if (!sizeChanged)
			return;

		for (const widget of this.#m_widgets)
			widget.setGeometry(0, 0, width, height);
	}
}