import { CSignal } from "../core/CSignal.js";
import { CClipboard } from "../core/CClipboard.js";
import { CEventType } from "../events/CEvent.js";
import { CKeyboardModifier, CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractItemModel, type CItemTextEdit } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CHeaderView } from "./CHeaderView.js";
import { CScrollArea } from "./CScrollArea.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemView } from "./CAbstractItemView.js";

/** Reads TSV with quoted fields, doubled quotes and CRLF or LF separators. */
function parseTableText(text: string): string[][] | null {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    let closedQuote = false;
    let endedRow = false;

    for (let i = 0; i < text.length; ++i) {
        const char = text[i]!;
        endedRow = false;
        if (quoted) {
            if (char !== '"') field += char;
            else if (text[i + 1] === '"') {
                field += '"';
                ++i;
            } else {
                quoted = false;
                closedQuote = true;
            }
        } else if (char === "\t" || char === "\r" || char === "\n") {
            row.push(field);
            field = "";
            closedQuote = false;
            if (char !== "\t") {
                if (char === "\r" && text[i + 1] === "\n") ++i;
                rows.push(row);
                row = [];
                endedRow = true;
            }
        } else if (closedQuote) {
            return null;
        } else if (char === '"' && field === "") {
            quoted = true;
        } else {
            field += char;
        }
    }

    if (quoted) return null;
    if (!endedRow) rows.push([...row, field]);
    return rows;
}

class CTableScrollArea extends CScrollArea {
	updateTableScrollBars(): void {
		this.updateScrollBars();
	}
}

class CTableViewContentWidget extends CWidget {
	#m_view: CTableView;

	constructor(view: CTableView, parent: CWidget | null = null) {
		super(parent);
		this.#m_view = view;
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	protected override paintEvent(painter: CPainter): void {
		this.#m_view.paintCells(painter);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		this.#m_view.contentMousePressEvent(event);
	}

	protected override mouseDoubleClickEvent(event: CMouseEvent): void {
		this.#m_view.contentMouseDoubleClickEvent(event);
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		this.#m_view.contentKeyPressEvent(event);
	}
}

/** Controls how many cells the user can select in a table. */
export enum CTableSelectionMode {
    SingleSelection,
    ContiguousSelection,
    ExtendedSelection
}

/** Implements the table view widget. */
export class CTableView extends CAbstractItemView {
	static readonly RowHeight =
		CHeaderView.DefaultSectionHeight;

	static readonly ColumnWidth =
		CHeaderView.DefaultSectionWidth;

	#m_horizontalHeader: CHeaderView;
	#m_verticalHeader: CHeaderView;
	#m_scrollArea: CTableScrollArea;
	#m_contentWidget: CTableViewContentWidget;
	#m_sortingEnabled = false;
	#m_fetchingMore = false;
    #selectionMode = CTableSelectionMode.SingleSelection;
    #selectionAnchor: CModelIndex | null = null;

    selectionMode(): CTableSelectionMode {
        return this.#selectionMode;
    }

    setSelectionMode(mode: CTableSelectionMode): void {
        if (mode === this.#selectionMode) return;
        this.#selectionMode = mode;
        this.#selectionAnchor = null;
        const current = this.currentIndex();
        if (mode === CTableSelectionMode.SingleSelection && current.isValid())
            this.#selectCell(current, false);
    }

    #selectCell(index: CModelIndex, extend: boolean, toggle = false): void {
        const selection = this.selectionModel();
        if (selection === null || !index.isValid()) return;
        const current = this.currentIndex();
        if (extend && this.#selectionMode !== CTableSelectionMode.SingleSelection && current.isValid()) {
            const anchor = this.#selectionAnchor ?? current;
            this.#selectionAnchor = anchor;
            selection.selectRectangle(anchor, index);
        } else if (toggle && this.#selectionMode === CTableSelectionMode.ExtendedSelection) {
            this.#selectionAnchor = index;
            if (selection.isSelected(index)) selection.deselect(index);
            else selection.select(index);
        } else {
            this.#selectionAnchor = index;
            selection.clearSelection();
            selection.select(index);
        }
        this.setCurrentIndex(index);
        this.#m_contentWidget.update();
    }


	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);

