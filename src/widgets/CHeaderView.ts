/** @module Widgets/CHeaderView */
import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

/** Model-view header supporting section sizes, offsets, sorting indicators and section activation. */
export class CHeaderView extends CWidget {
    /** Default logical width of a horizontal header section. */
    static readonly DefaultSectionWidth = 120;
    /** Default logical height of a row/header section. */
    static readonly DefaultSectionHeight = 24;
    /** Default logical width reserved for a vertical header. */
    static readonly DefaultVerticalWidth = 40;
    /** Smallest logical section extent accepted during resizing. */
    static readonly MinimumSectionSize = 20;
    /** Logical distance from a section boundary used for resize hit-testing. */
    static readonly ResizeHandleMargin = 4;

	#m_orientation: COrientation;
	#m_model: CAbstractItemModel | null = null;
	#m_offset = 0;
	#m_sectionSizes = new Map<number, number>();
	#m_sectionOffsets: number[] = [];
	#m_pressedSection = -1;
	#m_sortIndicatorSection = -1;
	#m_sortIndicatorOrder = CSortOrder.AscendingOrder;
	#m_sortIndicatorShown = false;

	#m_resizeSection = -1;
	#m_resizeStartPosition = 0;
	#m_resizeStartSize = 0;
	#m_resizeNextSectionSize = 0;

    /**
    * Emitted with section index, previous logical size and new logical size.
    * @group Signals
    */
    readonly sectionResized =
		new CSignal<[number, number, number]>();

    /**
    * Emitted when a section is clicked.
    * @group Signals
    */
    readonly sectionClicked = new CSignal<[number]>();

    /**
    * Emitted when the sort indicator changes.
    * @group Signals
    */
    readonly sortIndicatorChanged =
		new CSignal<[number, CSortOrder]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param orientation Axis used for layout and interaction.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(orientation: COrientation,
		parent: CWidget | null = null) {
		super(parent);
		this.#m_orientation = orientation;
	}

    /**
    * Returns whether sections represent columns or rows.
    */
    orientation(): COrientation {
		return this.#m_orientation;
	}

    /**
    * Model providing item data for this component.
    * The initial value is `null`.
    */
    model(): CAbstractItemModel | null {
		return this.#m_model;
	}

