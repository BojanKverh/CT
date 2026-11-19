/** @module Widgets/CListView */
import { CSignal } from "../core/CSignal.js";
import type { CIcon } from "../gui/CIcon.js";
import type { CPoint } from "../geometry/CPoint.js";
import { CListViewHelper, CListViewMode } from "./CListViewHelper.js";
export { CListViewMode } from "./CListViewHelper.js";
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

	protected override mouseDoubleClickEvent(event: CMouseEvent): void {
		this.#m_view.contentMouseDoubleClickEvent(event);
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		this.#m_view.contentKeyPressEvent(event);
	}
}

/** Virtualized model-backed list supporting item selection, editing and icon layout. */
export class CListView extends CAbstractItemView {
    /** Default logical height of a list or menu entry. */
    static readonly ItemHeight = 24;
    #m_itemLayout = new CListViewHelper(CListView.ItemHeight);
    #m_iconProvider: ((index: CModelIndex) => CIcon | null) | null = null;
    /**
    * Emitted by Enter or double click in IconMode. F2 remains the editing trigger.
    * @group Signals
    */
    readonly activated = new CSignal<[CModelIndex]>();

	#m_scrollArea: CListScrollArea;
	#m_contentWidget: CListViewContentWidget;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);

		this.#m_scrollArea = new CListScrollArea(this);
		this.#m_contentWidget = new CListViewContentWidget(this);
		this.#m_scrollArea.setWidget(this.#m_contentWidget);

