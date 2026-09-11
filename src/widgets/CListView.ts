import { CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractItemView } from "./CAbstractItemView.js";
import { CScrollArea } from "./CScrollArea.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWidget } from "./CWidget.js";

class CListScrollArea extends CScrollArea {
	updateListScrollBars(): void {
		this.updateScrollBars();
	}
}

class CListViewContentWidget extends CWidget {
	#m_view: CListView;

	constructor(view: CListView) {
		super();
		this.#m_view = view;
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	protected override paintEvent(painter: CPainter): void {
		this.#m_view.paintItems(painter);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		this.#m_view.contentMousePressEvent(event);
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		this.#m_view.contentKeyPressEvent(event);
	}
}

/** Implements the list view widget. */
export class CListView extends CAbstractItemView {
	static readonly ItemHeight = 24;

	#m_scrollArea: CListScrollArea;
	#m_contentWidget: CListViewContentWidget;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);

		this.#m_scrollArea = new CListScrollArea(this);
		this.#m_contentWidget = new CListViewContentWidget(this);
		this.#m_scrollArea.setWidget(this.#m_contentWidget);

		this.#updateGeometry();
	}

	/** Returns the item rectangle in content-widget coordinates. */
	visualRect(index: CModelIndex): CRect {
		if (!index.isValid() || index.model() !== this.model())
			return new CRect();

		return new CRect(
			0,
			index.row() * CListView.ItemHeight,
			this.#m_contentWidget.width(),
			CListView.ItemHeight
		);
	}

	/** Returns the viewport widget. */
	viewport(): CWidget {
		return this.#m_scrollArea.viewport();
	}

	/** Returns the horizontal scroll bar. */
	horizontalScrollBar(): CScrollBar {
		return this.#m_scrollArea.horizontalScrollBar();
	}

	/** Returns the vertical scroll bar. */
	verticalScrollBar(): CScrollBar {
		return this.#m_scrollArea.verticalScrollBar();
	}

	/** Returns the horizontal scroll position. */
	scrollX(): number {
		return this.#m_scrollArea.scrollX();
	}

	/** Returns the vertical scroll position. */
	scrollY(): number {
		return this.#m_scrollArea.scrollY();
	}

	/** Sets the horizontal scroll position. */
	setScrollX(x: number): void {
		this.#m_scrollArea.setScrollX(x);
	}

	/** Sets the vertical scroll position. */
	setScrollY(y: number): void {
		this.#m_scrollArea.setScrollY(y);
	}