		this.#m_horizontalHeader =
			new CHeaderView(COrientation.Horizontal, this);

		this.#m_verticalHeader =
			new CHeaderView(COrientation.Vertical, this);

		this.#m_scrollArea =
			new CTableScrollArea(this);

		this.#m_contentWidget =
			new CTableViewContentWidget(this);

		this.#m_scrollArea.setWidget(this.#m_contentWidget);
		this.#m_scrollArea.verticalScrollBar().setSingleStep(CTableView.RowHeight);

		this.#m_scrollArea.horizontalScrollBar()
			.valueChanged.connect(value => {
				this.#m_horizontalHeader.setOffset(value);
			});

		this.#m_scrollArea.verticalScrollBar()
			.valueChanged.connect(value => {
				this.#m_verticalHeader.setOffset(value);
				void this.#fetchMoreIfNeeded(value);
			});

		this.#updateGeometry();

		this.#m_horizontalHeader.sectionResized.connect(() => {
			this.#updateContentGeometry();
			this.updateEditorGeometry();
			this.#m_contentWidget.update();
		});

		this.#m_horizontalHeader.sectionClicked.connect(section => {
			if (!this.#m_sortingEnabled)
				return;

			const order =
				this.#m_horizontalHeader.sortIndicatorSection() === section
					? this.#oppositeSortOrder(
						this.#m_horizontalHeader.sortIndicatorOrder()
					)
					: CSortOrder.AscendingOrder;

			this.sortByColumn(section, order);
		});
	}

	/**
	 * Returns the item rectangle in content-widget coordinates.
	 */
	visualRect(index: CModelIndex): CRect {
		if (!index.isValid() || index.model() !== this.model())
			return new CRect();

		const column = index.column();

		return new CRect(
			this.#m_horizontalHeader.sectionPosition(column),
			index.row() * CTableView.RowHeight,
			this.#m_horizontalHeader.sectionSize(column),
			CTableView.RowHeight
		);
	}

	/** Provides horizontal header behavior. */
	horizontalHeader(): CHeaderView {
		return this.#m_horizontalHeader;
	}

	/** Provides vertical header behavior. */
	verticalHeader(): CHeaderView {
		return this.#m_verticalHeader;
	}

	/** Returns whether sorting by clicking the header is enabled. */
	isSortingEnabled(): boolean {
		return this.#m_sortingEnabled;
	}

	/** Enables or disables sorting by clicking the horizontal header. */
	setSortingEnabled(enabled: boolean): void {
		if (this.#m_sortingEnabled === enabled)
			return;

		this.#m_sortingEnabled = enabled;
		this.#m_horizontalHeader.setSortIndicatorShown(enabled);
	}

	/** Sorts the model by the requested column and order. */
	sortByColumn(
		column: number,
		order: CSortOrder = CSortOrder.AscendingOrder
	): void {
		const model = this.model();

		if (model === null || column < 0 || column >= model.columnCount())
			return;

		this.#m_horizontalHeader.setSortIndicator(column, order);
		model.sort(column, order);
	}

	/** Provides viewport behavior. */
	viewport(): CWidget {
		return this.#m_scrollArea.viewport();
	}

	/** Provides horizontal scroll bar behavior. */
	horizontalScrollBar(): CScrollBar {
		return this.#m_scrollArea.horizontalScrollBar();
	}

	/** Provides vertical scroll bar behavior. */
	verticalScrollBar(): CScrollBar {
		return this.#m_scrollArea.verticalScrollBar();
	}

	/** Provides scroll x behavior. */
	scrollX(): number {
		return this.#m_scrollArea.scrollX();
	}

	/** Provides scroll y behavior. */
	scrollY(): number {
		return this.#m_scrollArea.scrollY();
	}

	/** Sets the scroll x. */
	setScrollX(x: number): void {
		this.#m_scrollArea.setScrollX(x);
	}

	/** Sets the scroll y. */
	setScrollY(y: number): void {
		this.#m_scrollArea.setScrollY(y);
	}

	/** Provides scroll to behavior. */
	scrollTo(x: number, y: number): void {
		this.#m_scrollArea.scrollTo(x, y);
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(400, 240);
	}

	/** Sets the geometry. */
	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	/** Provides resize behavior. */
	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	/** Provides paint cells behavior. */
	paintCells(painter: CPainter): void {
		const model = this.model();

		/** Provides if behavior. */
		if (model === null)
			return;

		const palette = this.palette();

		const base = palette.color(CPaletteColorRole.Base).toCss();
		const text = palette.color(CPaletteColorRole.Text).toCss();
		const highlight = palette.color(CPaletteColorRole.Highlight).toCss();
		const highlightedText = palette.color(CPaletteColorRole.HighlightedText).toCss();

		painter.setBrush(base);
		painter.setPen(text);
		painter.drawRect(0, 0, this.#m_contentWidget.width(), this.#m_contentWidget.height());

		painter.setFont(this.font());
		painter.setTextBaseline("middle");
        painter.setTextAlign("left");

        const rowHeight = CTableView.RowHeight;
        const scrollY = this.scrollY();
        const viewport = this.viewport();
        const viewportHeight = viewport.height();
        const viewportWidth = viewport.width();
        if (viewportHeight <= 0 || viewportWidth <= 0) return;

        const firstRow = Math.floor(scrollY / rowHeight);
        const endRow = Math.min(model.rowCount(), Math.ceil((scrollY + viewportHeight) / rowHeight));
        const header = this.#m_horizontalHeader;
        const firstColumn = header.sectionAt(this.scrollX() - header.offset());
        if (firstColumn < 0) return;

        const right = this.scrollX() + viewportWidth;
        const columns = model.columnCount();
        let endColumn = firstColumn;
        while (endColumn < columns && header.sectionPosition(endColumn) < right)
            ++endColumn;

        for (let row = firstRow; row < endRow; ++row) {
            for (let column = firstColumn; column < endColumn; ++column) {
				const index = model.index(row, column);
				const x = this.#m_horizontalHeader.sectionPosition(column);
				const width = this.#m_horizontalHeader.sectionSize(column);
				const y = row * CTableView.RowHeight;
				const selected = this.selectionModel()?.isSelected(index) ?? false;

				painter.setBrush(selected ? highlight : base);
				painter.setPen(selected ? highlightedText : text);
				painter.drawRect(x, y, width, CTableView.RowHeight);


				painter.save();
				painter.clipRect(new CRect(x, y, width, CTableView.RowHeight));
				const rect = new CRect(x, y, width, CTableView.RowHeight);
				const delegate = this.itemDelegateForIndex(index);

				if (!delegate.paint(painter, rect, index, this.#m_contentWidget)) {
                    const value = model.data(index);
					const val = value instanceof Date
						? this.#formatDate(value)
						: value === null || value === undefined
							? ""
							: String(value);
					painter.drawText(val, x + 5, y + CTableView.RowHeight / 2);
				}
				painter.restore();
			}
		}
	}

	/** Handles the content mouse press event. */
	contentMousePressEvent(event: CMouseEvent): void {
		const model = this.model();
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (event.type() !== CEventType.MousePress
			|| event.button() !== CMouseButton.LeftButton
			|| model === null
			|| selectionModel === null) {
			event.ignore();
			return;
		}

		this.#m_contentWidget.setFocus();

		const column = this.#m_horizontalHeader.sectionAt(event.pos().x() - this.#m_scrollArea.scrollX());

		const row = Math.floor(
			event.pos().y()
				/ CTableView.RowHeight
		);

		const index =
			model.index(row, column);

		/** Provides if behavior. */
		if (!index.isValid()) {
			event.ignore();
			return;
		}

        const modifiers = event.modifiers();
        const extend = (modifiers & CKeyboardModifier.ShiftModifier) !== 0;
        const toggle = (modifiers & CKeyboardModifier.ControlModifier) !== 0;
        this.#selectCell(index, extend, toggle);
        if (toggle && this.#selectionMode === CTableSelectionMode.ExtendedSelection) {
            event.accept();
            return;
        }

		if (this.itemDelegateForIndex(index).editorEvent(
			event,
			model,
			index,
			this.visualRect(index)
		)) {
			this.#m_contentWidget.update();
			event.accept();
			return;
		}

		this.#m_contentWidget.update();
		event.accept();
	}

	/** Starts editing the cell under a double click. */
	contentMouseDoubleClickEvent(event: CMouseEvent): void {
		const model = this.model();
		const selectionModel = this.selectionModel();

		if (event.type() !== CEventType.MouseDoubleClick
			|| event.button() !== CMouseButton.LeftButton
			|| model === null
			|| selectionModel === null) {
			event.ignore();
			return;
		}

        if (this.#selectionMode === CTableSelectionMode.ExtendedSelection &&
            (event.modifiers() & CKeyboardModifier.ControlModifier) !== 0) {
            event.accept();
            return;
        }

		const column = this.#m_horizontalHeader.sectionAt(event.pos().x() - this.#m_scrollArea.scrollX());
		const row = Math.floor(event.pos().y() / CTableView.RowHeight);
		const index = model.index(row, column);

		if (!index.isValid()) {
			event.ignore();
			return;
		}

		this.#selectCell(index, false);
		this.#m_contentWidget.update();
		this.edit(index);
		event.accept();
	}

    /** Reports the rejected destination and reason when a paste cannot be applied. */
    readonly pasteRejected = new CSignal<[row: number, column: number, message: string]>();

    canPaste(): boolean {
        const index = this.currentIndex();
        return index.isValid() && (this.model()?.isEditable(index) ?? false);
    }

    /** Pastes text at the current cell through the model's atomic edit API. */
    paste(text = CClipboard.instance().text()): void {
        const model = this.model();
        const anchor = this.currentIndex();
        if (model === null || !anchor.isValid()) return;

        const rows = parseTableText(text);
        if (rows === null) {
            this.pasteRejected.emit(anchor.row(), anchor.column(), "Invalid quoted text.");
            return;
        }

        const edits: CItemTextEdit[] = [];
        for (const [rowOffset, fields] of rows.entries()) {
            for (const [columnOffset, value] of fields.entries()) {
                const row = anchor.row() + rowOffset;
                const column = anchor.column() + columnOffset;
                const index = model.index(row, column);
                if (!index.isValid() || !model.isEditable(index)) {
                    this.pasteRejected.emit(row, column, index.isValid() ? "Cell is read-only." : "Cell is outside the table.");
                    return;
                }
                edits.push({ index, text: value });
            }
        }

        const error = model.applyTextEdits(edits);
        if (error !== null) {
            const index = edits[error.editIndex]?.index ?? anchor;
            this.pasteRejected.emit(index.row(), index.column(), error.message);
        }
    }

    /** Returns whether the table has cells to copy. */
    canCopy(): boolean {
        return this.selectionModel()?.hasSelection() ?? false;
    }

    /** Serializes the selected cells in view order as tab-separated text. */
    selectedText(): string {
        const model = this.model();
        const indexes = this.selectionModel()?.selectedIndexes() ?? [];
        if (model === null || indexes.length === 0) return "";

        let firstRow = Infinity, lastRow = -1, firstColumn = Infinity, lastColumn = -1;
        const rows = new Map<number, Map<number, string>>();
        for (const index of indexes) {
            const row = index.row();
            const column = index.column();
            firstRow = Math.min(firstRow, row);
            lastRow = Math.max(lastRow, row);
            firstColumn = Math.min(firstColumn, column);
            lastColumn = Math.max(lastColumn, column);

            let cells = rows.get(row);
            if (cells === undefined) {
                cells = new Map();
                rows.set(row, cells);
            }
            const value = model.data(index);
            const text = value instanceof Date ? this.#formatDate(value) : String(value ?? "");
            cells.set(column, /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
        }

        const result: string[] = [];
        for (let row = firstRow; row <= lastRow; ++row) {
            const cells = rows.get(row);
            const fields: string[] = [];
            for (let column = firstColumn; column <= lastColumn; ++column)
                fields.push(cells?.get(column) ?? "");
            result.push(fields.join("\t"));
        }
        return result.join("\r\n");
    }

    /** Copies selected cells to the clipboard. */
    copy(text = this.selectedText()): void {
        if (this.canCopy()) CClipboard.instance().setText(text);
    }

	/** Handles the content key press event. */
	contentKeyPressEvent(event: CKeyEvent): void {
        if ((event.ctrl() || event.meta()) && !event.alt() && !event.altGraph() &&
            !event.shift() && event.key().toLowerCase() === "c" && this.canCopy()) {
            this.copy();
            event.accept();
            return;
        }
		const model = this.model();
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (model === null || selectionModel === null) {
			event.ignore();
			return;
		}

		const currentIndex = this.currentIndex();
		if (currentIndex.isValid()
			&& this.itemDelegateForIndex(currentIndex).editorEvent(
				event,
				model,
				currentIndex,
				this.visualRect(currentIndex)
			)) {
			this.#m_contentWidget.update();
			return;
		}

		if (event.key() === "F2" || event.key() === "Enter") {
			if (this.edit(this.currentIndex())) {
				event.accept();
				return;
			}
		}

		const rows = model.rowCount();
		const columns = model.columnCount();

		/** Provides if behavior. */
		if (rows === 0 || columns === 0) {
			event.ignore();
			return;
		}

		let row = this.currentIndex().row();
		let column = this.currentIndex().column();

		/** Provides if behavior. */
		if (!this.currentIndex().isValid()) {
			row = 0;
			column = 0;
		} else {
			/** Provides switch behavior. */
			switch (event.key()) {
				case "ArrowLeft":
					column = Math.max(0, column - 1);
					break;

				case "ArrowRight":
					column = Math.min(columns - 1, column + 1);
					break;

				case "ArrowUp":
					row = Math.max(0, row - 1);
					break;

				case "ArrowDown":
					row = Math.min(rows - 1, row + 1);
					break;

				case "Home":
					/** Provides if behavior. */
					if (event.ctrl())
						row = 0;

					column = 0;
					break;

				case "End":
					/** Provides if behavior. */
					if (event.ctrl())
						row = rows - 1;

					column = columns - 1;
					break;

				case "PageUp":
					row = Math.max(0, row - this.#pageRowCount()
					);
					break;

				case "PageDown":
					row = Math.min(rows - 1, row + this.#pageRowCount());
				break;

				default:
					event.ignore();
					return;
			}
		}

		const index = model.index(row, column);

		this.#selectCell(index, event.shift());

		this.#ensureIndexVisible(index);

		this.#m_contentWidget.update();
		event.accept();
	}

	#updateGeometry(): void {
		const headerWidth =
			CHeaderView.DefaultVerticalWidth;

		const headerHeight =
			CHeaderView.DefaultSectionHeight;

		const contentWidth =
			Math.max(0, this.width() - headerWidth);

		const contentHeight =
			Math.max(0, this.height() - headerHeight);

		this.#m_horizontalHeader.setGeometry(
			headerWidth,
			0,
			contentWidth,
			headerHeight
		);

		this.#m_verticalHeader.setGeometry(
			0,
			headerHeight,
			headerWidth,
			contentHeight
		);

		this.#m_scrollArea.setGeometry(
			headerWidth,
			headerHeight,
			contentWidth,
			contentHeight
		);

		this.#updateContentGeometry();
	}

	#updateContentGeometry(): void {
		const rows = this.model()?.rowCount() ?? 0;
		const width = this.#m_horizontalHeader.length();

		const height = rows * CTableView.RowHeight;

		this.#m_contentWidget.resize(
			Math.max(width, this.viewport().width()),
			Math.max(height, this.viewport().height())
		);

		this.#m_scrollArea.updateTableScrollBars();
		this.#m_contentWidget.resize(
			Math.max(width, this.viewport().width()),
			Math.max(height, this.viewport().height())
		);

		this.#m_scrollArea.updateTableScrollBars();
		
		this.#m_horizontalHeader.setOffset(
			this.#m_scrollArea.scrollX()
		);

		this.#m_verticalHeader.setOffset(
			this.#m_scrollArea.scrollY()
		);

		void this.#fetchMoreIfNeeded();

	}

	/** Returns the widget used as editor parent. */
	protected override editorParent(): CWidget {
		return this.#m_contentWidget;
	}

	/** Updates table-specific state after a model change. */
	protected override modelChanged(
		_oldModel: CAbstractItemModel | null,
		newModel: CAbstractItemModel | null
	): void {
		this.#selectionAnchor = null;
		this.#m_horizontalHeader.setModel(newModel);
		this.#m_verticalHeader.setModel(newModel);
		this.#updateContentGeometry();
		this.update();
		void this.#fetchMoreIfNeeded();
	}

	/** Repaints table cells after model data changes. */
	protected override modelDataChanged(): void {
		this.#m_contentWidget.update();
	}

	/** Updates table geometry and headers after a model reset. */
	protected override modelReset(): void {
        this.#selectionAnchor = null;
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_horizontalHeader.update();
		this.#m_verticalHeader.update();
		void this.#fetchMoreIfNeeded();
	}

	/** Updates table geometry after rows are rearranged or filtered. */
	protected override modelLayoutChanged(): void {
        this.#selectionAnchor = null;
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_horizontalHeader.update();
		this.#m_verticalHeader.update();
	}

	/** Updates table geometry after rows are inserted. */
	protected override modelRowsInserted(
		_parent: CModelIndex,
		_first: number,
		_last: number
	): void {
		this.#updateRowsGeometry();
	}

	/** Updates table geometry after rows are removed. */
	protected override modelRowsRemoved(
		_parent: CModelIndex,
		_first: number,
		_last: number
	): void {
		this.#updateRowsGeometry();
	}

	#updateRowsGeometry(): void {
        this.#selectionAnchor = null;
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_verticalHeader.update();
		void this.#fetchMoreIfNeeded();
	}

	/** Scrolls to and repaints a newly selected current index. */
	protected override currentIndexChanged(index: CModelIndex): void {
		super.currentIndexChanged(index);

		if (index.isValid())
			this.#ensureIndexVisible(index);

		this.#m_contentWidget.update();
	}

	/** Restores focus to the table content after editing. */
	protected override editorClosed(): void {
		this.#m_contentWidget.setFocus();
		this.#m_contentWidget.update();
	}

	#ensureIndexVisible(index: CModelIndex): void {
		/** Provides if behavior. */
		if (!index.isValid())
			return;

		const y = index.row() * CTableView.RowHeight;
		const x = this.#m_horizontalHeader.sectionPosition(index.column());
		const right = x + this.#m_horizontalHeader.sectionSize(index.column());
		const bottom = y + CTableView.RowHeight;

		const viewportWidth = this.#m_scrollArea.viewport().width();
		const viewportHeight = this.#m_scrollArea.viewport().height();

		let scrollX = this.#m_scrollArea.scrollX();
		let scrollY = this.#m_scrollArea.scrollY();

		/** Provides if behavior. */
		if (x < scrollX)
			scrollX = x;
		else if (right > scrollX + viewportWidth)
			scrollX = right - viewportWidth;

		/** Provides if behavior. */
		if (y < scrollY)
			scrollY = y;
		else if (bottom > scrollY + viewportHeight)
			scrollY = bottom - viewportHeight;

		this.#m_scrollArea.scrollTo(scrollX, scrollY);
	}

	#pageRowCount(): number {
		return Math.max(
			1,
			Math.floor(
				this.#m_scrollArea.viewport().height()
					/ CTableView.RowHeight
			)
		);
	}

	async #fetchMoreIfNeeded(scrollY = this.scrollY()): Promise<void> {
		const model = this.model();
		if (model === null || this.#m_fetchingMore || !model.canFetchMore())
			return;

		const visibleBottom = scrollY + this.viewport().height();
		const contentBottom = model.rowCount() * CTableView.RowHeight;
		const threshold = 2 * CTableView.RowHeight;

		if (visibleBottom < contentBottom - threshold)
			return;

		const previousRowCount = model.rowCount();
		this.#m_fetchingMore = true;

		let fetched = false;
		try {
			fetched = await model.fetchMore();
		} catch {
			fetched = false;
		} finally {
			this.#m_fetchingMore = false;
		}

		if (this.model() !== model) {
			void this.#fetchMoreIfNeeded();
			return;
		}

		if (fetched && model.rowCount() > previousRowCount)
			void this.#fetchMoreIfNeeded();
	}

	#oppositeSortOrder(order: CSortOrder): CSortOrder {
		return order === CSortOrder.AscendingOrder
			? CSortOrder.DescendingOrder
			: CSortOrder.AscendingOrder;
	}

	#formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${day}.${month}.${year}`;
	}
}
