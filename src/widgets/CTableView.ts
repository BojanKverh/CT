import { CEventType } from "../events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CHeaderView } from "./CHeaderView.js";
import { CScrollArea } from "./CScrollArea.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemView } from "./CAbstractItemView.js";

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

		this.#m_scrollArea.horizontalScrollBar()
			.valueChanged.connect(value => {
				this.#m_horizontalHeader.setOffset(value);
			});

		this.#m_scrollArea.verticalScrollBar()
			.valueChanged.connect(value => {
				this.#m_verticalHeader.setOffset(value);
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

		const base = palette.color(
			CPaletteColorRole.Base
		).toCss();

		const text = palette.color(
			CPaletteColorRole.Text
		).toCss();

		const highlight = palette.color(
			CPaletteColorRole.Highlight
		).toCss();

		const highlightedText = palette.color(
			CPaletteColorRole.HighlightedText
		).toCss();

		painter.setBrush(base);
		painter.setPen(base);
		painter.drawRect(
			0,
			0,
			this.#m_contentWidget.width(),
			this.#m_contentWidget.height()
		);

		painter.setFont(this.font());
		painter.setTextBaseline("middle");
        painter.setTextAlign("left");

		/** Provides for behavior. */
		for (let row = 0; row < model.rowCount(); row++) {
			/** Provides for behavior. */
			for (
				let column = 0;
				column < model.columnCount();
				column++
			) {
				const index = model.index(row, column);
				const x = this.#m_horizontalHeader.sectionPosition(column);
				const width = this.#m_horizontalHeader.sectionSize(column);
				const y = row * CTableView.RowHeight;
				const selected = this.selectionModel()?.isSelected(index) ?? false;

				painter.setBrush(selected ? highlight : base);
				painter.setPen(selected ? highlightedText : text);
				painter.drawRect(x, y, width, CTableView.RowHeight);

				const value = model.data(index);

				painter.save();
				painter.clipRect(new CRect(x, y, width, CTableView.RowHeight));
				const rect = new CRect(x, y, width, CTableView.RowHeight);
				const delegate = this.itemDelegateForIndex(index);

				if (!delegate.paint(
					painter,
					rect,
					index,
					this.#m_contentWidget
				)) {
					const val = value instanceof Date
						? this.#formatDate(value)
						: value === null || value === undefined
							? ""
							: String(value);
					painter.drawText(
						val,
						x + 5,
						y + CTableView.RowHeight / 2
					);
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

		selectionModel.clearSelection();
		selectionModel.select(index);
		this.setCurrentIndex(index);

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

		const column = this.#m_horizontalHeader.sectionAt(event.pos().x() - this.#m_scrollArea.scrollX());
		const row = Math.floor(event.pos().y() / CTableView.RowHeight);
		const index = model.index(row, column);

		if (!index.isValid()) {
			event.ignore();
			return;
		}

		selectionModel.clearSelection();
		selectionModel.select(index);
		this.setCurrentIndex(index);
		this.#m_contentWidget.update();
		this.edit(index);
		event.accept();
	}

	/** Handles the content key press event. */
	contentKeyPressEvent(event: CKeyEvent): void {
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

		selectionModel.clearSelection();
		selectionModel.select(index);
		this.setCurrentIndex(index);

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
		this.#m_horizontalHeader.setModel(newModel);
		this.#m_verticalHeader.setModel(newModel);
		this.#updateContentGeometry();
		this.update();
	}

	/** Repaints table cells after model data changes. */
	protected override modelDataChanged(): void {
		this.#m_contentWidget.update();
	}

	/** Updates table geometry and headers after a model reset. */
	protected override modelReset(): void {
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_horizontalHeader.update();
		this.#m_verticalHeader.update();
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