	/** Scrolls to the supplied content position. */
	scrollTo(x: number, y: number): void {
		this.#m_scrollArea.scrollTo(x, y);
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(200, 160);
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

	/** Resizes the view. */
	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	/** Paints the list items. */
	paintItems(painter: CPainter): void {
		const model = this.model();

		if (model === null)
			return;

		const palette = this.palette();
		const width = this.#m_contentWidget.width();
		const base = palette.color(CPaletteColorRole.Base).toCss();
		const text = palette.color(CPaletteColorRole.Text).toCss();
		const highlight = palette.color(CPaletteColorRole.Highlight).toCss();
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

		for (let row = 0; row < model.rowCount(); row++) {
			const index = model.index(row, 0);
			const y = row * CListView.ItemHeight;
			const selected = this.selectionModel()?.isSelected(index) ?? false;

			painter.setBrush(selected ? highlight : base);
			painter.setPen(selected ? highlightedText : text);
			painter.drawRect(0, y, width, CListView.ItemHeight);

			const value = model.data(index);

			painter.save();
			painter.clipRect(new CRect(0, y, width, CListView.ItemHeight));
			painter.drawText(
				value === null || value === undefined ? "" : String(value),
				5,
				y + CListView.ItemHeight / 2
			);
			painter.restore();
		}
	}

	/** Handles a mouse press in the list content. */
	contentMousePressEvent(event: CMouseEvent): void {
		const model = this.model();
		const selectionModel = this.selectionModel();

		if (event.type() !== CEventType.MousePress
			|| event.button() !== CMouseButton.LeftButton
			|| model === null
			|| selectionModel === null) {
			event.ignore();
			return;
		}

		const row = Math.floor(event.pos().y() / CListView.ItemHeight);
		const index = model.index(row, 0);

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

	/** Handles keyboard navigation and editing in the list content. */
	contentKeyPressEvent(event: CKeyEvent): void {
		const model = this.model();
		const selectionModel = this.selectionModel();

		if (model === null || selectionModel === null) {
			event.ignore();
			return;
		}

		if (event.key() === "F2" || event.key() === "Enter") {
			if (this.edit(this.currentIndex())) {
				event.accept();
				return;
			}
		}

		const rows = model.rowCount();

		if (rows === 0) {
			event.ignore();
			return;
		}

		let row = this.currentIndex().row();

		if (!this.currentIndex().isValid()) {
			row = 0;
		} else {
			switch (event.key()) {
				case "ArrowUp":
					row = Math.max(0, row - 1);
					break;

				case "ArrowDown":
					row = Math.min(rows - 1, row + 1);
					break;

				case "Home":
					row = 0;
					break;

				case "End":
					row = rows - 1;
					break;

				case "PageUp":
					row = Math.max(0, row - this.#pageItemCount());
					break;

				case "PageDown":
					row = Math.min(rows - 1, row + this.#pageItemCount());
					break;

				default:
					event.ignore();
					return;
			}
		}

		const index = model.index(row, 0);

		selectionModel.clearSelection();
		selectionModel.select(index);
		selectionModel.setCurrentIndex(index);

		this.#ensureIndexVisible(index);
		this.#m_contentWidget.update();
		event.accept();
	}

	/** Returns the widget used as editor parent. */
	protected override editorParent(): CWidget {
		return this.#m_contentWidget;
	}

	/** Updates list state after the model changes. */
	protected override modelChanged(
		_oldModel: CAbstractItemModel | null,
		_newModel: CAbstractItemModel | null
	): void {
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
	}

	/** Repaints list items after model data changes. */
	protected override modelDataChanged(): void {
		this.#m_contentWidget.update();
	}

	/** Updates list geometry after a model reset. */
	protected override modelReset(): void {
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
	}

	/** Scrolls to and repaints a newly selected current index. */
	protected override currentIndexChanged(index: CModelIndex): void {
		if (index.isValid())
			this.#ensureIndexVisible(index);

		this.#m_contentWidget.update();
	}

	/** Restores focus to the list content after editing. */
	protected override editorClosed(): void {
		this.#m_contentWidget.setFocus();
		this.#m_contentWidget.update();
	}

	#updateGeometry(): void {
		this.#m_scrollArea.setGeometry(0, 0, this.width(), this.height());
		this.#updateContentGeometry();
	}

	#updateContentGeometry(): void {
		const height = (this.model()?.rowCount() ?? 0) * CListView.ItemHeight;

		this.#m_contentWidget.resize(
			this.viewport().width(),
			Math.max(height, this.viewport().height())
		);
		this.#m_scrollArea.updateListScrollBars();
		this.#m_contentWidget.resize(
			this.viewport().width(),
			Math.max(height, this.viewport().height())
		);
		this.#m_scrollArea.updateListScrollBars();
		this.updateEditorGeometry();
	}

	#ensureIndexVisible(index: CModelIndex): void {
		if (!index.isValid())
			return;

		const y = index.row() * CListView.ItemHeight;
		const bottom = y + CListView.ItemHeight;
		const viewportHeight = this.viewport().height();
		let scrollY = this.scrollY();

		if (y < scrollY)
			scrollY = y;
		else if (bottom > scrollY + viewportHeight)
			scrollY = bottom - viewportHeight;

		this.setScrollY(scrollY);
	}

	#pageItemCount(): number {
		return Math.max(
			1,
			Math.floor(this.viewport().height() / CListView.ItemHeight)
		);
	}
}