    /**
    * Uses the model's header data and section count and recalculates header geometry.
    */
    setModel(model: CAbstractItemModel | null): void {
		if (this.#m_model === model)
			return;

		this.#m_model = model;
		this.#m_sectionSizes.clear();
		this.#m_sectionOffsets = [];
		this.update();
	}

    /**
    * Returns the logical scroll displacement represented by the header.
    */
    offset(): number {
		return this.#m_offset;
	}

    /**
    * Sets the content scroll offset represented by the header.
    */
    setOffset(offset: number): void {
		/**
		 * Returns the logical scroll displacement represented by the header.
		 */
		offset = Math.max(0, offset);

		if (this.#m_offset === offset)
			return;

		this.#m_offset = offset;
		this.update();
	}

    /** Returns the section displaying the sort indicator. */
    sortIndicatorSection(): number {
		return this.#m_sortIndicatorSection;
	}

    /** Returns the order displayed by the sort indicator. */
    sortIndicatorOrder(): CSortOrder {
		return this.#m_sortIndicatorOrder;
	}

    /**
    * Sets the section and direction displayed by the sorting marker.
    */
    setSortIndicator(section: number, order: CSortOrder): void {
		if (section < -1 || section >= this.#sectionCount())
			return;

		if (this.#m_sortIndicatorSection === section &&
			this.#m_sortIndicatorOrder === order)
			return;

		this.#m_sortIndicatorSection = section;
		this.#m_sortIndicatorOrder = order;
		this.sortIndicatorChanged.emit(section, order);
		this.update();
	}

    /** Returns whether the sort indicator is visible. */
    isSortIndicatorShown(): boolean {
		return this.#m_sortIndicatorShown;
	}

    /**
    * Shows or hides the marker without sorting model data itself.
    */
    setSortIndicatorShown(shown: boolean): void {
		if (this.#m_sortIndicatorShown === shown)
			return;

		this.#m_sortIndicatorShown = shown;
		this.update();
	}

    /**
    * Returns the logical extent of a section along the header axis.
    */
    sectionSize(section: number): number {
		if (section < 0)
			return 0;

		const size = this.#m_sectionSizes.get(section);

		if (size !== undefined)
			return size;

		return this.#defaultSectionSize();
	}

    /**
    * Changes a section extent and emits sectionResized when the stored size changes.
    */
    resizeSection(section: number, size: number): void {
		if (section < 0 || section >= this.#sectionCount())
			return;

		size = Math.max(CHeaderView.MinimumSectionSize, size);

		const oldSize = this.sectionSize(section);

		if (oldSize === size)
			return;

		if (size === this.#defaultSectionSize())
            this.#m_sectionSizes.delete(section);
        else
            this.#m_sectionSizes.set(section, size);
        this.#m_sectionOffsets = [];

		this.sectionResized.emit(section, oldSize, size);
		this.update();
	}

    /**
    * Returns a section's content position along the header axis.
    */
    sectionPosition(section: number): number {
        if (section <= 0) return 0;
        const size = this.#defaultSectionSize();
        if (this.#m_sectionSizes.size === 0) return section * size;

        const count = this.#sectionCount();
        const offsets = this.#sectionOffsets(count);
        const index = Math.min(section, count);
        return offsets[index]! + (section - index) * size;
    }

    /**
    * Finds a section at a header coordinate, or -1 when outside the section range.
    */
    sectionAt(position: number): number {
        return this.#sectionAtOffset(position + this.#m_offset, this.#sectionCount());
    }

    /**
    * Returns the total logical extent of the header's sections.
    */
    length(): number {
        return this.sectionPosition(this.#sectionCount());
    }

    #sectionAtOffset(position: number, count: number): number {
        if (position < 0 || !Number.isFinite(position) || count === 0) return -1;
        if (this.#m_sectionSizes.size === 0) {
            const section = Math.floor(position / this.#defaultSectionSize());
            return section < count ? section : -1;
        }

        const offsets = this.#sectionOffsets(count);
        if (position >= offsets[count]!) return -1;
        let first = 0;
        let last = count;
        while (first + 1 < last) {
            const middle = Math.floor((first + last) / 2);
            if (offsets[middle]! <= position) first = middle;
            else last = middle;
        }
        return first;
    }

    #sectionOffsets(count: number): number[] {
        if (this.#m_sectionOffsets.length !== count + 1) {
            const offsets = [0];
            for (let section = 0; section < count; ++section)
                offsets.push(offsets[section]! + this.sectionSize(section));
            this.#m_sectionOffsets = offsets;
        }
        return this.#m_sectionOffsets;
    }

	override sizeHint(): CSize {
		if (this.#m_orientation === COrientation.Horizontal) {
			return new CSize(
				this.length(),
				CHeaderView.DefaultSectionHeight
			);
		}

		return new CSize(
			CHeaderView.DefaultVerticalWidth,
			this.length()
		);
	}

	protected override paintEvent(painter: CPainter): void {
		const palette = this.palette();
		const base = palette.color(CPaletteColorRole.Base).toCss();
		const text = palette.color(CPaletteColorRole.Text).toCss();

		if (this.#m_model === null)
			return;

		const count = this.#sectionCount();

		painter.setFont(this.font());
		painter.setTextBaseline("middle");
		painter.setTextAlign("left");

        const horizontal = this.#m_orientation === COrientation.Horizontal;
        const extent = horizontal ? this.width() : this.height();
        const first = this.#sectionAtOffset(this.#m_offset, count);
        let position = first < 0 ? extent : this.sectionPosition(first) - this.#m_offset;
        for (let section = first; section >= 0 && section < count && position < extent; ++section) {
            const sectionSize = this.sectionSize(section);

			if (horizontal) {
				painter.setBrush(base);
				painter.setPen(text);
				painter.drawRect(position, 0, sectionSize, this.height());

				painter.drawText(
					String(this.#m_model.headerData(
						section, this.#m_orientation) ?? ""),
					position + 5,
					this.height() / 2
				);

				if (this.#m_sortIndicatorShown &&
					section === this.#m_sortIndicatorSection)
					this.#drawSortIndicator(
						painter,
						position,
						sectionSize
					);
			} else {
				painter.setBrush(base);
				painter.setPen(text);
				painter.drawRect(0, position, this.width(), sectionSize);

				painter.drawText(
					String(this.#m_model.headerData(
						section, this.#m_orientation) ?? ""),
					5,
					position + sectionSize / 2
				);
			}
            position += sectionSize;
		}

		painter.setBrush("rgba(0, 0, 0, 0)");
		painter.setPen(text);
		painter.drawRect(0, 0, this.width(), this.height());
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const position = this.#eventPosition(event);
		const section = this.#sectionHandleAt(position);

		if (section < 0) {
			const pressedSection = this.sectionAt(position);

			if (pressedSection >= 0) {
				this.#m_pressedSection = pressedSection;
				event.accept();
				return;
			}

			event.ignore();
			return;
		}

		this.#m_pressedSection = -1;
		this.#m_resizeSection = section;
		this.#m_resizeStartPosition = position;
		this.#m_resizeStartSize = this.sectionSize(section);
		this.#m_resizeNextSectionSize = this.sectionSize(section + 1);
		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		const position = this.#eventPosition(event);

		if (this.#m_resizeSection >= 0) {
			let delta = position - this.#m_resizeStartPosition;

			const minDelta =
				CHeaderView.MinimumSectionSize -
				this.#m_resizeStartSize;

			const maxDelta =
				this.#m_resizeNextSectionSize -
				CHeaderView.MinimumSectionSize;

			delta = Math.max(minDelta, Math.min(maxDelta, delta));

			const section = this.#m_resizeSection;

			this.resizeSection(
				section,
				this.#m_resizeStartSize + delta
			);

			this.resizeSection(
				section + 1,
				this.#m_resizeNextSectionSize - delta
			);

			event.accept();
			return;
		}

		const section = this.#sectionHandleAt(position);

		this.setCursor(
			section >= 0
				? this.#resizeCursor()
				: CCursorShape.Arrow
		);

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (this.#m_resizeSection < 0) {
			if (this.#m_pressedSection < 0) {
				event.ignore();
				return;
			}

			const pressedSection = this.#m_pressedSection;
			this.#m_pressedSection = -1;

			if (this.sectionAt(this.#eventPosition(event)) ===
				pressedSection)
				this.sectionClicked.emit(pressedSection);

			event.accept();
			return;
		}

		this.#m_resizeSection = -1;

		const position = this.#eventPosition(event);
		const section = this.#sectionHandleAt(position);

		if (section >= 0) {
			this.setCursor(
				this.#m_orientation === COrientation.Horizontal
					? CCursorShape.SplitH
					: CCursorShape.SplitV
			);
		} else {
			this.setCursor(CCursorShape.Arrow);
		}

		event.accept();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		if (this.#m_resizeSection < 0)
			this.setCursor(CCursorShape.Arrow);

		super.mouseLeaveEvent(event);
	}

	#sectionCount(): number {
		if (this.#m_model === null)
			return 0;

		return this.#m_orientation === COrientation.Horizontal
			? this.#m_model.columnCount()
			: this.#m_model.rowCount();
	}

	#defaultSectionSize(): number {
		return this.#m_orientation === COrientation.Horizontal
			? CHeaderView.DefaultSectionWidth
			: CHeaderView.DefaultSectionHeight;
	}

	#eventPosition(event: CMouseEvent): number {
		return this.#m_orientation === COrientation.Horizontal
			? event.x()
			: event.y();
	}

	#sectionHandleAt(position: number): number {
		position += this.#m_offset;

		let end = 0;
		const count = this.#sectionCount();

		for (let section = 0; section < count - 1; section++) {
			end += this.sectionSize(section);

			if (Math.abs(position - end) <=
				CHeaderView.ResizeHandleMargin)
				return section;
		}

		return -1;
	}

	#resizeCursor(): CCursorShape {
		return this.#m_orientation === COrientation.Horizontal
			? CCursorShape.SplitH
			: CCursorShape.SplitV;
	}

	#drawSortIndicator(
		painter: CPainter,
		position: number,
		sectionSize: number
	): void {
		const centerX = position + sectionSize - 12;
		const centerY = this.height() / 2;
		const direction = this.#m_sortIndicatorOrder ===
			CSortOrder.AscendingOrder ? -1 : 1;
		const tipY = centerY + direction * 3;
		const baseY = centerY - direction * 3;

		painter.drawLine(centerX - 4, baseY, centerX, tipY);
		painter.drawLine(centerX, tipY, centerX + 4, baseY);
	}
}
