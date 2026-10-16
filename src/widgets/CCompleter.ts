import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CListWidget } from "./CListWidget.js";
import type { CListWidgetItem } from "./CListWidgetItem.js";
import type { CLineEdit } from "./CLineEdit.js";
import { CPopupWidget } from "./CPopupWidget.js";

/** Defines whether completion matching distinguishes letter case. */
export enum CCompleterCaseSensitivity {
	CaseInsensitive,
	CaseSensitive
}

/** Provides popup completion for a line editor. */
export class CCompleter extends CObject {
	static readonly MaxVisibleItems = 10;

	readonly activated = new CSignal<[string]>();
	readonly highlighted = new CSignal<[string]>();

	#m_widget: CLineEdit | null = null;
	#m_model: CAbstractItemModel | null = null;
	#m_strings: string[] = [];
	#m_completionColumn = 0;
	#m_caseSensitivity = CCompleterCaseSensitivity.CaseInsensitive;
	#m_completionPrefix = "";
	#m_matches: string[] = [];
	#m_popup = new CPopupWidget();
	#m_listWidget = new CListWidget(this.#m_popup);
	#m_disconnectWidget: (() => void) | null = null;
	#m_disconnectModelSignals: Array<() => void> = [];
	#m_activating = false;

	constructor(
		source: string[] | CAbstractItemModel | null = null,
		parent: CObject | null = null
	) {
		super(parent);

		this.#m_listWidget.itemClicked.connect(item => {
			this.#activateItem(item);
		});
		this.#m_listWidget.currentRowChanged.connect(row => {
			const text = this.#m_matches[row];
			if (text !== undefined)
				this.highlighted.emit(text);
		});

		if (Array.isArray(source))
			this.setStringList(source);
		else
			this.setModel(source);
	}

	widget(): CLineEdit | null {
		return this.#m_widget;
	}

	setWidget(widget: CLineEdit | null): void {
		if (widget === this.#m_widget)
			return;

		this.#m_disconnectWidget?.();
		this.#m_disconnectWidget = null;
		this.hidePopup();
		this.#m_widget = widget;

		if (widget !== null) {
			this.#m_disconnectWidget = widget.textEdited.connect(text => {
				if (!this.#m_activating)
					this.complete(text);
			});
		}
	}

	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	setModel(model: CAbstractItemModel | null): void {
		if (model === this.#m_model && this.#m_strings.length === 0)
			return;

		this.#disconnectModel();
		this.#m_strings = [];
		this.#m_model = model;

		if (model !== null) {
			const refresh = (): void => this.#refresh();
			this.#m_disconnectModelSignals = [
				model.dataChanged.connect(refresh),
				model.modelReset.connect(refresh),
				model.rowsInserted.connect(refresh),
				model.rowsRemoved.connect(refresh),
				model.layoutChanged.connect(refresh)
			];
		}

		this.#refresh();
	}

	stringList(): string[] {
		return [...this.#m_strings];
	}

	setStringList(strings: string[]): void {
		this.#disconnectModel();
		this.#m_model = null;
		this.#m_strings = [...strings];
		this.#refresh();
	}

	completionColumn(): number {
		return this.#m_completionColumn;
	}

	setCompletionColumn(column: number): void {
		if (!Number.isInteger(column) || column < 0
			|| column === this.#m_completionColumn)
			return;

		this.#m_completionColumn = column;
		this.#refresh();
	}

	caseSensitivity(): CCompleterCaseSensitivity {
		return this.#m_caseSensitivity;
	}

	setCaseSensitivity(sensitivity: CCompleterCaseSensitivity): void {
		if (sensitivity === this.#m_caseSensitivity)
			return;

		this.#m_caseSensitivity = sensitivity;
		this.#refresh();
	}

	completionPrefix(): string {
		return this.#m_completionPrefix;
	}

	completionCount(): number {
		return this.#m_matches.length;
	}

	currentCompletion(): string {
		return this.#m_matches[this.#m_listWidget.currentRow()] ?? "";
	}

	popup(): CPopupWidget {
		return this.#m_popup;
	}

	listWidget(): CListWidget {
		return this.#m_listWidget;
	}

	complete(prefix = this.#m_widget?.text() ?? ""): void {
		this.#m_completionPrefix = prefix;
		this.#m_matches = this.#filteredValues(prefix);
		this.#m_listWidget.clear();

		for (const match of this.#m_matches)
			this.#m_listWidget.addItem(match);

		if (this.#m_widget === null || this.#m_widget.isReadOnly()
			|| prefix.length === 0 || this.#m_matches.length === 0) {
			this.hidePopup();
			return;
		}

		this.#updatePopupGeometry();
		this.#m_popup.open(false);
	}

	hidePopup(): void {
		this.#m_popup.close();
	}

	/** Handles completion navigation keys sent by the associated editor. */
	handleKeyEvent(event: CKeyEvent): boolean {
		if (event.key() === "ArrowDown" && !this.#m_popup.isOpen()) {
			this.complete();
			if (!this.#m_popup.isOpen())
				return false;
			event.accept();
			return true;
		}

		if (!this.#m_popup.isOpen())
			return false;

		switch (event.key()) {
		case "ArrowDown":
		case "ArrowUp":
		case "Home":
		case "End":
			this.#m_listWidget.event(event);
			return true;

		case "Enter":
		case "Return":
			this.#activateCurrent();
			event.accept();
			return true;

		case "Escape":
			this.hidePopup();
			event.accept();
			return true;
		}

		return false;
	}

	override destroy(): void {
		this.setWidget(null);
		this.#disconnectModel();
		this.#m_popup.close();
		this.#m_popup.destroy();
		super.destroy();
	}

	#refresh(): void {
		if (this.#m_popup.isOpen())
			this.complete(this.#m_completionPrefix);
	}

	#sourceValues(): string[] {
		if (this.#m_model === null)
			return [...this.#m_strings];

		if (this.#m_completionColumn >= this.#m_model.columnCount())
			return [];

		const values: string[] = [];
		for (let row = 0; row < this.#m_model.rowCount(); ++row) {
			const index = this.#m_model.index(row, this.#m_completionColumn);
			const value = this.#m_model.data(index);
			if (value !== null && value !== undefined)
				values.push(String(value));
		}
		return values;
	}

	#filteredValues(prefix: string): string[] {
		const needle = this.#m_caseSensitivity
			=== CCompleterCaseSensitivity.CaseSensitive
			? prefix
			: prefix.toLocaleLowerCase();

		return this.#sourceValues().filter(value => {
			const candidate = this.#m_caseSensitivity
				=== CCompleterCaseSensitivity.CaseSensitive
				? value
				: value.toLocaleLowerCase();
			return candidate.startsWith(needle);
		});
	}

	#activateCurrent(): void {
		const text = this.currentCompletion();
		if (text.length !== 0)
			this.#activate(text);
	}

	#activateItem(item: CListWidgetItem): void {
		const row = this.#m_listWidget.row(item);
		const text = this.#m_matches[row];
		if (text !== undefined)
			this.#activate(text);
	}

	#activate(text: string): void {
		const widget = this.#m_widget;
		if (widget === null)
			return;

		this.#m_activating = true;
		widget.setText(text);
		this.#m_activating = false;
		this.hidePopup();
		widget.setFocus();
		this.activated.emit(text);
	}

	#updatePopupGeometry(): void {
		const widget = this.#m_widget;
		if (widget === null)
			return;

		const rows = Math.min(
			this.#m_matches.length, CCompleter.MaxVisibleItems
		);
		const listFrameWidth = this.#m_listWidget.frameWidth();
		const popupFrameWidth = this.#m_popup.frameWidth();
		const listHeight = rows * CListWidget.ItemHeight
			+ 2 * listFrameWidth;
		const popupHeight = listHeight + 2 * popupFrameWidth;
		const scrollBarWidth = this.#m_matches.length > rows
			? CListWidget.ScrollBarExtent
			: 0;
		let popupWidth = widget.width();

		for (const text of this.#m_matches) {
			popupWidth = Math.max(
				popupWidth,
				Math.ceil(widget.fontMetrics().textWidth(text))
					+ 2 * CListWidget.HorizontalPadding
					+ 2 * listFrameWidth + 2 * popupFrameWidth
					+ scrollBarWidth
			);
		}

		const position = widget.mapToCanvas(0, widget.height());
		this.#m_popup.setGeometry(
			position.x(), position.y(), popupWidth, popupHeight
		);
		this.#m_listWidget.setGeometry(
			popupFrameWidth,
			popupFrameWidth,
			popupWidth - 2 * popupFrameWidth,
			listHeight
		);
	}

	#disconnectModel(): void {
		for (const disconnect of this.#m_disconnectModelSignals)
			disconnect();
		this.#m_disconnectModelSignals = [];
	}
}
