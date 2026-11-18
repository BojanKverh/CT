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
	#m_completionFilter: ((value: string) => boolean) | null = null;

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

	/**
	 * Reads the widget.
	 * @returns The widget.
	 */
	widget(): CLineEdit | null {
		return this.#m_widget;
	}

	/**
	 * Disconnects the previous editor, closes the popup and connects completion to text edits on the new editor.
	 * @param widget Line editor to attach, or `null` to detach.
	 */
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

	/**
	 * Reads the model.
	 * @returns The model.
	 */
	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	/**
	 * Sets the model. May update the strings, the model, the disconnect model signals.
	 * @param model Model.
	 */
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

	/**
	 * Reads the string list of the completer.
	 * @returns The string list.
	 */
	stringList(): string[] {
		return [...this.#m_strings];
	}

	/**
	 * Sets the string list. May update the model, the strings.
	 * @param strings Strings.
	 */
	setStringList(strings: string[]): void {
		this.#disconnectModel();
		this.#m_model = null;
		this.#m_strings = [...strings];
		this.#refresh();
	}

	/**
	 * Reads the completion column.
	 * @returns The completion column.
	 */
	completionColumn(): number {
		return this.#m_completionColumn;
	}

	/**
	 * Sets the completion column. The implementation checks whether `column` is an integer.
	 * @param column Zero-based column.
	 */
	setCompletionColumn(column: number): void {
		if (!Number.isInteger(column) || column < 0
			|| column === this.#m_completionColumn)
			return;

		this.#m_completionColumn = column;
		this.#refresh();
	}

	/**
	 * Reads the case sensitivity.
	 * @returns The case sensitivity.
	 */
	caseSensitivity(): CCompleterCaseSensitivity {
		return this.#m_caseSensitivity;
	}

	/**
	 * Sets the case sensitivity.
	 * @param sensitivity Sensitivity.
	 */
	setCaseSensitivity(sensitivity: CCompleterCaseSensitivity): void {
		if (sensitivity === this.#m_caseSensitivity)
			return;

		this.#m_caseSensitivity = sensitivity;
		this.#refresh();
	}

	/**
	 * Additional filtering applied to both string and model sources.
	 * @returns The completion filter.
	 */
	completionFilter(): ((value: string) => boolean) | null { return this.#m_completionFilter; }
	/**
	 * Sets the completion filter.
	 * @param filter Filter.
	 */
	setCompletionFilter(filter: ((value: string) => boolean) | null): void {
		this.#m_completionFilter = filter;
		this.#refresh();
	}

	/**
	 * Reads the completion prefix.
	 * @returns The completion prefix.
	 */
	completionPrefix(): string {
		return this.#m_completionPrefix;
	}

	/**
	 * Reads the number of entries in the matches.
	 * @returns The number of entries in the matches.
	 */
	completionCount(): number {
		return this.#m_matches.length;
	}

	/**
	 * Reads the current completion of the completer.
	 * @returns The current completion.
	 */
	currentCompletion(): string {
		return this.#m_matches[this.#m_listWidget.currentRow()] ?? "";
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

	/**
	 * Filters the completion model by prefix, rebuilds the result list and opens or hides the popup based on the target editor and matches.
	 * @param prefix Prefix to match. Defaults to the attached editor's text, or an empty string when detached.
	 */
	complete(prefix = this.#m_widget?.text() ?? ""): void {
		this.#m_completionPrefix = prefix;
		this.#m_matches = this.#filteredValues(prefix);
		this.#m_listWidget.clear();

		for (const match of this.#m_matches)
			this.#m_listWidget.addItem(match);

		if (this.#m_widget === null || this.#m_widget.isReadOnly()
			|| !this.#m_widget.canReceiveFocus()
			|| prefix.length === 0 || this.#m_matches.length === 0) {
			this.hidePopup();
			return;
		}

		this.#updatePopupGeometry();
		this.#m_popup.open(false);
	}

	/** Closes the completion popup. */
	hidePopup(): void {
		this.#m_popup.close();
	}

	/**
	 * Opens completions on Down when closed. While open, routes navigation keys to the list, activates on Enter or Return and dismisses on Escape.
	 * @param event Keyboard event to route to the completion popup.
	 * @returns `true` if the popup opened or handled the key. Returns `false` for other keys or when no popup opened.
	 */
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

	/**
	 * Releases resources held by the completer.
	 */
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
			return candidate.startsWith(needle) && (this.#m_completionFilter?.(value) ?? true);
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
