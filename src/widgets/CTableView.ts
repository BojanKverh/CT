import { CEventType } from "../events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CItemSelectionModel } from "../models/CItemSelectionModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CHeaderView } from "./CHeaderView.js";
import { CScrollArea } from "./CScrollArea.js";
import { CScrollBar } from "./CScrollBar.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractItemDelegate } from "./CAbstractItemDelegate.js";
import { CItemDelegate } from "./CItemDelegate.js";

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

	protected override keyPressEvent(event: CKeyEvent): void {
		this.#m_view.contentKeyPressEvent(event);
	}
}

/** Implements the table view widget. */
export class CTableView extends CWidget {
	static readonly RowHeight =
		CHeaderView.DefaultSectionHeight;

	static readonly ColumnWidth =
		CHeaderView.DefaultSectionWidth;

	#m_model: CAbstractItemModel | null = null;
	#m_selectionModel: CItemSelectionModel | null = null;

	#m_horizontalHeader: CHeaderView;
	#m_verticalHeader: CHeaderView;
	#m_scrollArea: CTableScrollArea;
	#m_contentWidget: CTableViewContentWidget;

	#m_itemDelegate: CAbstractItemDelegate;
	#m_rowDelegates = new Map<number, CAbstractItemDelegate>();
	#m_columnDelegates = new Map<number, CAbstractItemDelegate>();
	#m_connectedDelegates = new Set<CAbstractItemDelegate>();

	#m_editor: CWidget | null = null;
	#m_editorIndex = new CModelIndex();
	#m_editorDelegate: CAbstractItemDelegate | null = null;

	#m_disconnectDataChanged: (() => void) | null = null;
	#m_disconnectModelReset: (() => void) | null = null;

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

