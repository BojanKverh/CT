import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CFrame } from "./CFrame.js";

/** Implements the stacked widget widget. */
export class CStackedWidget extends CFrame {
	#m_widgets: CWidget[] = [];
	#m_currentIndex = -1;

	/** Signal emitted when current changes. */
	readonly currentChanged = new CSignal<[number]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);
	}

	/**
	 * Appends a page or returns its existing position if already registered.
	 * @param widget Page widget to add.
	 * @returns Zero-based page index.
	 */
	addWidget(widget: CWidget): number
	{
		return this.insertWidget(this.#m_widgets.length, widget);
	}

	/**
	 * Inserts a page, reparents it and sizes it to the stack. Preserves the current widget when one exists.
	 * @param index Zero-based insertion position, clamped to the range from zero to the current count.
	 * @param widget Page widget to insert.
	 * @returns Inserted index or the existing index when the widget was already registered.
	 */
	insertWidget(index: number, widget: CWidget): number
	{
		const existingIndex = this.indexOf(widget);

		/** Provides if behavior. */
		if (existingIndex !== -1)
			return existingIndex;

		index = Math.max(0, Math.min(index, this.#m_widgets.length));

		const currentWidget = this.currentWidget();

		widget.setParent(this);
		widget.setGeometry(0, 0, this.width(), this.height());
		widget.hide();

		this.#m_widgets.splice(index, 0, widget);

		/** Provides if behavior. */
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
	 * Removes, hides and detaches a page without destroying it. Updates the current page when needed.
	 * @param index Zero-based page index.
	 * @returns Detached widget, or `null` if the index is out of range.
	 */
	removeWidget(index: number): CWidget | null
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_widgets.length)
			return null;

		const currentWidget = this.currentWidget();
		const widget = this.#m_widgets[index]!;

		this.#m_widgets.splice(index, 1);

		widget.hide();
		widget.setParent(null);

		/** Provides if behavior. */
		if (this.#m_widgets.length === 0) {
			this.#m_currentIndex = -1;

			/** Provides if behavior. */
			if (currentWidget === widget)
				this.currentChanged.emit(-1);

			this.update();
			return widget;
		}

		/** Provides if behavior. */
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
	 * Counts the entries in the stacked widget.
	 * @returns The number of entries in the widgets.
	 */
	count(): number
	{
		return this.#m_widgets.length;
	}

	/**
	 * Returns the current index.
	 * @returns The current index.
	 */
	currentIndex(): number
	{
		return this.#m_currentIndex;
	}

	/**
	 * Looks up the widget currently presented by the stack.
	 * @returns The active page, or `null` when no page is active.
	 */
	currentWidget(): CWidget | null
	{
		/** Provides if behavior. */
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_widgets[this.#m_currentIndex] ?? null;
	}

	/**
	 * Finds a registered page by widget identity.
	 * @param widget Page widget to look up.
	 * @returns Zero-based page index, or `-1` if the widget is not registered.
	 */
	indexOf(widget: CWidget): number
	{
		return this.#m_widgets.indexOf(widget);
	}

	/**
	 * Looks up a registered page without making it current.
	 * @param index Zero-based page index.
	 * @returns The page widget, or `null` if the index is absent.
	 */
	widget(index: number): CWidget | null
	{
		return this.#m_widgets[index] ?? null;
	}

	/**
	 * Sets the current index.
	 * @param index Zero-based item index.
	 */
	setCurrentIndex(index: number): void
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_widgets.length)
			return;

		/** Provides if behavior. */
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
	 * Makes a registered page current through the index-based selection rules. Unregistered widgets are ignored.
	 * @param widget Page widget to show.
	 */
	setCurrentWidget(widget: CWidget): void
	{
		const index = this.indexOf(widget);

		/** Provides if behavior. */
		if (index !== -1)
			this.setCurrentIndex(index);
	}

	/**
	 * Sets the geometry.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override setGeometry(
		x: number, y: number, width: number, height: number
	): void
	{
		const sizeChanged = width !== this.width() || height !== this.height();

		super.setGeometry(x, y, width, height);

		/** Provides if behavior. */
		if (!sizeChanged)
			return;

		/** Provides for behavior. */
		for (const widget of this.#m_widgets)
			widget.setGeometry(0, 0, width, height);
	}
}