import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton } from "../events/CMouseEvent.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CLineEdit } from "./CLineEdit.js";
import { CListWidget } from "./CListWidget.js";
import { CListWidgetItem } from "./CListWidgetItem.js";
import { CPopupWidget } from "./CPopupWidget.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionComboBox } from "../gui/CStyleOptionComboBox.js";

class CComboLineEdit extends CLineEdit {
	#m_comboBox: CComboBox;

	constructor(comboBox: CComboBox) {
		super(comboBox);

		this.#m_comboBox = comboBox;
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/**
	 * Responds to a pointer button press for the combo line edit. May mark the event ignored.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		if (!this.#m_comboBox.isEditable()) {
			event.ignore();
			return;
		}

		super.mousePressEvent(event);
	}

	/**
	 * Responds to a key press for the combo line edit. May accept or ignore the event depending on the input.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void
	{
		switch (event.key()) {
			case "ArrowDown":
			case "ArrowUp":
			case "Escape":
				this.#m_comboBox.handleComboKey(event);
				return;

			case "Enter":
				if (this.#m_comboBox.popup().isOpen()) {
					this.#m_comboBox.activatePopupItem();
					event.accept();
					return;
				}
				break;
		}

		if (!this.#m_comboBox.isEditable()) {
			event.ignore();
			return;
		}

		super.keyPressEvent(event);
	}
}

/** Implements the combo box widget. */
export class CComboBox extends CWidget {
	static readonly MaxVisibleItems = 10;

	#m_items: string[] = [];
	#m_currentIndex = -1;
	#m_editable = false;
	#m_down = false;

	#m_lineEdit: CComboLineEdit;
	#m_popup: CPopupWidget;
	#m_listWidget: CListWidget;

	#m_syncingText = false;
    #m_arrowHovered = false;

	/** Signal emitted when current index changes. */
	readonly currentIndexChanged = new CSignal<[number]>();
	/** Signal emitted when current text changes. */
	readonly currentTextChanged = new CSignal<[string]>();
	/** Public activated member. */
	readonly activated = new CSignal<[number]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_lineEdit = new CComboLineEdit(this);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.setFocusProxy(this.#m_lineEdit);

		this.#m_popup = new CPopupWidget();
		this.#m_listWidget = new CListWidget(this.#m_popup);
        this.#m_listWidget.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.#m_listWidget.setFocusProxy(this.#m_listWidget.widget());

		this.#m_lineEdit.textChanged.connect(text => {
			this.#lineEditTextChanged(text);
		});

		this.#m_listWidget.itemClicked.connect(item => {
			this.#itemActivated(item);
		});

		this.resize(120, 30);
		this.#updateGeometry();
	}

	/**
	 * Checks whether the combo box is editable.
	 * @returns `true` if the combo box is editable, otherwise `false`.
	 */
	isEditable(): boolean {
		return this.#m_editable;
	}

	/**
	 * Sets the editable.
	 * @param editable Editable flag.
	 */
	setEditable(editable: boolean): void {
		/** Provides if behavior. */
		if (this.#m_editable === editable)
			return;

		this.#m_editable = editable;

		/** Provides if behavior. */
		if (!editable) {
			/** Provides if behavior. */
			if (this.#m_currentIndex === -1) {
				const index = this.findText(this.#m_lineEdit.text());

				/** Provides if behavior. */
				if (index !== -1)
					this.#setCurrentIndex(index);
				else
					this.#syncLineEditText("");
			} else {
				this.#syncLineEditText(
					this.#m_items[this.#m_currentIndex] ?? ""
				);
			}
		}

		this.update();
	}

	/**
	 * Reads the line edit.
	 * @returns The line edit.
	 */
	lineEdit(): CLineEdit {
		return this.#m_lineEdit;
	}

	/**
	 * Appends a choice, selecting it immediately if it is the first choice.
	 * @param text Display text for the new choice.
	 */
	addItem(text: string): void {
		this.insertItem(this.#m_items.length, text);
	}

    /**
     * Adds items.
     * @param items Items.
     */
    addItems(items: string[]): void {
        /** Provides for behavior. */
        for (const item of items)
			this.addItem(item);
    }

	/**
	 * Inserts a choice and preserves the current item when one already exists.
	 * @param index Insertion index, clamped from zero through the item count.
	 * @param text Display text for the new choice.
	 */
	insertItem(index: number, text: string): void {
		index = Math.max(0, Math.min(index, this.#m_items.length));

		const currentIndex = this.#m_currentIndex;

		this.#m_items.splice(index, 0, text);
		this.#m_listWidget.insertItem(index, text);

		/** Provides if behavior. */
		if (currentIndex === -1) {
			this.#setCurrentIndex(0);
		} else if (index <= currentIndex) {
			this.#m_currentIndex = currentIndex + 1;
			this.currentIndexChanged.emit(this.#m_currentIndex);
		}

		this.#updatePopupGeometry();
		this.update();
	}

	/**
	 * Removes item.
	 * @param index Zero-based item index.
	 */
	removeItem(index: number): void {
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return;

		const currentIndex = this.#m_currentIndex;

		this.#m_items.splice(index, 1);
		this.#m_listWidget.takeItem(index);

		/** Provides if behavior. */
		if (this.#m_items.length === 0) {
			this.#setCurrentIndex(-1);
		} else if (index === currentIndex) {
			this.#m_currentIndex = -1;
            this.#setCurrentIndex(Math.min(index, this.#m_items.length - 1));
		} else if (index < currentIndex) {
			this.#m_currentIndex = currentIndex - 1;
			this.currentIndexChanged.emit(this.#m_currentIndex);
		}

		this.#updatePopupGeometry();
		this.update();
	}

	/** Clears the current contents. */
	clear(): void {
		/** Provides if behavior. */
		if (this.#m_items.length === 0)
			return;

		this.#m_items = [];
		this.#m_listWidget.clear();
		this.#setCurrentIndex(-1);
		this.#updatePopupGeometry();
		this.update();
	}

	/**
	 * Counts the entries in the combo box.
	 * @returns The number of entries in the items.
	 */
	count(): number {
		return this.#m_items.length;
	}

	/**
	 * Looks up the display text for a choice.
	 * @param index Zero-based choice index.
	 * @returns Display text, or an empty string for an absent choice.
	 */
	itemText(index: number): string {
		return this.#m_items[index] ?? "";
	}

	/**
	 * Changes a choice caption and updates the popup. Emits `currentTextChanged` if the displayed current text changes.
	 * @param index Zero-based choice index.
	 * @param text New display text.
	 */
	setItemText(index: number, text: string): void {
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return;

		/** Provides if behavior. */
		if (this.#m_items[index] === text)
			return;

		const oldText = this.currentText();

		this.#m_items[index] = text;

		const item = this.#m_listWidget.item(index);

		/** Provides if behavior. */
		if (item !== null)
			item.setText(text);

		/** Provides if behavior. */
		if (index === this.#m_currentIndex)
			this.#syncLineEditText(text);

		/** Provides if behavior. */
		if (oldText !== this.currentText())
			this.currentTextChanged.emit(this.currentText());

        this.#updatePopupGeometry();
		this.#m_listWidget.update();
		this.update();
	}

	/**
	 * Returns the current index.
	 * @returns The current index.
	 */
	currentIndex(): number {
		return this.#m_currentIndex;
	}

	/**
	 * Sets the current index.
	 * @param index Zero-based item index.
	 */
	setCurrentIndex(index: number): void {
		/** Provides if behavior. */
		if (index < -1 || index >= this.#m_items.length)
			return;

		this.#setCurrentIndex(index);
	}

	/**
	 * Returns the current text.
	 * @returns The current text.
	 */
	currentText(): string {
		return this.#m_lineEdit.text();
	}

	/**
	 * Sets the editor text in editable mode. Otherwise selects the first exact matching choice if one exists.
	 * @param text Text to show or match.
	 */
	setCurrentText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_editable) {
			this.#m_lineEdit.setText(text);
			return;
		}

		const index = this.findText(text);

		/** Provides if behavior. */
		if (index !== -1)
			this.#setCurrentIndex(index);
	}

	/**
	 * Finds the first choice with exactly matching text.
	 * @param text Text to compare with choice captions.
	 * @returns Zero-based matching index, or `-1` if none matches.
	 */
	findText(text: string): number {
		return this.#m_items.indexOf(text);
	}

	/**
	 * Checks whether the combo box is down.
	 * @returns `true` if the combo box is down, otherwise `false`.
	 */
	isDown(): boolean {
		return this.#m_down;
	}

	/**
	 * Reads the popup.
	 * @returns The popup.
	 */
	popup(): CPopupWidget {
		return this.#m_popup;
	}

	/**
	 * Reads the list widget.
	 * @returns The list widget.
	 */
	listWidget(): CListWidget {
		return this.#m_listWidget;
	}

	/** Shows popup. */
	showPopup(): void {
		/** Provides if behavior. */
		if (this.#m_items.length === 0)
			return;

		this.#updatePopupGeometry();

		/** Provides if behavior. */
		if (this.#m_currentIndex !== -1)
			this.#m_listWidget.setCurrentRow(this.#m_currentIndex);

		this.#m_popup.open();
		this.#m_listWidget.setFocus();
	}

	/** Hides popup. */
	hidePopup(): void {
		this.#m_popup.close();
	}

    /**
     * Checks whether the combo box is arrow hovered.
     * @returns `true` if the combo box is arrow hovered, otherwise `false`.
     */
    isArrowHovered(): boolean
	{
		return this.#m_arrowHovered;
	}

	/**
	 * Routes vertical arrow keys to the open choice list or changes the current selection when the list is closed. Escape closes the popup.
	 * @param event Keyboard event to route.
	 */
	handleComboKey(event: CKeyEvent): void
	{
		/** Provides if behavior. */
		if (event.key() === "ArrowDown") {
			/** Provides if behavior. */
			if (this.#m_popup.isOpen()) {
				this.#m_listWidget.event(event);
				return;
			}

			/** Provides if behavior. */
			if (this.#m_currentIndex < this.#m_items.length - 1)
				this.#setCurrentIndex(this.#m_currentIndex + 1);

			event.accept();
			return;
		}

		/** Provides if behavior. */
		if (event.key() === "ArrowUp") {
			/** Provides if behavior. */
			if (this.#m_popup.isOpen()) {
				this.#m_listWidget.event(event);
				return;
			}

			/** Provides if behavior. */
			if (this.#m_currentIndex > 0)
				this.#setCurrentIndex(this.#m_currentIndex - 1);

			event.accept();
			return;
		}

		/** Provides if behavior. */
		if (event.key() === "Escape") {
			this.hidePopup();
			event.accept();
		}
	}

	/**
	 * Activates the popup item.
	 */
	activatePopupItem(): void
	{
		const item = this.#m_listWidget.currentItem();

		/** Provides if behavior. */
		if (item === null)
			return;

		this.#itemActivated(item);
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
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateGeometry();
	}

	/**
	 * Resizes the width.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateGeometry();
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize {
		return new CSize(120, 30);
	}

	/** Releases resources owned by the widget. */
	override destroy(): void {
		this.#m_popup.close();
		this.#m_popup.destroy();

		super.destroy();
	}

	/**
	 * Responds to a pointer button press for the combo box. May update the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (
			this.#m_editable &&
			event.x() < this.width() - this.style().comboBoxArrowWidth()
		) {
			event.ignore();
			return;
		}

		this.#m_down = true;

		event.accept();
		this.update();
	}

	/**
	 * Responds to a pointer button release for the combo box. May update the down, the arrow hovered. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		const insideArrow =
			event.x() >= this.width() - this.style().comboBoxArrowWidth() &&
			event.x() < this.width() &&
			event.y() >= 0 &&
			event.y() < this.height();

		/** Provides if behavior. */
		if (!wasDown || !insideArrow) {
            this.#m_arrowHovered = false;
            this.update();
			return;
        }

		this.update();
        /** Provides if behavior. */
        if (this.#m_popup.isOpen())
			this.hidePopup();
		else
			this.showPopup();        
	}

	/**
	 * Responds to pointer movement for the combo box. May update the arrow hovered. May request a repaint and accept the event.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		const hovered = event.x() >= this.width() - this.style().comboBoxArrowWidth();

		/** Provides if behavior. */
		if (hovered !== this.#m_arrowHovered) {
			this.#m_arrowHovered = hovered;
			this.update();
		}

		event.accept();
	}

	/**
	 * Responds to pointer exit for the combo box. May update the arrow hovered. May request a repaint and accept the event.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (this.#m_arrowHovered) {
			this.#m_arrowHovered = false;
			this.update();
		}

		event.accept();
	}

	/**
	 * Responds to a key press for the combo box. May accept or ignore the event depending on the input.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void
	{
		/** Provides switch behavior. */
		switch (event.key()) {
			case "ArrowDown":
			case "ArrowUp":
			case "Escape":
				this.handleComboKey(event);
				break;

			case "Enter":
			case " ":
				/** Provides if behavior. */
				if (this.#m_popup.isOpen())
					this.activatePopupItem();
				else
					this.showPopup();

				event.accept();
				break;

			default:
				event.ignore();
				break;
		}
	}

	/**
	 * Draws the combo box through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionComboBox();
		option.initFromComboBox(this);

		this.style().drawComboBox(painter, option);
	}

	#setCurrentIndex(index: number): void {
		/** Provides if behavior. */
		if (index === this.#m_currentIndex)
			return;

		const oldText = this.currentText();

		this.#m_currentIndex = index;
		this.#m_listWidget.setCurrentRow(index);

		const text = index === -1 ? "" : this.#m_items[index]!;

		this.#syncLineEditText(text);

		this.currentIndexChanged.emit(index);

		/** Provides if behavior. */
		if (oldText !== text)
			this.currentTextChanged.emit(text);

		this.update();
	}

	#syncLineEditText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_lineEdit.text() === text)
			return;

		this.#m_syncingText = true;
		this.#m_lineEdit.setText(text);
		this.#m_syncingText = false;
	}

	#lineEditTextChanged(text: string): void {
		/** Provides if behavior. */
		if (this.#m_syncingText)
			return;

		/** Provides if behavior. */
		if (!this.#m_editable)
			return;

		const index = this.findText(text);

		/** Provides if behavior. */
		if (index !== this.#m_currentIndex) {
			this.#m_currentIndex = index;
			this.#m_listWidget.setCurrentRow(index);
			this.currentIndexChanged.emit(index);
		}

		this.currentTextChanged.emit(text);
		this.update();
	}

	#itemActivated(item: CListWidgetItem): void {
		const index = this.#m_listWidget.row(item);

		/** Provides if behavior. */
		if (index === -1)
			return;

		this.#setCurrentIndex(index);
		this.hidePopup();
		this.activated.emit(index);

		/** Provides if behavior. */
		if (this.#m_editable)
			this.#m_lineEdit.setFocus();
		else
			this.setFocus();
	}

	#updateGeometry(): void {
		const editWidth = Math.max(0, this.width() - this.style().comboBoxArrowWidth());

		this.#m_lineEdit.setGeometry(
			0, 0, editWidth, this.height()
		);

		this.#updatePopupGeometry();
	}

    #updatePopupGeometry(): void {
		const rows = Math.min(
			this.#m_items.length, CComboBox.MaxVisibleItems
		);

		const listFrameWidth = this.#m_listWidget.frameWidth();
		const popupFrameWidth = this.#m_popup.frameWidth();
		const listHeight = rows * CListWidget.ItemHeight + 2 * listFrameWidth;
		const popupHeight = listHeight + 2 * popupFrameWidth;
		const scrollBarWidth = this.#m_items.length > rows
			? CListWidget.ScrollBarExtent
			: 0;
		let popupWidth = 2 * CListWidget.HorizontalPadding
			+ 2 * listFrameWidth
			+ 2 * popupFrameWidth
			+ scrollBarWidth;
		/** Provides for behavior. */
		for (const text of this.#m_items) {
			const textWidth = this.fontMetrics().textWidth(text);

			popupWidth = Math.max(popupWidth, Math.ceil(textWidth) +
				2 * CListWidget.HorizontalPadding + 2 * listFrameWidth
				+ 2 * popupFrameWidth + scrollBarWidth);
		}

		const popupPosition = this.mapToCanvas(0, this.height());
		this.#m_popup.setGeometry(
			popupPosition.x(), popupPosition.y(), popupWidth, popupHeight
		);
		this.#m_listWidget.setGeometry(
			popupFrameWidth,
			popupFrameWidth,
			popupWidth - 2 * popupFrameWidth,
			listHeight
		);
	}
}
