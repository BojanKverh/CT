import type { CKeyEvent } from "../events/CKeyEvent.js";
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

	/**
	 * Appends a page with a header, or returns the existing position if the widget is registered.
	 * @param widget Widget to show as a page.
	 * @param text Caption shown on the page header.
	 * @returns Zero-based page index.
	 */
	addItem(widget: CWidget, text: string): number
	{
		return this.insertItem(this.#m_items.length, widget, text);
	}

	/**
	 * Inserts a page and creates its header button. An already registered page keeps its existing position.
	 * @param index Zero-based insertion index, clamped to the page range.
	 * @param widget Widget to show as a page.
	 * @param text Caption shown on the page header.
	 * @returns Inserted index, or existing index when already registered.
	 */
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

	/**
	 * Removes item.
	 * @param index Zero-based item index.
	 */
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

	/**
	 * Counts the entries in the tool box.
	 * @returns The number of entries in the items.
	 */
	count(): number
	{
		return this.#m_items.length;
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
	 * Sets the current index.
	 * @param index Zero-based item index.
	 */
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

	/**
	 * Selects the page corresponding to a registered widget. An unknown widget is ignored.
	 * @param widget Page widget to select.
	 */
	setCurrentWidget(widget: CWidget): void
	{
		const index = this.indexOf(widget);

		/** Provides if behavior. */
		if (index !== -1)
			this.setCurrentIndex(index);
	}

	/**
	 * Looks up the page currently presented by the toolbox.
	 * @returns Active page widget, or `null` if there is no current page.
	 */
	currentWidget(): CWidget | null
	{
		/** Provides if behavior. */
		if (this.#m_currentIndex === -1)
			return null;

		return this.#m_items[this.#m_currentIndex]?.widget ?? null;
	}

	/**
	 * Looks up the page at a given position.
	 * @param index Zero-based page index.
	 * @returns Page widget, or `null` if absent.
	 */
	widget(index: number): CWidget | null
	{
		return this.#m_items[index]?.widget ?? null;
	}

	/**
	 * Finds a widget among the toolbox pages.
	 * @param widget Page widget to look up by identity.
	 * @returns Zero-based page index, or `-1` if absent.
	 */
	indexOf(widget: CWidget): number
	{
		return this.#m_items.findIndex(item => item.widget === widget);
	}

	/**
	 * Reads a page's header caption.
	 * @param index Zero-based page index.
	 * @returns Header text, or an empty string if the page is absent.
	 */
	itemText(index: number): string
	{
		return this.#m_items[index]?.button.text() ?? "";
	}

	/**
	 * Updates the page header caption and recalculates geometry.
	 * @param index Zero-based page index.
	 * @param text New header caption.
	 */
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

	/**
	 * Checks whether the tool box is item enabled.
	 * @param index Zero-based item index.
	 * @returns `true` if the tool box is item enabled, otherwise `false`.
	 */
	isItemEnabled(index: number): boolean
	{
		return this.#m_items[index]?.button.isEnabled() ?? false;
	}

	/**
	 * Sets the item enabled.
	 * @param index Zero-based item index.
	 * @param enabled Whether to enable the feature.
	 */
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

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
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

	/**
	 * Sets the geometry.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override setGeometry(x: number, y: number, width: number, height: number): void
	{
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

    /**
     * Draws the tool box through the supplied painter.
     * @param _painter Painter for the current drawing operation.
     */
    protected override paintEvent(_painter: CPainter): void {
        _painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
        _painter.fillRect(this.rect());
    }

    /**
     * Responds to a key press for the tool box. May accept the event.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        const key = event.key();
        if ((key === "ArrowUp" || key === "ArrowDown")
            && !event.ctrl() && !event.alt() && !event.meta() && !event.shift()) {
            const current = this.#m_items.findIndex(item => item.button.hasFocus());
            if (current >= 0) {
                const step = key === "ArrowDown" ? 1 : -1;
                for (let index = current + step; index >= 0 && index < this.#m_items.length; index += step) {
                    const button = this.#m_items[index]!.button;
                    if (!button.canReceiveFocus()) continue;
                    button.setFocus();
                    break;
                }
                event.accept();
                return;
            }
        }
        super.keyPressEvent(event);
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