import { CEventType } from "../events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CItemSelectionModel } from "../models/CItemSelectionModel.js";
import { CModelIndex } from "../models/CModelIndex.js";
import { CPainter } from "../painting/CPainter.js";
import { CScrollArea } from "./CScrollArea.js";
import { CWidget } from "./CWidget.js";

class CListViewContentWidget extends CWidget {
	#m_view: CListView;

	constructor(view: CListView) {
		super();
		this.#m_view = view;
	}

	protected override paintEvent(painter: CPainter): void {
		this.#m_view.paintItems(painter);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		this.#m_view.contentMousePressEvent(event);
	}
}

export class CListView extends CScrollArea {
	static readonly ItemHeight = 24;

	#m_model: CAbstractItemModel | null = null;
	#m_selectionModel: CItemSelectionModel | null = null;
	#m_contentWidget: CListViewContentWidget;

	#m_disconnectDataChanged: (() => void) | null = null;
	#m_disconnectModelReset: (() => void) | null = null;

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);

		this.#m_contentWidget = new CListViewContentWidget(this);
		this.setWidget(this.#m_contentWidget);

		this.#updateContentGeometry();
	}

	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	setModel(model: CAbstractItemModel | null): void {
		if (this.#m_model === model)
			return;

		this.#disconnectModel();
		this.#m_selectionModel?.destroy();

		this.#m_model = model;
		this.#m_selectionModel = model
			? new CItemSelectionModel(model, this)
			: null;

		if (model !== null) {
			this.#m_disconnectDataChanged =
				model.dataChanged.connect(() => {
					this.#m_contentWidget.update();
				});

			this.#m_disconnectModelReset =
				model.modelReset.connect(() => {
					this.#m_selectionModel?.clear();
					this.#updateContentGeometry();
					this.#m_contentWidget.update();
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
		if (index.isValid() && index.model() !== this.#m_model)
			return;

		this.#m_selectionModel?.setCurrentIndex(index);
		this.#m_contentWidget.update();
	}

	override sizeHint(): CSize {
		return new CSize(200, 160);
	}

	paintItems(painter: CPainter): void {
		if (this.#m_model === null)
			return;

		const palette = this.palette();
		const width = this.#m_contentWidget.width();

		const base = palette.color(CPaletteColorRole.Base).toCss();

		painter.setBrush(base);
		painter.setPen(base);
		painter.drawRect(0, 0, this.#m_contentWidget.width(), this.#m_contentWidget.height());

		for (let row = 0; row < this.#m_model.rowCount(); row++) {
			const index = this.#m_model.index(row, 0);
			const y = row * CListView.ItemHeight;
			const selected = this.#m_selectionModel?.isSelected(index) ?? false;

			if (selected) {
				const highlight = palette.color(CPaletteColorRole.Highlight).toCss();

				painter.setBrush(highlight);
				painter.setPen(highlight);
				painter.drawRect(0, y, width, CListView.ItemHeight);
			}

			const textColor = palette.color(
                selected ? CPaletteColorRole.HighlightedText : CPaletteColorRole.Text).toCss();

			painter.setPen(textColor);
			painter.setBrush(textColor);
			painter.setTextBaseline("middle");
            painter.setFont(this.font());

			painter.drawText(String(this.#m_model.data(index) ?? ""), 5, y + CListView.ItemHeight / 2
			);
		}
	}

	contentMousePressEvent(event: CMouseEvent): void {
		if (event.type() !== CEventType.MousePress
			|| event.button() !== CMouseButton.LeftButton
			|| this.#m_model === null)
			return;

		const row = Math.floor(
			event.pos().y() / CListView.ItemHeight
		);

		if (row < 0 || row >= this.#m_model.rowCount())
			return;

		const index = this.#m_model.index(row, 0);

		this.#m_selectionModel?.clearSelection();
		this.#m_selectionModel?.select(index);
		this.#m_selectionModel?.setCurrentIndex(index);

		event.accept();
		this.#m_contentWidget.update();
	}

	#updateContentGeometry(): void {
		const height = (this.#m_model?.rowCount() ?? 0) * CListView.ItemHeight;
		this.#m_contentWidget.resize(this.viewport().width(), Math.max(height, this.viewport().height()));
		this.updateScrollBars();
		this.#m_contentWidget.resize(this.viewport().width(), Math.max(height, this.viewport().height()));

		this.updateScrollBars();
	}

	#disconnectModel(): void {
		this.#m_disconnectDataChanged?.();
		this.#m_disconnectModelReset?.();

		this.#m_disconnectDataChanged = null;
		this.#m_disconnectModelReset = null;
	}
}