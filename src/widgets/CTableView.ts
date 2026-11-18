import { CAction } from "../core/CAction.js";
import { CContextMenuEvent, CContextMenuReason } from "../events/CContextMenuEvent.js";
import { CMenu } from "./CMenu.js";
import { CTimer } from "../core/CTimer.js";
import { CApplication } from "../core/CApplication.js";
import { CCursorShape } from "../gui/CCursorShape.js";
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
	/**
	 * Updates the table scroll bars.
	 */
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

	/**
	 * Draws the table view content widget through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		this.#m_view.paintCells(painter);
	}

	/**
	 * Responds to a pointer button press for the table view content widget.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		this.#m_view.contentMousePressEvent(event);
	}

    /**
     * Responds to pointer movement for the table view content widget.
     * @param event Event for pointer movement.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void {
        this.#m_view.contentMouseMoveEvent(event);
    }

    /**
     * Responds to a pointer button release for the table view content widget.
     * @param event Event for a pointer button release.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        this.#m_view.contentMouseReleaseEvent(event);
    }

    /**
     * Responds to pointer exit for the table view content widget.
     * @param event Event for pointer exit.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        this.#m_view.contentMouseLeaveEvent();
        super.mouseLeaveEvent(event);
    }

	/**
	 * Responds to a double-click for the table view content widget.
	 * @param event Event for a double-click.
	 */
	protected override mouseDoubleClickEvent(event: CMouseEvent): void {
		this.#m_view.contentMouseDoubleClickEvent(event);
	}

	/**
	 * Responds to a key press for the table view content widget.
	 * @param event Event for a key press.
	 */
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
    #dragSelection: { anchor: CModelIndex; cursor: CCursorShape; x: number; y: number } | null = null;
    #dragScrollTimer = new CTimer(this);
    #contextMenu: CMenu | null = null;
    #pasteRequest = 0;

    /**
     * Reads the selection mode.
     * @returns The selection mode.
     */
    selectionMode(): CTableSelectionMode {
        return this.#selectionMode;
    }

    /**
     * Sets the selection mode. May update the selection mode, the selection anchor.
     * @param mode Mode.
     */
    setSelectionMode(mode: CTableSelectionMode): void {
        if (mode === this.#selectionMode) return;
        this.#selectionMode = mode;
        this.#stopDragSelection();
        this.#m_contentWidget.setCursor(CCursorShape.Arrow);
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
		this.setFocusProxy(this.#m_contentWidget);
        this.#dragScrollTimer.timeout.connect(() => this.#scrollDragSelection());
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
	 * Computes the cell rectangle from the column header positions and fixed row height.
	 * @param index Index in the current model identifying the item.
	 * @returns Cell bounds in content coordinates, or an empty rectangle for an invalid or foreign index.
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

	/**
	 * Reads the horizontal header.
	 * @returns The horizontal header.
	 */
	horizontalHeader(): CHeaderView {
		return this.#m_horizontalHeader;
	}

	/**
	 * Reads the vertical header.
	 * @returns The vertical header.
	 */
	verticalHeader(): CHeaderView {
		return this.#m_verticalHeader;
	}

	/**
	 * Returns whether sorting by clicking the header is enabled.
	 * @returns `true` if the table view is sorting enabled, otherwise `false`.
	 */
	isSortingEnabled(): boolean {
		return this.#m_sortingEnabled;
	}

	/**
	 * Enables or disables sorting by clicking the horizontal header.
	 * @param enabled Whether to enable the feature.
	 */
	setSortingEnabled(enabled: boolean): void {
		if (this.#m_sortingEnabled === enabled)
			return;

		this.#m_sortingEnabled = enabled;
		this.#m_horizontalHeader.setSortIndicatorShown(enabled);
	}

	/**
	 * Sorts the model by the requested column and order.
	 * @param column Zero-based column.
	 * @param order Order. Defaults to `CSortOrder.AscendingOrder`.
	 */
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

	/**
	 * Reads the viewport of the table view.
	 * @returns The viewport.
	 */
	viewport(): CWidget {
		return this.#m_scrollArea.viewport();
	}

	/**
	 * Reads the horizontal scroll bar of the table view.
	 * @returns The horizontal scroll bar.
	 */
	horizontalScrollBar(): CScrollBar {
		return this.#m_scrollArea.horizontalScrollBar();
	}

	/**
	 * Reads the vertical scroll bar of the table view.
	 * @returns The vertical scroll bar.
	 */
	verticalScrollBar(): CScrollBar {
		return this.#m_scrollArea.verticalScrollBar();
	}

	/**
	 * Reads the horizontal scroll offset.
	 * @returns The scroll x.
	 */
	scrollX(): number {
		return this.#m_scrollArea.scrollX();
	}

	/**
	 * Reads the vertical scroll offset.
	 * @returns The scroll y.
	 */
	scrollY(): number {
		return this.#m_scrollArea.scrollY();
	}

	/**
	 * Sets the scroll x.
	 * @param x Horizontal coordinate.
	 */
	setScrollX(x: number): void {
		this.#m_scrollArea.setScrollX(x);
	}

	/**
	 * Sets the scroll y.
	 * @param y Vertical coordinate.
	 */
	setScrollY(y: number): void {
		this.#m_scrollArea.setScrollY(y);
	}

	/**
	 * Scrolls the to.
	 * @param x Horizontal coordinate.
	 * @param y Vertical coordinate.
	 */
	scrollTo(x: number, y: number): void {
		this.#m_scrollArea.scrollTo(x, y);
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize {
		return new CSize(400, 240);
	}

	/**
	 * Sets the geometry.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
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
	 * Paints the cells.
	 * @param painter Painter for the current drawing operation.
	 */
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

    #cellAtContentPoint(x: number, y: number): CModelIndex {
        const viewport = this.viewport();
        if (x < this.scrollX() || x >= this.scrollX() + viewport.width() ||
            y < this.scrollY() || y >= this.scrollY() + viewport.height())
            return new CModelIndex();
        const column = this.#m_horizontalHeader.sectionAt(x - this.#m_horizontalHeader.offset());
        const row = Math.floor(y / CTableView.RowHeight);
        return this.model()?.index(row, column) ?? new CModelIndex();
    }

    #cornerCursor(index: CModelIndex, x: number, y: number): CCursorShape {
        if (this.#selectionMode !== CTableSelectionMode.ExtendedSelection || !index.isValid() ||
            !this.selectionModel()?.isSelected(index)) return CCursorShape.Arrow;

        const rect = this.visualRect(index);
        const localX = x - rect.x();
        const localY = y - rect.y();
        if (localX < 0 || localY < 0 || localX >= rect.width() || localY >= rect.height())
            return CCursorShape.Arrow;

        const margin = 5;
        const nearSide = localX < margin || localX >= rect.width() - margin;
        const nearTopOrBottom = localY < margin || localY >= rect.height() - margin;
        return nearSide && nearTopOrBottom ? CCursorShape.SizeFDiag : CCursorShape.Arrow;
    }

    /**
     * Updates the cursor over the cell and extends an active drag selection, scheduling auto-scroll when the pointer leaves the viewport.
     * @param event Mouse movement in table content coordinates.
     */
    contentMouseMoveEvent(event: CMouseEvent): void {
        const index = this.#cellAtContentPoint(event.x(), event.y());
        if (CApplication.instance().mouseGrabber() !== this.#m_contentWidget)
            this.#stopDragSelection();

        const drag = this.#dragSelection;
        this.#m_contentWidget.setCursor(drag?.cursor ?? this.#cornerCursor(index, event.x(), event.y()));
        if (drag === null) {
            event.ignore();
            return;
        }

        drag.x = event.x() - this.scrollX();
        drag.y = event.y() - this.scrollY();
        this.#extendDragSelection(index, drag.anchor);
        const [dx, dy] = this.#dragScrollDelta(drag.x, drag.y);
        if (dx === 0 && dy === 0) this.#dragScrollTimer.stop();
        else if (!this.#dragScrollTimer.isActive()) this.#dragScrollTimer.start(40);
        event.accept();
    }

    #stopDragSelection(): void {
        this.#dragSelection = null;
        this.#dragScrollTimer.stop();
    }

    #extendDragSelection(index: CModelIndex, anchor: CModelIndex): void {
        const selection = this.selectionModel();
        if (!index.isValid() || selection === null || index.equals(this.currentIndex())) return;
        selection.selectRectangle(anchor, index);
        selection.setCurrentIndex(index);
        this.#m_contentWidget.update();
    }

    #dragScrollDelta(x: number, y: number): [number, number] {
        const viewport = this.viewport();
        const delta = (position: number, extent: number): number => {
            const edge = Math.min(16, extent / 2);
            if (position < edge) return -CTableView.RowHeight;
            if (position >= extent - edge) return CTableView.RowHeight;
            return 0;
        };
        return [delta(x, viewport.width()), delta(y, viewport.height())];
    }

    #scrollDragSelection(): void {
        const drag = this.#dragSelection;
        if (drag === null || CApplication.instance().mouseGrabber() !== this.#m_contentWidget ||
            !this.#m_contentWidget.isVisible() || !this.#m_contentWidget.isEnabled()) {
            this.#stopDragSelection();
            return;
        }

        const [dx, dy] = this.#dragScrollDelta(drag.x, drag.y);
        const oldX = this.scrollX();
        const oldY = this.scrollY();
        this.scrollTo(oldX + dx, oldY + dy);
        if (this.scrollX() === oldX && this.scrollY() === oldY) {
            this.#dragScrollTimer.stop();
            return;
        }

        const viewport = this.viewport();
        if (viewport.width() < 1 || viewport.height() < 1) return;
        // Pointer coordinates stay relative to the viewport as the content moves.
        const x = this.scrollX() + Math.max(0, Math.min(drag.x, viewport.width() - 1));
        const y = this.scrollY() + Math.max(0, Math.min(drag.y, viewport.height() - 1));
        this.#extendDragSelection(this.#cellAtContentPoint(x, y), drag.anchor);
    }

    /**
     * Ends active drag selection on a left-button release and refreshes the cell cursor.
     * @param event Mouse event with release button and position in table content coordinates.
     */
    contentMouseReleaseEvent(event: CMouseEvent): void {
        if (this.#dragSelection === null || event.button() !== CMouseButton.LeftButton) {
            event.ignore();
            return;
        }
        this.#stopDragSelection();
        const index = this.#cellAtContentPoint(event.x(), event.y());
        this.#m_contentWidget.setCursor(this.#cornerCursor(index, event.x(), event.y()));
        event.accept();
    }

    /**
     * Responds to the content mouse leave event for the table view.
     */
    contentMouseLeaveEvent(): void {
        if (this.#dragSelection === null)
            this.#m_contentWidget.setCursor(CCursorShape.Arrow);
    }

	/**
	 * Handles a left press in table content, selecting or extending the cell range and starting drag tracking where applicable.
	 * @param event Mouse event with button, modifiers and position in table content coordinates.
	 */
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
        this.#stopDragSelection();
        const cursor = this.#cornerCursor(index, event.x(), event.y());
        if (!extend && !toggle && cursor !== CCursorShape.Arrow) {
            this.#selectCell(index, false);
            this.#dragSelection = {
                anchor: index, cursor, x: event.x() - this.scrollX(), y: event.y() - this.scrollY()
            };
            this.#m_contentWidget.setCursor(cursor);
            event.accept();
            return;
        }
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

	/**
	 * Selects the cell under a left double-click and invokes the item editor when the click is handled by the view.
	 * @param event Mouse event with button and position in table content coordinates.
	 */
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

    /**
     * Responds to a context menu request for the table view. May update the context menu. May request a repaint and request focus and accept or ignore the event depending on the input.
     * @param event Event for a context menu request.
     */
    protected override contextMenuEvent(event: CContextMenuEvent): void {
        const selection = this.selectionModel();
        const model = this.model();
        if (!this.isEnabled() || selection === null || model === null) {
            event.ignore();
            return;
        }

        const viewport = this.viewport();
        let position = event.globalPos();
        if (event.reason() === CContextMenuReason.Mouse) {
            const point = viewport.mapFromCanvas(position.x(), position.y());
            const index = this.#cellAtContentPoint(point.x() + this.scrollX(), point.y() + this.scrollY());
            if (!index.isValid()) {
                event.ignore();
                return;
            }
            if (!selection.isSelected(index)) {
                selection.clearSelection();
                selection.select(index);
                this.update();
            }
            this.setCurrentIndex(index);
        } else {
            if (!this.currentIndex().isValid()) {
                event.ignore();
                return;
            }
            position = viewport.mapToCanvas(viewport.width() / 2, viewport.height() / 2);
        }

        this.#disposeContextMenu();
        const menu = new CMenu();
        const clipboard = CClipboard.instance();
        const hasSelection = selection.hasSelection();
        const cellActions = this.contextCellActions();

        const add = (label: string, enabled: boolean, execute: () => void): void => {
            const action = new CAction(label);
            action.setEnabled(enabled);
            action.triggered.connect(execute);
            menu.addAction(action);
        };
        if (cellActions !== null) add("Cut", cellActions.enabled, cellActions.cut);
        add("Copy", hasSelection, () => this.copy());
        if (model.supportsTextEdits()) {
            add("Paste", this.canPaste() && (clipboard.canReadSystemText() || clipboard.text().length > 0),
                () => { void this.#pasteFromContextMenu(); });
        }
        if (cellActions !== null) {
            menu.addSeparator();
            add("Clear", cellActions.enabled, cellActions.clear);
        }

        const history = model.undoStack();
        if (history !== null) {
            menu.addSeparator();
            add("Undo", history.canUndo(), () => this.undo());
            add("Redo", history.canRedo(), () => this.redo());
        }

        this.setFocus();
        this.#contextMenu = menu;
        menu.closed.connect(() => {
            if (this.#contextMenu !== menu) return;
            this.#contextMenu = null;
            menu.destroy();
        });
        event.accept();
        menu.exec(position);
    }

    async #pasteFromContextMenu(): Promise<void> {
        const model = this.model();
        const index = this.currentIndex();
        const request = ++this.#pasteRequest;
        const clipboard = CClipboard.instance();
        if (!clipboard.canReadSystemText()) {
            this.paste(clipboard.text());
            return;
        }

        const text = await clipboard.readSystemText();
        if (request === this.#pasteRequest && text !== null && model === this.model() &&
            index.equals(this.currentIndex()) && this.isVisible() && this.isEnabled() && this.canPaste())
            this.paste(text);
    }

    #disposeContextMenu(): void {
        const menu = this.#contextMenu;
        this.#contextMenu = null;
        menu?.close();
        menu?.destroy();
    }

    /**
     * Releases resources held by the table view.
     */
    override destroy(): void {
        ++this.#pasteRequest;
        this.#disposeContextMenu();
        super.destroy();
    }

    /**
     * Supplies model-specific Cut and Clear actions, if available.
     * @returns `null`.
     */
    protected contextCellActions(): { enabled: boolean; cut: () => void; clear: () => void } | null {
        return null;
    }

    /** Reports the rejected destination and reason when a paste cannot be applied. */
    readonly pasteRejected = new CSignal<[row: number, column: number, message: string]>();

    /**
     * Checks whether the table view can paste.
     * @returns `true` if the table view can paste, otherwise `false`.
     */
    canPaste(): boolean {
        const index = this.currentIndex();
        return index.isValid() && (this.model()?.isEditable(index) ?? false);
    }

    /**
     * Parses tabular text and submits it as a batch starting at the current cell. Emits `pasteRejected` if parsing or model validation fails.
     * @param text Tabular text to paste. Defaults to the current clipboard text.
     */
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

    /**
     * Returns whether the table has cells to copy.
     * @returns `true` if the table view can copy, otherwise `false`.
     */
    canCopy(): boolean {
        return this.selectionModel()?.hasSelection() ?? false;
    }

    /**
     * Serializes the selected cells as a rectangular, tab-separated range. Unselected positions within the range are represented by empty fields.
     * @returns Tab-separated cell text with CRLF between rows, or an empty string if no selection is available.
     */
    selectedText(): string {
        const model = this.model();
        const selection = this.selectionModel();
        if (model === null || selection === null || !selection.hasSelection()) return "";

        const rows: { row: number; first: number; last: number; text: string }[] = [];
        let firstColumn = Infinity;
        let lastColumn = -1;
        let row = -1;
        let start = 0;
        let fields: string[] = [];

        for (const index of selection.selectedIndexesInRowOrder()) {
            if (row !== index.row()) {
                if (row >= 0)
                    rows.push({ row, first: start, last: start + fields.length - 1, text: fields.join("\t") });
                row = index.row();
                start = index.column();
                fields = [];
            }
            const column = index.column();
            firstColumn = Math.min(firstColumn, column);
            lastColumn = Math.max(lastColumn, column);
            const value = model.data(index);
            const text = value instanceof Date ? this.#formatDate(value) : String(value ?? "");
            fields[column - start] = /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        }
        if (row < 0) return "";
        rows.push({ row, first: start, last: start + fields.length - 1, text: fields.join("\t") });

        const result: string[] = [];
        const emptyRow = "\t".repeat(lastColumn - firstColumn);
        let nextRow = rows[0]!.row;
        for (const line of rows) {
            while (nextRow < line.row) {
                result.push(emptyRow);
                ++nextRow;
            }
            result.push("\t".repeat(line.first - firstColumn) + line.text + "\t".repeat(lastColumn - line.last));
            ++nextRow;
        }
        return result.join("\r\n");
    }

    /**
     * Copies text into the toolkit clipboard when copying is available.
     * @param text Text to copy. Defaults to the tab-separated selection.
     */
    copy(text = this.selectedText()): void {
        if (this.canCopy()) CClipboard.instance().setText(text);
    }

    /** Undoes the most recent model edit when the model provides history. */
    undo(): void {
        this.model()?.undoStack()?.undo();
    }

    /** Reapplies the most recently undone model edit. */
    redo(): void {
        this.model()?.undoStack()?.redo();
    }

	/**
	 * Handles table navigation, selection extension and supported editing or clipboard shortcuts.
	 * @param event Keyboard event from the table content.
	 */
	contentKeyPressEvent(event: CKeyEvent): void {
        if ((event.ctrl() || event.meta()) && !event.alt() && !event.altGraph()) {
            const key = event.key().toLowerCase();
            const history = this.model()?.undoStack();
            if (key === "z" && !event.shift() && history?.canUndo()) {
                this.undo();
                event.accept();
                return;
            }
            if ((key === "y" && !event.shift() || key === "z" && event.shift()) && history?.canRedo()) {
                this.redo();
                event.accept();
                return;
            }
        }
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

	/**
	 * Returns the widget used as editor parent.
	 * @returns The content widget.
	 */
	protected override editorParent(): CWidget {
		return this.#m_contentWidget;
	}

	/**
	 * Updates table-specific state after a model change.
	 * @param _oldModel Old model. This implementation ignores the argument.
	 * @param newModel New model.
	 */
	protected override modelChanged(
		_oldModel: CAbstractItemModel | null,
		newModel: CAbstractItemModel | null
	): void {
		this.#selectionAnchor = null;
        this.#stopDragSelection();
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
        this.#stopDragSelection();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_horizontalHeader.update();
		this.#m_verticalHeader.update();
		void this.#fetchMoreIfNeeded();
	}

	/** Updates table geometry after rows are rearranged or filtered. */
	protected override modelLayoutChanged(): void {
        this.#selectionAnchor = null;
        this.#stopDragSelection();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_horizontalHeader.update();
		this.#m_verticalHeader.update();
	}

	/**
	 * Updates table geometry after rows are inserted.
	 * @param _parent Owning object or parent item. This implementation ignores the argument.
	 * @param _first First. This implementation ignores the argument.
	 * @param _last Last. This implementation ignores the argument.
	 */
	protected override modelRowsInserted(
		_parent: CModelIndex,
		_first: number,
		_last: number
	): void {
		this.#updateRowsGeometry();
	}

	/**
	 * Updates table geometry after rows are removed.
	 * @param _parent Owning object or parent item. This implementation ignores the argument.
	 * @param _first First. This implementation ignores the argument.
	 * @param _last Last. This implementation ignores the argument.
	 */
	protected override modelRowsRemoved(
		_parent: CModelIndex,
		_first: number,
		_last: number
	): void {
		this.#updateRowsGeometry();
	}

	#updateRowsGeometry(): void {
        this.#selectionAnchor = null;
        this.#stopDragSelection();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_verticalHeader.update();
		void this.#fetchMoreIfNeeded();
	}

	/**
	 * Runs base edit cleanup, scrolls a valid current cell into view and repaints the content.
	 * @param index New current cell index.
	 */
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
