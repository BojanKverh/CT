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

	readonly currentIndexChanged = new CSignal<[number]>();
	readonly currentTextChanged = new CSignal<[string]>();
	readonly activated = new CSignal<[number]>();

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_lineEdit = new CComboLineEdit(this);

		this.#m_popup = new CPopupWidget();
		this.#m_listWidget = new CListWidget(this.#m_popup);

		this.#m_lineEdit.textChanged.connect(text => {
			this.#lineEditTextChanged(text);
		});

		this.#m_listWidget.itemClicked.connect(item => {
			this.#itemActivated(item);
		});

		this.resize(120, 30);
		this.#updateGeometry();
	}

	isEditable(): boolean {
		return this.#m_editable;
	}

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

	lineEdit(): CLineEdit {
		return this.#m_lineEdit;
	}

	addItem(text: string): void {
		this.insertItem(this.#m_items.length, text);
	}

    addItems(items: string[]): void {
        for (const item of items)
			this.addItem(item);
    }

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

	clear(): void {
		if (this.#m_items.length === 0)
			return;

		this.#m_items = [];
		this.#m_listWidget.clear();
		this.#setCurrentIndex(-1);
		this.#updatePopupGeometry();
		this.update();
	}

	count(): number {
		return this.#m_items.length;
	}

	itemText(index: number): string {
		return this.#m_items[index] ?? "";
	}

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

	currentIndex(): number {
		return this.#m_currentIndex;
	}

	setCurrentIndex(index: number): void {
		if (index < -1 || index >= this.#m_items.length)
			return;

		this.#setCurrentIndex(index);
	}

	currentText(): string {
		return this.#m_lineEdit.text();
	}

	setCurrentText(text: string): void {
		if (this.#m_editable) {
			this.#m_lineEdit.setText(text);
			return;
		}

		const index = this.findText(text);

		if (index !== -1)
			this.#setCurrentIndex(index);
	}

	findText(text: string): number {
		return this.#m_items.indexOf(text);
	}

	isDown(): boolean {
		return this.#m_down;
	}

	popup(): CPopupWidget {
		return this.#m_popup;
	}

	listWidget(): CListWidget {
		return this.#m_listWidget;
	}

	showPopup(): void {
		if (this.#m_items.length === 0)
			return;

		this.#updatePopupGeometry();

		if (this.#m_currentIndex !== -1)
			this.#m_listWidget.setCurrentRow(this.#m_currentIndex);

		this.#m_popup.open();
		this.#m_listWidget.setFocus();
	}

	hidePopup(): void {
		this.#m_popup.close();
	}

    isArrowHovered(): boolean
	{
		return this.#m_arrowHovered;
	}

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

		const frameWidth = this.#m_listWidget.frameWidth();
		const height = rows * CListWidget.ItemHeight + 2 * frameWidth;
		let popupWidth = this.width();
		for (const text of this.#m_items) {
			const textWidth = this.fontMetrics().textWidth(text);

			popupWidth = Math.max(popupWidth, Math.ceil(textWidth) +
                2 * CListWidget.HorizontalPadding + 2 * frameWidth);
		}

		const popupPosition = this.mapToCanvas(0, this.height());
		this.#m_popup.setGeometry(popupPosition.x(), popupPosition.y(), popupWidth, height);
		this.#m_listWidget.setGeometry(0, 0, popupWidth, height);
	}
}