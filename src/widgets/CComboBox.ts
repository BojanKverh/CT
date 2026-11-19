/** @module Widgets/CComboBox */
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

	protected override mousePressEvent(event: CMouseEvent): void {
		if (!this.#m_comboBox.isEditable()) {
			event.ignore();
			return;
		}

		super.mousePressEvent(event);
	}

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

/** Drop-down choice control with optional editable text and completion. */
export class CComboBox extends CWidget {
    /** Maximum number of rows presented before popup scrolling is needed. */
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

    /**
    * Emitted with the zero-based current item index, or -1 when no item is current.
    * @group Signals
    */
    readonly currentIndexChanged = new CSignal<[number]>();
    /**
    * Emitted with the current displayed text when the selected or editable caption changes.
    * @group Signals
    */
    readonly currentTextChanged = new CSignal<[string]>();
    /**
    * Emitted with the zero-based item index accepted through user interaction.
    * @group Signals
    */
    readonly activated = new CSignal<[number]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
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
    * Reports whether users can type into the embedded line editor.
    */
    isEditable(): boolean {
		return this.#m_editable;
	}

    /**
    * Changes between choice-only and editable presentation.
    */
    setEditable(editable: boolean): void {
		if (this.#m_editable === editable)
			return;

		this.#m_editable = editable;

		if (!editable) {
			if (this.#m_currentIndex === -1) {
				const index = this.findText(this.#m_lineEdit.text());

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
    * Returns the embedded input for editor-specific configuration.
    */
    lineEdit(): CLineEdit {
		return this.#m_lineEdit;
	}

    /**
    * Appends a text choice to the popup list.
    */
    addItem(text: string): void {
		this.insertItem(this.#m_items.length, text);
	}

    /**
    * Appends text choices in array order.
    */
    addItems(items: string[]): void {
        for (const item of items)
			this.addItem(item);
    }

    /**
    * Inserts a text choice at the requested position.
    */
    insertItem(index: number, text: string): void {
		index = Math.max(0, Math.min(index, this.#m_items.length));

		const currentIndex = this.#m_currentIndex;

		this.#m_items.splice(index, 0, text);
		this.#m_listWidget.insertItem(index, text);

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
    * Removes a choice and adjusts the current selection.
    */
    removeItem(index: number): void {
		if (index < 0 || index >= this.#m_items.length)
			return;

		const currentIndex = this.#m_currentIndex;

		this.#m_items.splice(index, 1);
		this.#m_listWidget.takeItem(index);

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

    /**
    * Removes every choice and resets the current selection.
    */
    clear(): void {
		if (this.#m_items.length === 0)
			return;

		this.#m_items = [];
		this.#m_listWidget.clear();
		this.#setCurrentIndex(-1);
		this.#updatePopupGeometry();
		this.update();
	}

    /**
    * Returns the number of popup choices.
    */
    count(): number {
		return this.#m_items.length;
	}

    /**
    * Returns a choice's caption, or an empty string for an invalid position.
    */
    itemText(index: number): string {
		return this.#m_items[index] ?? "";
	}

    /**
    * Changes the caption of an existing choice.
    */
    setItemText(index: number, text: string): void {
		if (index < 0 || index >= this.#m_items.length)
			return;

		if (this.#m_items[index] === text)
			return;

		const oldText = this.currentText();

		this.#m_items[index] = text;

		const item = this.#m_listWidget.item(index);

		if (item !== null)
			item.setText(text);

		if (index === this.#m_currentIndex)
			this.#syncLineEditText(text);

		if (oldText !== this.currentText())
			this.currentTextChanged.emit(this.currentText());

        this.#updatePopupGeometry();
		this.#m_listWidget.update();
		this.update();
	}

    /**
    * Zero-based current item index.
    * The initial value is `-1`.
    */
    currentIndex(): number {
		return this.#m_currentIndex;
	}

    /**
    * Changes the selected choice and synchronizes the displayed text.
    */
    setCurrentIndex(index: number): void {
		if (index < -1 || index >= this.#m_items.length)
			return;

		this.#setCurrentIndex(index);
	}

    /**
    * Returns the current text, including editable input when enabled.
    */
    currentText(): string {
		return this.#m_lineEdit.text();
	}

    /**
    * Updates the current text according to editable mode and available choices.
    */
    setCurrentText(text: string): void {
		if (this.#m_editable) {
			this.#m_lineEdit.setText(text);
			return;
		}

		const index = this.findText(text);

		if (index !== -1)
			this.#setCurrentIndex(index);
	}

    /**
    * Returns the matching choice position, or -1 when absent.
    */
    findText(text: string): number {
		return this.#m_items.indexOf(text);
	}

    /**
    * Reports the transient pressed state of the popup control.
    */
    isDown(): boolean {
		return this.#m_down;
	}

    /**
    * Returns the managed popup container used to display choices.
    */
    popup(): CPopupWidget {
		return this.#m_popup;
	}

    /**
    * Returns the list displaying popup choices.
    */
    listWidget(): CListWidget {
		return this.#m_listWidget;
	}

    /**
    * Opens the popup choice list.
    */
    showPopup(): void {
		if (this.#m_items.length === 0)
			return;

		this.#updatePopupGeometry();

		if (this.#m_currentIndex !== -1)
			this.#m_listWidget.setCurrentRow(this.#m_currentIndex);

		this.#m_popup.open();
		this.#m_listWidget.setFocus();
	}

    /**
    * Closes the popup choice list.
    */
    hidePopup(): void {
		this.#m_popup.close();
	}

    /**
    * Reports hover feedback for the drop-down arrow region.
    */
    isArrowHovered(): boolean
	{
		return this.#m_arrowHovered;
	}

    /**
    * @internal Routes keyboard navigation from the embedded line editor.
    */
    handleComboKey(event: CKeyEvent): void
	{
		if (event.key() === "ArrowDown") {
			if (this.#m_popup.isOpen()) {
				this.#m_listWidget.event(event);
				return;
			}

			if (this.#m_currentIndex < this.#m_items.length - 1)
				this.#setCurrentIndex(this.#m_currentIndex + 1);

			event.accept();
			return;
		}

		if (event.key() === "ArrowUp") {
			if (this.#m_popup.isOpen()) {
				this.#m_listWidget.event(event);
				return;
			}

			if (this.#m_currentIndex > 0)
				this.#setCurrentIndex(this.#m_currentIndex - 1);

			event.accept();
			return;
		}

		if (event.key() === "Escape") {
			this.hidePopup();
			event.accept();
		}
	}

    /**
    * @internal Commits the active popup item.
    */
    activatePopupItem(): void
	{
		const item = this.#m_listWidget.currentItem();

		if (item === null)
			return;

		this.#itemActivated(item);
	}

	override setGeometry(
		x: number, y: number, width: number, height: number
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateGeometry();
	}

	override sizeHint(): CSize {
		return new CSize(120, 30);
	}

    /** Releases resources owned by the widget. */
    override destroy(): void {
		this.#m_popup.close();
		this.#m_popup.destroy();

		super.destroy();
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

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

	protected override mouseReleaseEvent(event: CMouseEvent): void {
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

		if (!wasDown || !insideArrow) {
            this.#m_arrowHovered = false;
            this.update();
			return;
        }

		this.update();
        if (this.#m_popup.isOpen())
			this.hidePopup();
		else
			this.showPopup();        
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		const hovered = event.x() >= this.width() - this.style().comboBoxArrowWidth();

		if (hovered !== this.#m_arrowHovered) {
			this.#m_arrowHovered = hovered;
			this.update();
		}

		event.accept();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void
	{
		if (this.#m_arrowHovered) {
			this.#m_arrowHovered = false;
			this.update();
		}

		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void
	{
		switch (event.key()) {
			case "ArrowDown":
			case "ArrowUp":
			case "Escape":
				this.handleComboKey(event);
				break;

			case "Enter":
			case " ":
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

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionComboBox();
		option.initFromComboBox(this);

		this.style().drawComboBox(painter, option);
	}

	#setCurrentIndex(index: number): void {
		if (index === this.#m_currentIndex)
			return;

		const oldText = this.currentText();

		this.#m_currentIndex = index;
		this.#m_listWidget.setCurrentRow(index);

		const text = index === -1 ? "" : this.#m_items[index]!;

		this.#syncLineEditText(text);

		this.currentIndexChanged.emit(index);

		if (oldText !== text)
			this.currentTextChanged.emit(text);

		this.update();
	}

	#syncLineEditText(text: string): void {
		if (this.#m_lineEdit.text() === text)
			return;

		this.#m_syncingText = true;
		this.#m_lineEdit.setText(text);
		this.#m_syncingText = false;
	}

	#lineEditTextChanged(text: string): void {
		if (this.#m_syncingText)
			return;

		if (!this.#m_editable)
			return;

		const index = this.findText(text);

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

		if (index === -1)
			return;

		this.#setCurrentIndex(index);
		this.hidePopup();
		this.activated.emit(index);

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
