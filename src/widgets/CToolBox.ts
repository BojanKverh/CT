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

export class CToolBox extends CWidget
{
	#m_items: CToolBoxItem[] = [];
	#m_currentIndex = -1;

	readonly currentChanged = new CSignal<[number]>();

	constructor(parent: CWidget | null = null)
	{
		super(parent);
	}

	addItem(widget: CWidget, text: string): number
	{
		return this.insertItem(this.#m_items.length, widget, text);
	}

	insertItem(index: number, widget: CWidget, text: string): number
	{
		const existingIndex = this.indexOf(widget);

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

			if (buttonIndex !== -1)
				this.setCurrentIndex(buttonIndex);
		});

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

	removeItem(index: number): void
	{
		if (index < 0 || index >= this.#m_items.length)
			return;

		const wasCurrent = index === this.#m_currentIndex;
		const item = this.#m_items[index]!;

		this.#m_items.splice(index, 1);

		item.button.destroy();
		item.widget.hide();
		item.widget.setParent(null);

		if (this.#m_items.length === 0) {
			this.#m_currentIndex = -1;

			if (wasCurrent)
				this.currentChanged.emit(-1);

			this.update();
			return;
		}

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

	count(): number
	{
		return this.#m_items.length;
	}

	currentIndex(): number
	{
		return this.#m_currentIndex;
	}

	setCurrentIndex(index: number): void
	{
		if (index < 0 || index >= this.#m_items.length)
			return;

		if (!this.isItemEnabled(index))
			return;

		if (index === this.#m_currentIndex)
			return;

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

	setCurrentWidget(widget: CWidget): void
	{
		const index = this.indexOf(widget);

		if (index !== -1)
			this.setCurrentIndex(index);
	}

	currentWidget(): CWidget | null
	{
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_items[this.#m_currentIndex]?.widget ?? null;
	}

	widget(index: number): CWidget | null
	{
		return this.#m_items[index]?.widget ?? null;
	}

	indexOf(widget: CWidget): number
	{
		return this.#m_items.findIndex(item => item.widget === widget);
	}

	itemText(index: number): string
	{
		return this.#m_items[index]?.button.text() ?? "";
	}

	setItemText(index: number, text: string): void
	{
		const item = this.#m_items[index];

		if (item === undefined)
			return;

		item.button.setText(text);

		this.#updateGeometry();
		this.update();
	}

	isItemEnabled(index: number): boolean
	{
		return this.#m_items[index]?.button.isEnabled() ?? false;
	}

	setItemEnabled(index: number, enabled: boolean): void
	{
		const item = this.#m_items[index];

		if (item === undefined)
			return;

		if (item.button.isEnabled() === enabled)
			return;

		item.button.setEnabled(enabled);

		if (!enabled && index === this.#m_currentIndex)
			this.#selectNextEnabledItem(index);

		this.update();
	}

	override sizeHint(): CSize
	{
		let width = 0;
		let height = 0;

		for (const item of this.#m_items) {
			const hint = item.button.sizeHint();

			width = Math.max(width, hint.width());
			height += hint.height();
		}

		const current = this.currentWidget();

		if (current !== null) {
			const hint = current.sizeHint();

			width = Math.max(width, hint.width());
			height += hint.height();
		}

		return new CSize(width, height);
	}

	override setGeometry(x: number, y: number, width: number, height: number): void
	{
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

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
		if (this.#m_currentIndex === -1)
			return;

		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;

			item.button.setCurrent(i === this.#m_currentIndex);

			if (i === this.#m_currentIndex)
				item.widget.show();
			else
				item.widget.hide();
		}
	}

	#selectNextEnabledItem(index: number): void
	{
		for (let i = index + 1; i < this.#m_items.length; ++i) {
			if (this.isItemEnabled(i)) {
				this.setCurrentIndex(i);
				return;
			}
		}

		for (let i = index - 1; i >= 0; --i) {
			if (this.isItemEnabled(i)) {
				this.setCurrentIndex(i);
				return;
			}
		}
	}

	#updateGeometry(): void
	{
		if (this.#m_items.length === 0)
			return;

		let totalButtonHeight = 0;

		for (const item of this.#m_items)
			totalButtonHeight += item.button.sizeHint().height();

		const pageHeight = Math.max(
			0,
			this.height() - totalButtonHeight
		);

		let y = 0;

		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;
			const buttonHeight = item.button.sizeHint().height();

			item.button.setGeometry(0, y, this.width(), buttonHeight);
            y += buttonHeight;

			if (i === this.#m_currentIndex) {
				item.widget.setGeometry(0, y, this.width(), pageHeight);
				y += pageHeight;
			}
		}
	}
}