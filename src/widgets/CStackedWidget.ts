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

	/** Adds widget. */
	addWidget(widget: CWidget): number
	{
		return this.insertWidget(this.#m_widgets.length, widget);
	}

	/** Inserts widget. */
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

	/** Removes widget. */
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

	/** Provides count behavior. */
	count(): number
	{
		return this.#m_widgets.length;
	}

	/** Returns the current index. */
	currentIndex(): number
	{
		return this.#m_currentIndex;
	}

	/** Returns the current widget. */
	currentWidget(): CWidget | null
	{
		/** Provides if behavior. */
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_widgets[this.#m_currentIndex] ?? null;
	}

	/** Provides index of behavior. */
	indexOf(widget: CWidget): number
	{
		return this.#m_widgets.indexOf(widget);
	}

	/** Provides widget behavior. */
	widget(index: number): CWidget | null
	{
		return this.#m_widgets[index] ?? null;
	}

	/** Sets the current index. */
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

	/** Sets the current widget. */
	setCurrentWidget(widget: CWidget): void
	{
		const index = this.indexOf(widget);

		/** Provides if behavior. */
		if (index !== -1)
			this.setCurrentIndex(index);
	}

	/** Sets the geometry. */
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