		this.#m_itemDelegate = new CItemDelegate(this);
		this.#connectDelegate(this.#m_itemDelegate);

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
			this.#updateEditorGeometry();
			this.#m_contentWidget.update();
		});
	}

	/** Provides model behavior. */
	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	/** Sets the model. */
	setModel(model: CAbstractItemModel | null): void {
		/** Provides if behavior. */
		if (this.#m_model === model)
			return;

		this.#closeEditor();
		this.#disconnectModel();

		/** Provides if behavior. */
		if (this.#m_selectionModel !== null) {
			this.#m_selectionModel.destroy();
			this.#m_selectionModel = null;
		}

		this.#m_model = model;

		this.#m_horizontalHeader.setModel(model);
		this.#m_verticalHeader.setModel(model);

		/** Provides if behavior. */
		if (model !== null) {
			this.#m_selectionModel =
				new CItemSelectionModel(model, this);

			this.#m_disconnectDataChanged =
				model.dataChanged.connect(() => {
					this.#m_contentWidget.update();
				});

			this.#m_disconnectModelReset =
				model.modelReset.connect(() => {
					this.#closeEditor();
					this.#m_selectionModel?.clear();
					this.#updateContentGeometry();
					this.#m_contentWidget.update();
					this.#m_horizontalHeader.update();
					this.#m_verticalHeader.update();
				});
		}

		this.#updateContentGeometry();
		this.update();
	}

	/** Provides selection model behavior. */
	selectionModel(): CItemSelectionModel | null {
		return this.#m_selectionModel;
	}

	/** Returns the default item delegate. */
	itemDelegate(): CAbstractItemDelegate {
		return this.#m_itemDelegate;
	}

	/** Sets the default item delegate. */
	setItemDelegate(delegate: CAbstractItemDelegate): void {
		if (this.#m_itemDelegate === delegate)
			return;

		this.#closeEditor();
		this.#m_itemDelegate = delegate;
		this.#connectDelegate(delegate);
	}

	/** Sets the delegate used for a row. */
	setItemDelegateForRow(
		row: number,
		delegate: CAbstractItemDelegate | null
	): void {
		this.#closeEditor();

		if (delegate === null) {
			this.#m_rowDelegates.delete(row);
			return;
		}

		this.#m_rowDelegates.set(row, delegate);
		this.#connectDelegate(delegate);
	}

	/** Sets the delegate used for a column. */
	setItemDelegateForColumn(
		column: number,
		delegate: CAbstractItemDelegate | null
	): void {
		this.#closeEditor();

		if (delegate === null) {
			this.#m_columnDelegates.delete(column);
			return;
		}

		this.#m_columnDelegates.set(column, delegate);
		this.#connectDelegate(delegate);
	}

	/** Returns the delegate used for an index. */
	itemDelegateForIndex(index: CModelIndex): CAbstractItemDelegate {
		return this.#m_rowDelegates.get(index.row())
			?? this.#m_columnDelegates.get(index.column())
			?? this.#m_itemDelegate;
	}

	/**
	 * Returns the item rectangle in content-widget coordinates.
	 */
	visualRect(index: CModelIndex): CRect {
		if (!index.isValid() || index.model() !== this.#m_model)
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
	 * Starts editing an item through its delegate.
	 *
	 * @returns `true` when an editor was created.
	 */
	edit(index: CModelIndex): boolean {
		const model = this.#m_model;

		if (model === null
			|| !index.isValid()
			|| index.model() !== model
			|| !model.isEditable(index)) {
			return false;
		}

		if (this.#m_editor !== null) {
			if (this.#m_editorIndex.equals(index))
				return true;

			this.#commitEditor(this.#m_editor);
			this.#closeEditor();
		}

		const delegate = this.itemDelegateForIndex(index);
		const editor = delegate.createEditor(
			this.#m_contentWidget,
			index
		);

		if (editor === null)
			return false;

		this.#m_editor = editor;
		this.#m_editorIndex = index;
		this.#m_editorDelegate = delegate;

		delegate.setEditorData(editor, index);
		delegate.updateEditorGeometry(editor, this.visualRect(index));
		editor.show();
		editor.setFocus();

		return true;
	}

	/** Returns the current index. */
	currentIndex(): CModelIndex {
		return this.#m_selectionModel?.currentIndex()
			?? new CModelIndex();
	}

	/** Sets the current index. */
	setCurrentIndex(index: CModelIndex): void {
		/** Provides if behavior. */
		if (this.#m_selectionModel === null)
			return;

		/** Provides if behavior. */
		if (index.isValid() && index.model() !== this.#m_model)
			return;

		this.#m_selectionModel.setCurrentIndex(index);

		/** Provides if behavior. */
		if (index.isValid())
			this.#ensureIndexVisible(index);

		this.#m_contentWidget.update();
	}

	/** Provides horizontal header behavior. */
	horizontalHeader(): CHeaderView {
		return this.#m_horizontalHeader;
	}

	/** Provides vertical header behavior. */
	verticalHeader(): CHeaderView {
		return this.#m_verticalHeader;
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
		const model = this.#m_model;

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
				const selected = this.#m_selectionModel?.isSelected(index) ?? false;

				painter.setBrush(selected ? highlight : base);
				painter.setPen(selected ? highlightedText : text);
				painter.drawRect(x, y, width, CTableView.RowHeight);

				const value = model.data(index);

				painter.save();
				painter.clipRect(new CRect(x, y, width, CTableView.RowHeight));
				painter.drawText(value === null || value === undefined? "" : String(value),
					x + 5, y + CTableView.RowHeight / 2);
				painter.restore();
			}
		}
	}

	/** Handles the content mouse press event. */
	contentMousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.type() !== CEventType.MousePress
			|| event.button() !== CMouseButton.LeftButton
			|| this.#m_model === null
			|| this.#m_selectionModel === null) {
			event.ignore();
			return;
		}

		const column = this.#m_horizontalHeader.sectionAt(event.pos().x());

		const row = Math.floor(
			event.pos().y()
				/ CTableView.RowHeight
		);

		const index =
			this.#m_model.index(row, column);

		/** Provides if behavior. */
		if (!index.isValid()) {
			event.ignore();
			return;
		}

		this.#m_selectionModel.clearSelection();
		this.#m_selectionModel.select(index);
		this.#m_selectionModel.setCurrentIndex(index);

		this.#m_contentWidget.update();
		event.accept();
	}

	/** Handles the content key press event. */
	contentKeyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (this.#m_model === null
			|| this.#m_selectionModel === null) {
			event.ignore();
			return;
		}

		if (event.key() === "F2" || event.key() === "Enter") {
			if (this.edit(this.currentIndex())) {
				event.accept();
				return;
			}
		}

		const rows = this.#m_model.rowCount();
		const columns = this.#m_model.columnCount();

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

		const index = this.#m_model.index(row, column);

		this.#m_selectionModel.clearSelection();
		this.#m_selectionModel.select(index);
		this.#m_selectionModel.setCurrentIndex(index);

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
		const rows = this.#m_model?.rowCount() ?? 0;
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

	#disconnectModel(): void {
		/** Provides if behavior. */
		if (this.#m_disconnectDataChanged !== null) {
			this.#m_disconnectDataChanged();
			this.#m_disconnectDataChanged = null;
		}

		/** Provides if behavior. */
		if (this.#m_disconnectModelReset !== null) {
			this.#m_disconnectModelReset();
			this.#m_disconnectModelReset = null;
		}
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

	#connectDelegate(delegate: CAbstractItemDelegate): void {
		if (this.#m_connectedDelegates.has(delegate))
			return;

		this.#m_connectedDelegates.add(delegate);

		delegate.commitData.connect(editor => {
			this.#commitEditor(editor);
		});

		delegate.closeEditor.connect(editor => {
			if (editor === this.#m_editor)
				this.#closeEditor();
		});
	}

	#commitEditor(editor: CWidget): void {
		if (editor !== this.#m_editor
			|| this.#m_model === null
			|| this.#m_editorDelegate === null
			|| !this.#m_editorIndex.isValid()) {
			return;
		}

		this.#m_editorDelegate.setModelData(
			editor,
			this.#m_model,
			this.#m_editorIndex
		);
	}

	#closeEditor(): void {
		const editor = this.#m_editor;

		if (editor === null)
			return;

		this.#m_editor = null;
		this.#m_editorIndex = new CModelIndex();
		this.#m_editorDelegate = null;

		editor.destroy();
		this.#m_contentWidget.setFocus();
		this.#m_contentWidget.update();
	}

	#updateEditorGeometry(): void {
		if (this.#m_editor === null
			|| this.#m_editorDelegate === null
			|| !this.#m_editorIndex.isValid()) {
			return;
		}

		this.#m_editorDelegate.updateEditorGeometry(
			this.#m_editor,
			this.visualRect(this.#m_editorIndex)
		);
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
}