		this.#updateGeometry();
	}

    /**
    * Returns list or icon-grid arrangement.
    */
    viewMode(): CListViewMode { return this.#m_itemLayout.mode; }
    /**
    * Changes item arrangement and recalculates content geometry.
    */
    setViewMode(mode: CListViewMode): void {
        if (mode !== CListViewMode.ListMode && mode !== CListViewMode.IconMode) return;
        if (this.#m_itemLayout.mode === mode) return;
        this.#m_itemLayout.mode = mode;
        this.scrollTo(0, 0);
        this.#updateContentGeometry();
    }
    /**
    * Returns icon-grid cell dimensions in logical pixels.
    */
    gridSize(): CSize { return this.#m_itemLayout.gridSize(); }
    /**
    * Changes icon-grid cell dimensions and recalculates content geometry.
    */
    setGridSize(size: CSize): void { this.#m_itemLayout.setGridSize(size); this.#updateContentGeometry(); }
    /**
    * Returns the preferred icon dimensions.
    */
    iconSize(): CSize { return this.#m_itemLayout.iconSize(); }
    /**
    * Changes preferred icon dimensions and recalculates content geometry.
    */
    setIconSize(size: CSize): void { this.#m_itemLayout.setIconSize(size); this.#updateContentGeometry(); }
    /**
    * Returns the logical gap between items.
    */
    spacing(): number { return this.#m_itemLayout.spacing(); }
    /**
    * Changes item gaps and recalculates content geometry.
    */
    setSpacing(spacing: number): void { this.#m_itemLayout.setSpacing(spacing); this.#updateContentGeometry(); }

    /** Supplies icons without imposing a new data-role API on the model. */
    setIconProvider(provider: ((index: CModelIndex) => CIcon | null) | null): void {
        this.#m_iconProvider = provider;
        this.#m_contentWidget.update();
    }
    /** Returns the index at a content-widget coordinate; gaps return an invalid index. */
    indexAt(point: CPoint): CModelIndex {
        const model = this.model();
        const row = this.#m_itemLayout.rowAt(point.x(), point.y(), this.#m_contentWidget.width(), model?.rowCount() ?? 0);
        return model !== null && row >= 0 ? model.index(row, 0) : new CModelIndex();
    }

    /** Returns the item rectangle in content-widget coordinates. */
    visualRect(index: CModelIndex): CRect {
		if (!index.isValid() || index.model() !== this.model())
	        if (index.row() >= (this.model()?.rowCount() ?? 0) || index.column() !== 0) return new CRect();
        return this.#m_itemLayout.rect(index.row(), this.#m_contentWidget.width());
	}

    /**
    * Returns the clipped internal item-content viewport.
    */
    viewport(): CWidget {
		return this.#m_scrollArea.viewport();
	}

    /** Returns the list content widget. */
    widget(): CWidget {
		return this.#m_contentWidget;
	}

    /**
    * Returns the horizontal content range control.
    */
    horizontalScrollBar(): CScrollBar {
		return this.#m_scrollArea.horizontalScrollBar();
	}

    /**
    * Returns the vertical content range control.
    */
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

	override sizeHint(): CSize {
		return new CSize(200, 160);
	}

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

        const [first, end] = this.#m_itemLayout.visibleRange(
            model.rowCount(), width, this.scrollY(), this.viewport().height()
        );
        for (let row = first; row < end; ++row) {
			const index = model.index(row, 0);
			const rect = this.visualRect(index);
            const y = rect.y();
			const selected = this.selectionModel()?.isSelected(index) ?? false;

			painter.setBrush(selected ? highlight : base);
			painter.setPen(selected ? highlightedText : text);
			painter.drawRect(rect.x(), rect.y(), rect.width(), rect.height());

			const value = model.data(index);
            if (this.viewMode() === CListViewMode.IconMode) {
                this.#m_itemLayout.paintContents(painter, this, rect,
                    value === null || value === undefined ? "" : String(value), this.#m_iconProvider?.(index) ?? null);
                continue;
            }

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

		this.#m_contentWidget.setFocus();

		const index = this.viewMode() === CListViewMode.IconMode ? this.indexAt(event.pos())
            : model.index(Math.floor(event.pos().y() / CListView.ItemHeight), 0);

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

    /** Starts editing the item under a double click. */
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

		const index = this.viewMode() === CListViewMode.IconMode ? this.indexAt(event.pos())
            : model.index(Math.floor(event.pos().y() / CListView.ItemHeight), 0);

		if (!index.isValid()) {
			event.ignore();
			return;
		}

		selectionModel.clearSelection();
		selectionModel.select(index);
		selectionModel.setCurrentIndex(index);
		this.#m_contentWidget.update();
        if (this.viewMode() === CListViewMode.IconMode) this.activated.emit(index);
        else this.edit(index);
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

        if (event.key() === "Enter" && this.viewMode() === CListViewMode.IconMode) {
            if (!this.currentIndex().isValid()) { event.ignore(); return; }
            this.activated.emit(this.currentIndex()); event.accept(); return;
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
        if (this.viewMode() === CListViewMode.IconMode) {
            const next = this.#m_itemLayout.navigate(Math.max(0, row), event.key(), rows,
                this.#m_contentWidget.width(), this.viewport().height());
            if (next === null) { event.ignore(); return; }
            row = this.currentIndex().isValid() ? next : 0;
        } else {

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

        }
		const index = model.index(row, 0);

		selectionModel.clearSelection();
		selectionModel.select(index);
		selectionModel.setCurrentIndex(index);

		this.#ensureIndexVisible(index);
		this.#m_contentWidget.update();
		event.accept();
	}

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

    /** Updates list geometry after rows are inserted or removed. */
    protected override modelRowsInserted(): void {
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
	}

	protected override modelRowsRemoved(): void {
		this.#updateContentGeometry();
		this.#m_contentWidget.update();
	}

    /** Scrolls to and repaints a newly selected current index. */
    protected override currentIndexChanged(index: CModelIndex): void {
		super.currentIndexChanged(index);
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
        // Arrow buttons move by one visual row; scrollbar values stay in pixels.
        this.#m_scrollArea.verticalScrollBar().setSingleStep(
            this.viewMode() === CListViewMode.IconMode
                ? this.gridSize().height() + this.spacing()
                : CListView.ItemHeight
        );
        if (this.viewMode() === CListViewMode.IconMode) {
            const frame = this.#m_scrollArea.frameWidth();
            const size = this.#m_itemLayout.contentSize(this.model()?.rowCount() ?? 0,
                Math.max(0, this.width() - 2 * frame), Math.max(0, this.height() - 2 * frame), CScrollArea.ScrollBarExtent);
            this.#m_contentWidget.resize(size.width(), size.height());
            this.#m_scrollArea.updateListScrollBars();
            this.#m_contentWidget.resize(size.width(), Math.max(size.height(), this.viewport().height()));
            this.#m_scrollArea.updateListScrollBars();
            this.updateEditorGeometry(); this.#ensureIndexVisible(this.currentIndex()); this.#m_contentWidget.update(); return;
        }

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

		const rect = this.visualRect(index);
        const y = rect.y(), bottom = y + rect.height();
        if (this.viewMode() === CListViewMode.IconMode) {
            let x = this.scrollX();
            if (rect.x() < x) x = rect.x();
            else if (rect.x() + rect.width() > x + this.viewport().width()) x = rect.x() + rect.width() - this.viewport().width();
            this.setScrollX(x);
        }
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
