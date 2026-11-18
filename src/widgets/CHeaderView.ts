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

/** Implements the header view widget. */
export class CHeaderView extends CWidget {
	static readonly DefaultSectionWidth = 120;
	static readonly DefaultSectionHeight = 24;
	static readonly DefaultVerticalWidth = 40;
	static readonly MinimumSectionSize = 20;
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

	/** Public section resized member. */
	readonly sectionResized =
		new CSignal<[number, number, number]>();

	/** Emitted when a section is clicked. */
	readonly sectionClicked = new CSignal<[number]>();

	/** Emitted when the sort indicator changes. */
	readonly sortIndicatorChanged =
		new CSignal<[number, CSortOrder]>();

	/** Creates a new instance. */
	constructor(orientation: COrientation,
		parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		this.#m_orientation = orientation;
	}

	/**
	 * Reads the orientation.
	 * @returns The orientation.
	 */
	orientation(): COrientation {
		return this.#m_orientation;
	}

	/**
	 * Reads the model.
	 * @returns The model.
	 */
	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	/**
	 * Sets the model.
	 * @param model Model.
	 */
	setModel(model: CAbstractItemModel | null): void {
		/** Provides if behavior. */
		if (this.#m_model === model)
			return;

		this.#m_model = model;
		this.#m_sectionSizes.clear();
		this.#m_sectionOffsets = [];
		this.update();
	}

	/**
	 * Reads the offset.
	 * @returns The offset.
	 */
	offset(): number {
		return this.#m_offset;
	}

	/**
	 * Sets the offset.
	 * @param offset Offset.
	 */
	setOffset(offset: number): void {
		offset = Math.max(0, offset);

		/** Provides if behavior. */
		if (this.#m_offset === offset)
			return;

		this.#m_offset = offset;
		this.update();
	}

	/**
	 * Returns the section displaying the sort indicator.
	 * @returns The sort indicator section.
	 */
	sortIndicatorSection(): number {
		return this.#m_sortIndicatorSection;
	}

	/**
	 * Returns the order displayed by the sort indicator.
	 * @returns The sort indicator order.
	 */
	sortIndicatorOrder(): CSortOrder {
		return this.#m_sortIndicatorOrder;
	}

	/**
	 * Sets the section and order displayed by the sort indicator.
	 * @param section Section.
	 * @param order Order.
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

	/**
	 * Returns whether the sort indicator is visible.
	 * @returns `true` if the header view is sort indicator shown, otherwise `false`.
	 */
	isSortIndicatorShown(): boolean {
		return this.#m_sortIndicatorShown;
	}

	/**
	 * Sets whether the sort indicator is visible.
	 * @param shown Shown flag.
	 */
	setSortIndicatorShown(shown: boolean): void {
		if (this.#m_sortIndicatorShown === shown)
			return;

		this.#m_sortIndicatorShown = shown;
		this.update();
	}

	/**
	 * Reads a section's explicit size or its default size along the header axis.
	 * @param section Zero-based section index.
	 * @returns Section size in logical pixels, or zero for a negative index.
	 */
	sectionSize(section: number): number {
		/** Provides if behavior. */
		if (section < 0)
			return 0;

		const size = this.#m_sectionSizes.get(section);

		/** Provides if behavior. */
		if (size !== undefined)
			return size;

		return this.#defaultSectionSize();
	}

	/**
	 * Updates the size of a valid header section, invalidates offsets and emits `sectionResized` when the size changes.
	 * @param section Zero-based section index.
	 * @param size Requested length along the header axis, clamped to the minimum section size.
	 */
	resizeSection(section: number, size: number): void {
		/** Provides if behavior. */
		if (section < 0 || section >= this.#sectionCount())
			return;

		size = Math.max(CHeaderView.MinimumSectionSize, size);

		const oldSize = this.sectionSize(section);

		/** Provides if behavior. */
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
     * Returns the position of a section before applying the scroll offset.
     * @param section Section.
     * @returns The section position.
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
     * Hit-tests the header along its orientation axis, taking the scroll offset into account.
     * @param position Position in local header coordinates along the horizontal or vertical axis.
     * @returns Zero-based section index, or `-1` if no section contains the position.
     */
    sectionAt(position: number): number {
        return this.#sectionAtOffset(position + this.#m_offset, this.#sectionCount());
    }

    /**
     * Returns the total length of all sections.
     * @returns The length.
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

	/**
	 * Returns the preferred size of the widget.
	 * @returns The size hint.
	 */
	override sizeHint(): CSize {
		/** Provides if behavior. */
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

	/**
	 * Draws the header view through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const palette = this.palette();
		const base = palette.color(CPaletteColorRole.Base).toCss();
		const text = palette.color(CPaletteColorRole.Text).toCss();

		/** Provides if behavior. */
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

			/** Provides if behavior. */
			if (horizontal) {
				painter.setBrush(base);
				painter.setPen(text);
				painter.drawRect(position, 0, sectionSize, this.height());

				painter.drawText(
					/** Provides string behavior. */
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
					/** Provides string behavior. */
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

	/**
	 * Responds to a pointer button press for the header view. May update the pressed section, the resize section, the resize start position, the resize start size. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const position = this.#eventPosition(event);
		const section = this.#sectionHandleAt(position);

		/** Provides if behavior. */
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

	/**
	 * Responds to pointer movement for the header view. May accept the event.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		const position = this.#eventPosition(event);

		/** Provides if behavior. */
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

	/**
	 * Responds to a pointer button release for the header view. May update the pressed section, the resize section. May accept or ignore the event depending on the input. May emit `sectionClicked`.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
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

		/** Provides if behavior. */
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

	/**
	 * Responds to pointer exit for the header view.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (this.#m_resizeSection < 0)
			this.setCursor(CCursorShape.Arrow);

		super.mouseLeaveEvent(event);
	}

	#sectionCount(): number {
		/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (let section = 0; section < count - 1; section++) {
			end += this.sectionSize(section);

			/** Provides if behavior. */
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
