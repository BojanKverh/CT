import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";

export class CStackedWidget extends CWidget {
	#m_widgets: CWidget[] = [];
	#m_currentIndex = -1;

	readonly currentChanged = new CSignal<[number]>();

	constructor(parent: CWidget | null = null)
	{
		super(parent);
	}

	addWidget(widget: CWidget): number
	{
		return this.insertWidget(this.#m_widgets.length, widget);
	}

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

	count(): number
	{
		return this.#m_widgets.length;
	}

	currentIndex(): number
	{
		return this.#m_currentIndex;
	}

	currentWidget(): CWidget | null
	{
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_widgets[this.#m_currentIndex] ?? null;
	}

	indexOf(widget: CWidget): number
	{
		return this.#m_widgets.indexOf(widget);
	}

	widget(index: number): CWidget | null
	{
		return this.#m_widgets[index] ?? null;
	}

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