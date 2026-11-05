import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CToolBoxButton } from "./CToolBoxButton.js";
import { CWidget } from "./CWidget.js";

interface CToolBoxItem
{
	widget: CWidget;
	button: CToolBoxButton;
}

/** Implements the tool box widget. */
export class CToolBox extends CWidget
{
	#m_items: CToolBoxItem[] = [];
	#m_currentIndex = -1;

	/** Signal emitted when current changes. */
	readonly currentChanged = new CSignal<[number]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);
	}

	/** Adds item. */
	addItem(widget: CWidget, text: string): number
	{
		return this.insertItem(this.#m_items.length, widget, text);
	}

	/** Inserts item. */
	insertItem(index: number, widget: CWidget, text: string): number
	{
		const existingIndex = this.indexOf(widget);

		/** Provides if behavior. */
		if (existingIndex !== -1)
			return existingIndex;

		index = Math.max(0, Math.min(index, this.#m_items.length));

		const button = new CToolBoxButton(this);
		button.setText(text);

		widget.setParent(this);
		widget.hide();

		const item: CToolBoxItem = {
			widget,
			button
		};

		this.#m_items.splice(index, 0, item);

		button.clicked.connect(() => {
			const buttonIndex = this.#indexOfButton(button);

			/** Provides if behavior. */
			if (buttonIndex !== -1) {
				this.setCurrentIndex(buttonIndex);
			}
		});

		/** Provides if behavior. */
		if (this.#m_currentIndex === -1) {
			this.#m_currentIndex = index;
			widget.show();
			button.setCurrent(true);
			this.currentChanged.emit(index);
		} else if (index <= this.#m_currentIndex) {
			++this.#m_currentIndex;
		}

		this.#updateGeometry();
		this.update();

		return index;
	}

	/** Removes item. */
	removeItem(index: number): void
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return;

		const wasCurrent = index === this.#m_currentIndex;
		const item = this.#m_items[index]!;

		this.#m_items.splice(index, 1);

		item.button.destroy();
		item.widget.hide();
		item.widget.setParent(null);

		/** Provides if behavior. */
		if (this.#m_items.length === 0) {
			this.#m_currentIndex = -1;

			/** Provides if behavior. */
			if (wasCurrent)
				this.currentChanged.emit(-1);

			this.update();
			return;
		}

		/** Provides if behavior. */
		if (wasCurrent) {
			this.#m_currentIndex = Math.min(
				index,
				this.#m_items.length - 1
			);

			this.#selectCurrentItem();
			this.currentChanged.emit(this.#m_currentIndex);
		} else if (index < this.#m_currentIndex) {
			--this.#m_currentIndex;
		}

		this.#updateGeometry();
		this.update();
	}

	/** Provides count behavior. */
	count(): number
	{
		return this.#m_items.length;
	}

	/** Returns the current index. */
	currentIndex(): number
	{
		return this.#m_currentIndex;
	}

	/** Sets the current index. */
	setCurrentIndex(index: number): void
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return;

		/** Provides if behavior. */
		if (!this.isItemEnabled(index))
			return;

		/** Provides if behavior. */
		if (index === this.#m_currentIndex)
			return;

		/** Provides if behavior. */
		if (this.#m_currentIndex !== -1) {
			const oldItem = this.#m_items[this.#m_currentIndex];

			oldItem?.widget.hide();
			oldItem?.button.setCurrent(false);
		}

		this.#m_currentIndex = index;

		this.#selectCurrentItem();
		this.#updateGeometry();

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

	/** Returns the current widget. */
	currentWidget(): CWidget | null
	{
		/** Provides if behavior. */
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_items[this.#m_currentIndex]?.widget ?? null;
	}

	/** Provides widget behavior. */
	widget(index: number): CWidget | null
	{
		return this.#m_items[index]?.widget ?? null;
	}

	/** Provides index of behavior. */
	indexOf(widget: CWidget): number
	{
		return this.#m_items.findIndex(item => item.widget === widget);
	}

	/** Provides item text behavior. */
	itemText(index: number): string
	{
		return this.#m_items[index]?.button.text() ?? "";
	}

	/** Sets the item text. */
	setItemText(index: number, text: string): void
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined)
			return;

		item.button.setText(text);

		this.#updateGeometry();
		this.update();
	}

	/** Returns whether the item enabled condition is active. */
	isItemEnabled(index: number): boolean
	{
		return this.#m_items[index]?.button.isEnabled() ?? false;
	}

	/** Sets the item enabled. */
	setItemEnabled(index: number, enabled: boolean): void
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined)
			return;

		/** Provides if behavior. */
		if (item.button.isEnabled() === enabled)
			return;

		item.button.setEnabled(enabled);

		/** Provides if behavior. */
		if (!enabled && index === this.#m_currentIndex)
			this.#selectNextEnabledItem(index);

		this.update();
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize
	{
		let width = 0;
		let height = 0;

		/** Provides for behavior. */
		for (const item of this.#m_items) {
			const hint = item.button.sizeHint();

			width = Math.max(width, hint.width());
			height += hint.height();
		}

		const current = this.currentWidget();

		/** Provides if behavior. */
		if (current !== null) {
			const hint = current.sizeHint();

			width = Math.max(width, hint.width());
			height += hint.height();
		}

		return new CSize(width, height);
	}

	/** Sets the geometry. */
	override setGeometry(x: number, y: number, width: number, height: number): void
	{
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

    /** Handles the paint event. */
    protected override paintEvent(_painter: CPainter): void {
        _painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
        _painter.fillRect(this.rect());
    }

	#indexOfButton(button: CToolBoxButton): number
	{
		return this.#m_items.findIndex(item => item.button === button);
	}

	#selectCurrentItem(): void
	{
		/** Provides if behavior. */
		if (this.#m_currentIndex === -1)
			return;

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;

			item.button.setCurrent(i === this.#m_currentIndex);

			/** Provides if behavior. */
			if (i === this.#m_currentIndex)
				item.widget.show();
			else
				item.widget.hide();
		}
	}

	#selectNextEnabledItem(index: number): void
	{
		/** Provides for behavior. */
		for (let i = index + 1; i < this.#m_items.length; ++i) {
			/** Provides if behavior. */
			if (this.isItemEnabled(i)) {
				this.setCurrentIndex(i);
				return;
			}
		}

		/** Provides for behavior. */
		for (let i = index - 1; i >= 0; --i) {
			/** Provides if behavior. */
			if (this.isItemEnabled(i)) {
				this.setCurrentIndex(i);
				return;
			}
		}
	}

	#updateGeometry(): void
	{
		/** Provides if behavior. */
		if (this.#m_items.length === 0)
			return;

		let totalButtonHeight = 0;

		/** Provides for behavior. */
		for (const item of this.#m_items)
			totalButtonHeight += item.button.sizeHint().height();

		const pageHeight = Math.max(
			0,
			this.height() - totalButtonHeight
		);

		let y = 0;

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;
			const buttonHeight = item.button.sizeHint().height();

			item.button.setGeometry(0, y, this.width(), buttonHeight);
            y += buttonHeight;

			/** Provides if behavior. */
			if (i === this.#m_currentIndex) {
				item.widget.setGeometry(0, y, this.width(), pageHeight);
				y += pageHeight;
			}
		}
	}
}