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
	}

	protected override paintEvent(painter: CPainter): void {
		this.#m_view.paintCells(painter);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		this.#m_view.contentMousePressEvent(event);
	}
}

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

	#m_disconnectDataChanged: (() => void) | null = null;
	#m_disconnectModelReset: (() => void) | null = null;

	constructor(parent: CWidget | null = null) {
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
	}

	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	setModel(model: CAbstractItemModel | null): void {
		if (this.#m_model === model)
			return;

		this.#disconnectModel();

		if (this.#m_selectionModel !== null) {
			this.#m_selectionModel.destroy();
			this.#m_selectionModel = null;
		}

		this.#m_model = model;

		this.#m_horizontalHeader.setModel(model);
		this.#m_verticalHeader.setModel(model);

		if (model !== null) {
			this.#m_selectionModel =
				new CItemSelectionModel(model, this);

			this.#m_disconnectDataChanged =
				model.dataChanged.connect(() => {
					this.#m_contentWidget.update();
				});

			this.#m_disconnectModelReset =
				model.modelReset.connect(() => {
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

	selectionModel(): CItemSelectionModel | null {
		return this.#m_selectionModel;
	}

	currentIndex(): CModelIndex {
		return this.#m_selectionModel?.currentIndex()
			?? new CModelIndex();
	}

	setCurrentIndex(index: CModelIndex): void {
		if (this.#m_selectionModel === null)
			return;

		if (index.isValid() && index.model() !== this.#m_model)
			return;

		this.#m_selectionModel.setCurrentIndex(index);
		this.#m_contentWidget.update();
	}

	horizontalHeader(): CHeaderView {
		return this.#m_horizontalHeader;
	}

	verticalHeader(): CHeaderView {
		return this.#m_verticalHeader;
	}

	viewport(): CWidget {
		return this.#m_scrollArea.viewport();
	}

	horizontalScrollBar(): CScrollBar {
		return this.#m_scrollArea.horizontalScrollBar();
	}

	verticalScrollBar(): CScrollBar {
		return this.#m_scrollArea.verticalScrollBar();
	}

	scrollX(): number {
		return this.#m_scrollArea.scrollX();
	}

	scrollY(): number {
		return this.#m_scrollArea.scrollY();
	}

	setScrollX(x: number): void {
		this.#m_scrollArea.setScrollX(x);
	}

	setScrollY(y: number): void {
		this.#m_scrollArea.setScrollY(y);
	}

	scrollTo(x: number, y: number): void {
		this.#m_scrollArea.scrollTo(x, y);
	}

	override sizeHint(): CSize {
		return new CSize(400, 240);
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

	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	paintCells(painter: CPainter): void {
		const model = this.#m_model;

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

		for (let row = 0; row < model.rowCount(); row++) {
			for (
				let column = 0;
				column < model.columnCount();
				column++
			) {
				const index = model.index(row, column);

				const x =
					column * CTableView.ColumnWidth;

				const y =
					row * CTableView.RowHeight;

				const selected =
					this.#m_selectionModel?.isSelected(index)
						?? false;

				painter.setBrush(
					selected ? highlight : base
				);

				painter.setPen(
					selected ? highlightedText : text
				);

				painter.drawRect(
					x,
					y,
					CTableView.ColumnWidth,
					CTableView.RowHeight
				);

				const value = model.data(index);

				painter.drawText(
					value === null || value === undefined
						? ""
						: String(value),
					x + 5,
					y + CTableView.RowHeight / 2
				);
			}
		}
	}

	contentMousePressEvent(event: CMouseEvent): void {
		if (event.type() !== CEventType.MousePress
			|| event.button() !== CMouseButton.LeftButton
			|| this.#m_model === null
			|| this.#m_selectionModel === null) {
			event.ignore();
			return;
		}

		const column = Math.floor(
			event.pos().x()
				/ CTableView.ColumnWidth
		);

		const row = Math.floor(
			event.pos().y()
				/ CTableView.RowHeight
		);

		const index =
			this.#m_model.index(row, column);

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
		const rows =
			this.#m_model?.rowCount() ?? 0;

		const columns =
			this.#m_model?.columnCount() ?? 0;

		const width =
			columns * CTableView.ColumnWidth;

		const height =
			rows * CTableView.RowHeight;

		this.#m_contentWidget.resize(
			Math.max(
				width,
				this.#m_scrollArea.viewport().width()
			),
			Math.max(
				height,
				this.#m_scrollArea.viewport().height()
			)
		);

		this.#m_scrollArea.updateTableScrollBars();

		this.#m_contentWidget.resize(
			Math.max(
				width,
				this.#m_scrollArea.viewport().width()
			),
			Math.max(
				height,
				this.#m_scrollArea.viewport().height()
			)
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
		if (this.#m_disconnectDataChanged !== null) {
			this.#m_disconnectDataChanged();
			this.#m_disconnectDataChanged = null;
		}

		if (this.#m_disconnectModelReset !== null) {
			this.#m_disconnectModelReset();
			this.#m_disconnectModelReset = null;
		}
	}
}