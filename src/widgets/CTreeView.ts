import { CSignal } from "../core/CSignal.js";
import { CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractItemView } from "./CAbstractItemView.js";
import { CHeaderView } from "./CHeaderView.js";
import { CScrollArea } from "./CScrollArea.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWidget } from "./CWidget.js";
import { CRect } from "../geometry/CRect.js";

type CTreeViewRow = {
	index: CModelIndex;
	parent: CModelIndex;
	depth: number;
	hasChildren: boolean;
};

class CTreeScrollArea extends CScrollArea {
	updateTreeScrollBars(): void {
		this.updateScrollBars();
	}
}

class CTreeViewContentWidget extends CWidget {
	#m_view: CTreeView;

	constructor(view: CTreeView) {
		super();

		this.#m_view = view;
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	protected override paintEvent(painter: CPainter): void {
		this.#m_view.paintRows(painter);
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

/** Implements the tree view widget. */
export class CTreeView extends CAbstractItemView {
	static readonly RowHeight = 24;
	static readonly IndentWidth = 20;

	#m_header: CHeaderView;
	#m_scrollArea: CTreeScrollArea;
	#m_contentWidget: CTreeViewContentWidget;

	#m_rows: CTreeViewRow[] = [];
	#m_expandedIndexes: CModelIndex[] = [];

	/** Public expanded member. */
	readonly expanded = new CSignal<[CModelIndex]>();
	/** Public collapsed member. */
	readonly collapsed = new CSignal<[CModelIndex]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_header =
			new CHeaderView(COrientation.Horizontal, this);

		this.#m_scrollArea = new CTreeScrollArea(this);
		this.#m_contentWidget = new CTreeViewContentWidget(this);

		this.#m_scrollArea.setWidget(this.#m_contentWidget);

		this.#m_scrollArea.horizontalScrollBar().valueChanged.connect(
			value => {
				this.#m_header.setOffset(value);
			}
		);

		this.#updateGeometry();

    	this.#m_header.sectionResized.connect(() => {
			this.#updateContentGeometry();
			this.updateEditorGeometry();
			this.#m_contentWidget.update();
		});
	}

	/** Returns the item rectangle in content-widget coordinates. */
	visualRect(index: CModelIndex): CRect {
		if (!index.isValid() || index.model() !== this.model())
			return new CRect();

		const row = this.#visibleRowForIndex(index);

		if (row < 0)
			return new CRect();

		return new CRect(
			this.#m_header.sectionPosition(index.column()),
			row * CTreeView.RowHeight,
			this.#m_header.sectionSize(index.column()),
			CTreeView.RowHeight
		);
	}

	/** Provides header behavior. */
	header(): CHeaderView {
		return this.#m_header;
	}

	/** Provides viewport behavior. */
	viewport(): CWidget {
		return this.#m_scrollArea.viewport();
	}

	/** Returns the tree content widget. */
	widget(): CWidget {
		return this.#m_contentWidget;
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

	/** Returns whether the expanded condition is active. */
	isExpanded(index: CModelIndex): boolean {
		return this.#m_expandedIndexes.some(
			expanded => expanded.equals(index)
		);
	}

	/** Sets the expanded. */
	setExpanded(index: CModelIndex, expanded: boolean): void {
		const model = this.model();

		/** Provides if behavior. */
		if (!index.isValid() ||
			index.model() !== model)
			return;

		/** Provides if behavior. */
		if (model?.rowCount(index) === 0)
			return;

		const currentlyExpanded = this.isExpanded(index);

		/** Provides if behavior. */
		if (currentlyExpanded === expanded)
			return;

		/** Provides if behavior. */
		if (expanded) {
			this.#m_expandedIndexes.push(index);
			this.expanded.emit(index);
		} else {
			this.#m_expandedIndexes =
				this.#m_expandedIndexes.filter(
					expandedIndex =>
						!expandedIndex.equals(index)
				);

			this.collapsed.emit(index);
		}

		this.#rebuildRows();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
	}

	/** Provides expand behavior. */
	expand(index: CModelIndex): void {
		this.setExpanded(index, true);
	}

	/** Provides collapse behavior. */
	collapse(index: CModelIndex): void {
		this.setExpanded(index, false);
	}

	/** Toggles expanded. */
	toggleExpanded(index: CModelIndex): void {
		this.setExpanded(index, !this.isExpanded(index));
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

	/** Provides paint rows behavior. */
	paintRows(painter: CPainter): void {
		const model = this.model();

		/** Provides if behavior. */
		if (model === null)
			return;

		const palette = this.palette();
		const columns = model.columnCount();

		const base =
			palette.color(CPaletteColorRole.Base).toCss();

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
		for (let row = 0; row < this.#m_rows.length; row++) {
			const treeRow = this.#m_rows[row];

			/** Provides if behavior. */
			if (treeRow === undefined)
				continue;

			const y = row * CTreeView.RowHeight;

			/** Provides for behavior. */
			for (let column = 0; column < columns; column++) {
				const index = this.#indexForColumn(treeRow, column);

				/** Provides if behavior. */
				if (!index.isValid())
					continue;

				const x = this.#m_header.sectionPosition(column);
				const width = this.#m_header.sectionSize(column);

				painter.save();
				painter.clipRect(
					new CRect(
						x,
						y,
						width,
						CTreeView.RowHeight
					)
				);

				const selected =
					this.selectionModel()?.isSelected(index) ?? false;

				/** Provides if behavior. */
				if (selected) {
					const highlight = palette.color(
						CPaletteColorRole.Highlight
					).toCss();

					painter.setBrush(highlight);
					painter.setPen(highlight);

					painter.drawRect(
						x,
						y,
						width,
						CTreeView.RowHeight
					);
				}

				const textColor = palette.color(
					selected
						? CPaletteColorRole.HighlightedText
						: CPaletteColorRole.Text
				).toCss();

				painter.setPen(textColor);
				painter.setBrush(textColor);

				let textX = x + 5;

				/** Provides if behavior. */
				if (column === 0) {
					textX +=
						treeRow.depth *
						CTreeView.IndentWidth;

					/** Provides if behavior. */
					if (treeRow.hasChildren) {
						this.#paintIndicator(
							painter,
							treeRow,
							textX,
							y,
							textColor
						);
					}

					textX += CTreeView.IndentWidth;
				}

				painter.drawText(
					/** Provides string behavior. */
					String(model.data(index) ?? ""),
					textX,
					y + CTreeView.RowHeight / 2
				);

				painter.restore();
			}
		}
	}
    
    /** Handles the content mouse press event. */
    contentMousePressEvent(event: CMouseEvent): void {
		const model = this.model();
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (event.type() !== CEventType.MousePress ||
			event.button() !== CMouseButton.LeftButton ||
			model === null ||
			selectionModel === null) {
			event.ignore();
			return;
		}

		this.#m_contentWidget.setFocus();

		const row = Math.floor(
			event.pos().y() / CTreeView.RowHeight
		);

		/** Provides if behavior. */
		if (row < 0 || row >= this.#m_rows.length) {
			event.ignore();
			return;
		}

		const treeRow = this.#m_rows[row];

		/** Provides if behavior. */
		if (treeRow === undefined) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (this.#indicatorContains(treeRow, event.pos().x())) {
			this.toggleExpanded(treeRow.index);
			event.accept();
			return;
		}

		const column =
			this.#m_header.sectionAt(event.pos().x());

		/** Provides if behavior. */
		if (column < 0 ||
			column >= model.columnCount()) {
			event.ignore();
			return;
		}

		const index = this.#indexForColumn(treeRow, column);

		/** Provides if behavior. */
		if (!index.isValid()) {
			event.ignore();
			return;
		}

		selectionModel.clearSelection();
		selectionModel.select(index);
		selectionModel.setCurrentIndex(index);

		this.#m_contentWidget.update();

		event.accept();
	}

	/** Starts editing the tree cell under a double click. */
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

		const row = Math.floor(event.pos().y() / CTreeView.RowHeight);
		const treeRow = this.#m_rows[row];

		if (treeRow === undefined) {
			event.ignore();
			return;
		}

		if (this.#indicatorContains(treeRow, event.pos().x())) {
			event.accept();
			return;
		}

		const column = this.#m_header.sectionAt(event.pos().x());
		if (column < 0 || column >= model.columnCount()) {
			event.ignore();
			return;
		}

		const index = this.#indexForColumn(treeRow, column);
		if (!index.isValid()) {
			event.ignore();
			return;
		}

		selectionModel.clearSelection();
		selectionModel.select(index);
		selectionModel.setCurrentIndex(index);
		this.#m_contentWidget.update();
		this.edit(index);
		event.accept();
	}

	/** Handles the content key press event. */
	contentKeyPressEvent(event: CKeyEvent): void {
		const model = this.model();
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (model === null ||
			selectionModel === null ||
			this.#m_rows.length === 0) {
			event.ignore();
			return;
		}

		const current = this.currentIndex();

		if (event.key() === "F2" || event.key() === "Enter") {
			if (this.edit(current)) {
				event.accept();
				return;
			}
		}

		/** Provides if behavior. */
		if (!current.isValid()) {
			const firstRow = this.#m_rows[0];

			/** Provides if behavior. */
			if (firstRow === undefined) {
				event.ignore();
				return;
			}

			this.#selectIndex(firstRow.index);
			event.accept();
			return;
		}

		const visibleRow = this.#visibleRowForIndex(current);

		/** Provides if behavior. */
		if (visibleRow < 0) {
			event.ignore();
			return;
		}

		let target = current;

		/** Provides switch behavior. */
		switch (event.key()) {
			case "ArrowUp":
				/** Provides if behavior. */
				if (visibleRow > 0)
					target = this.#indexAtVisibleRow(
						visibleRow - 1,
						current.column()
					);

				break;

			case "ArrowDown":
				/** Provides if behavior. */
				if (visibleRow < this.#m_rows.length - 1)
					target = this.#indexAtVisibleRow(
						visibleRow + 1,
						current.column()
					);

				break;

			case "ArrowRight": {
				const treeRow = this.#m_rows[visibleRow];

				/** Provides if behavior. */
				if (treeRow === undefined)
					break;

				/** Provides if behavior. */
				if (!treeRow.hasChildren)
					break;

				/** Provides if behavior. */
				if (!this.isExpanded(treeRow.index)) {
					this.expand(treeRow.index);
				} else {
					const child = model.index(
						0,
						current.column(),
						treeRow.index
					);

					/** Provides if behavior. */
					if (child.isValid())
						target = child;
				}

				break;
			}

			case "ArrowLeft": {
				const treeRow = this.#m_rows[visibleRow];

				/** Provides if behavior. */
				if (treeRow === undefined)
					break;

				/** Provides if behavior. */
				if (treeRow.hasChildren &&
					this.isExpanded(treeRow.index)) {
					this.collapse(treeRow.index);
					break;
				}

				const parent =
					model.parentIndex(current);

				/** Provides if behavior. */
				if (parent.isValid()) {
					const parentColumn =
						model.index(
							parent.row(),
							current.column(),
							model.parentIndex(parent)
						);

					target = parentColumn.isValid()
						? parentColumn
						: parent;
				}

				break;
			}

			case "Home":
				target = this.#indexAtVisibleRow(
					0,
					current.column()
				);
				break;

			case "End":
				target = this.#indexAtVisibleRow(
					this.#m_rows.length - 1,
					current.column()
				);
				break;

			case "PageUp":
				target = this.#indexAtVisibleRow(
					Math.max(
						0,
						visibleRow - this.#pageRowCount()
					),
					current.column()
				);
				break;

			case "PageDown":
				target = this.#indexAtVisibleRow(
					Math.min(
						this.#m_rows.length - 1,
						visibleRow + this.#pageRowCount()
					),
					current.column()
				);
				break;

			default:
				event.ignore();
				return;
		}

		/** Provides if behavior. */
		if (target.isValid() &&
			!target.equals(current))
			this.#selectIndex(target);

		event.accept();
	}

	#selectIndex(index: CModelIndex): void {
		const selectionModel = this.selectionModel();

		/** Provides if behavior. */
		if (selectionModel === null)
			return;

		selectionModel.clearSelection();
		selectionModel.select(index);
		selectionModel.setCurrentIndex(index);

		this.#ensureIndexVisible(index);
		this.#m_contentWidget.update();
	}

	#indexForColumn(
		row: CTreeViewRow,
		column: number
	): CModelIndex {
		const model = this.model();

		/** Provides if behavior. */
		if (model === null)
			return new CModelIndex();

		/** Provides if behavior. */
		if (column === 0)
			return row.index;

		return model.index(
			row.index.row(),
			column,
			row.parent
		);
	}

	#indexAtVisibleRow(
		row: number,
		column: number
	): CModelIndex {
		/** Provides if behavior. */
		if (row < 0 || row >= this.#m_rows.length)
			return new CModelIndex();

		const treeRow = this.#m_rows[row];

		/** Provides if behavior. */
		if (treeRow === undefined)
			return new CModelIndex();

		return this.#indexForColumn(
			treeRow,
			column
		);
	}

	#visibleRowForIndex(index: CModelIndex): number {
		const model = this.model();

		/** Provides if behavior. */
		if (model === null)
			return -1;

		const parent = model.parentIndex(index);

		return this.#m_rows.findIndex(row =>
			row.index.row() === index.row() &&
			row.parent.equals(parent)
		);
	}

	#rebuildRows(): void {
		this.#m_rows = [];

		/** Provides if behavior. */
		if (this.model() === null)
			return;

		this.#appendChildren(
			new CModelIndex(),
			0
		);
	}

	#appendChildren(
		parent: CModelIndex,
		depth: number
	): void {
		const model = this.model();

		/** Provides if behavior. */
		if (model === null)
			return;

		const count = model.rowCount(parent);

		/** Provides for behavior. */
		for (let row = 0; row < count; row++) {
			const index =
				model.index(row, 0, parent);

			/** Provides if behavior. */
			if (!index.isValid())
				continue;

			const hasChildren =
				model.rowCount(index) > 0;

			this.#m_rows.push({
				index,
				parent,
				depth,
				hasChildren
			});

			/** Provides if behavior. */
			if (hasChildren &&
				this.isExpanded(index)) {
				this.#appendChildren(
					index,
					depth + 1
				);
			}
		}
	}

	#indicatorContains(
		row: CTreeViewRow,
		x: number
	): boolean {
		/** Provides if behavior. */
		if (!row.hasChildren)
			return false;

		const left =
			5 +
			row.depth * CTreeView.IndentWidth;

		return x >= left &&
			x < left + CTreeView.IndentWidth;
	}

	#paintIndicator(
		painter: CPainter,
		row: CTreeViewRow,
		x: number,
		y: number,
		color: string
	): void {
		const centerX = x + 7;
		const centerY = y + CTreeView.RowHeight / 2;

		painter.setPen(color);

		/** Provides if behavior. */
		if (this.isExpanded(row.index)) {
			painter.drawLine(
				centerX - 4,
				centerY - 2,
				centerX,
				centerY + 2
			);

			painter.drawLine(
				centerX,
				centerY + 2,
				centerX + 4,
				centerY - 2
			);
		} else {
			painter.drawLine(
				centerX - 2,
				centerY - 4,
				centerX + 2,
				centerY
			);

			painter.drawLine(
				centerX + 2,
				centerY,
				centerX - 2,
				centerY + 4
			);
		}
	}

	#ensureIndexVisible(index: CModelIndex): void {
		const row = this.#visibleRowForIndex(index);

		/** Provides if behavior. */
		if (row < 0)
			return;

		const x =
			this.#m_header.sectionPosition(index.column());

		const y =
			row * CTreeView.RowHeight;

		const right =
			x + this.#m_header.sectionSize(index.column());

		const bottom =
			y + CTreeView.RowHeight;

		const viewportWidth =
			this.viewport().width();

		const viewportHeight =
			this.viewport().height();

		let scrollX = this.scrollX();
		let scrollY = this.scrollY();

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

		this.scrollTo(scrollX, scrollY);
	}

	#pageRowCount(): number {
		return Math.max(
			1,
			Math.floor(
				this.viewport().height() /
				CTreeView.RowHeight
			)
		);
	}

	/** Returns the widget used as editor parent. */
	protected override editorParent(): CWidget {
		return this.#m_contentWidget;
	}

	/** Updates tree state after the model changes. */
	protected override modelChanged(
		_oldModel: CAbstractItemModel | null,
		newModel: CAbstractItemModel | null
	): void {
		this.#m_expandedIndexes = [];
		this.#m_header.setModel(newModel);
		this.#rebuildRows();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_header.update();
	}

	/** Rebuilds visible rows after model data changes. */
	protected override modelDataChanged(): void {
		this.#rebuildRows();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_header.update();
	}

	/** Clears expansion and rebuilds rows after a model reset. */
	protected override modelReset(): void {
		this.#m_expandedIndexes = [];
		this.#rebuildRows();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_header.update();
	}

	/** Rebuilds visible tree rows after rows are inserted or removed. */
	protected override modelRowsInserted(): void {
		this.#updateRowsAfterStructureChange();
	}

	protected override modelRowsRemoved(): void {
		this.#updateRowsAfterStructureChange();
	}

	#updateRowsAfterStructureChange(): void {
		this.#rebuildRows();
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
		this.#m_header.update();
	}

	/** Scrolls to and repaints a newly selected current index. */
	protected override currentIndexChanged(index: CModelIndex): void {
		super.currentIndexChanged(index);
		if (index.isValid())
			this.#ensureIndexVisible(index);

		this.#m_contentWidget.update();
	}

	/** Restores focus to the tree content after editing. */
	protected override editorClosed(): void {
		this.#m_contentWidget.setFocus();
		this.#m_contentWidget.update();
	}

	#updateGeometry(): void {
		const headerHeight =
			this.#m_header.sizeHint().height();

		this.#m_scrollArea.setGeometry(
			0,
			headerHeight,
			this.width(),
			Math.max(0, this.height() - headerHeight)
		);

		this.#updateContentGeometry();

		this.#m_header.setGeometry(
			0,
			0,
			this.#m_scrollArea.viewport().width(),
			headerHeight
		);
	}

	#updateContentGeometry(): void {
		const width = this.#m_header.length();
		const height = this.#m_rows.length * CTreeView.RowHeight;

		this.#m_contentWidget.resize(width, height);
		this.#m_scrollArea.updateTreeScrollBars();

		this.#m_contentWidget.resize(
			Math.max(width, this.viewport().width()),
			Math.max(height, this.viewport().height())
		);

		this.#m_scrollArea.updateTreeScrollBars();

		this.#m_header.setGeometry(0, 0, this.viewport().width(),
			this.#m_header.sizeHint().height());

		this.updateEditorGeometry();
	}

}
