import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

export class CHeaderView extends CWidget {
	static readonly DefaultSectionWidth = 120;
	static readonly DefaultSectionHeight = 24;
	static readonly DefaultVerticalWidth = 40;
	static readonly MinimumSectionSize = 20;
	static readonly ResizeHandleMargin = 4;

	#m_orientation: COrientation;
	#m_model: CAbstractItemModel | null = null;
	#m_offset = 0;
	#m_sectionSizes: number[] = [];

	#m_resizeSection = -1;
	#m_resizeStartPosition = 0;
	#m_resizeStartSize = 0;

	readonly sectionResized =
		new CSignal<[number, number, number]>();

	constructor(orientation: COrientation,
		parent: CWidget | null = null) {
		super(parent);
		this.#m_orientation = orientation;
	}

	orientation(): COrientation {
		return this.#m_orientation;
	}

	model(): CAbstractItemModel | null {
		return this.#m_model;
	}

	setModel(model: CAbstractItemModel | null): void {
		if (this.#m_model === model)
			return;

		this.#m_model = model;
		this.#resetSectionSizes();
		this.update();
	}

	offset(): number {
		return this.#m_offset;
	}

	setOffset(offset: number): void {
		offset = Math.max(0, offset);

		if (this.#m_offset === offset)
			return;

		this.#m_offset = offset;
		this.update();
	}

	sectionSize(section: number): number {
		if (section < 0)
			return 0;

		const size = this.#m_sectionSizes[section];

		if (size !== undefined)
			return size;

		return this.#defaultSectionSize();
	}

	resizeSection(section: number, size: number): void {
		if (section < 0 || section >= this.#sectionCount())
			return;

		size = Math.max(CHeaderView.MinimumSectionSize, size);

		const oldSize = this.sectionSize(section);

		if (oldSize === size)
			return;

		this.#m_sectionSizes[section] = size;

		this.sectionResized.emit(section, oldSize, size);
		this.update();
	}

	sectionPosition(section: number): number {
		if (section <= 0)
			return 0;

		let position = 0;

		for (let i = 0; i < section; i++)
			position += this.sectionSize(i);

		return position;
	}

	sectionAt(position: number): number {
		position += this.#m_offset;

		if (position < 0)
			return -1;

		let sectionPosition = 0;

		for (let section = 0; section < this.#sectionCount(); section++) {
			const size = this.sectionSize(section);

			if (position >= sectionPosition &&
				position < sectionPosition + size)
				return section;

			sectionPosition += size;
		}

		return -1;
	}

	length(): number {
		let result = 0;

		for (let section = 0; section < this.#sectionCount(); section++)
			result += this.sectionSize(section);

		return result;
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
		const base = palette.color(
			CPaletteColorRole.Base
		).toCss();
		const text = palette.color(
			CPaletteColorRole.Text
		).toCss();

		painter.setBrush(base);
		painter.setPen(base);
		painter.drawRect(0, 0, this.width(), this.height());

		if (this.#m_model === null)
			return;

		const count = this.#sectionCount();

		painter.setFont(this.font());
		painter.setTextBaseline("middle");
		painter.setTextAlign("left");

		for (let section = 0; section < count; section++) {
			const sectionSize = this.sectionSize(section);
			const position =
				this.sectionPosition(section) - this.#m_offset;

			if (this.#m_orientation === COrientation.Horizontal) {
				if (position + sectionSize < 0 ||
					position >= this.width())
					continue;

				painter.setBrush(base);
				painter.setPen(text);
				painter.drawRect(position, 0, sectionSize, this.height());

				painter.drawText(
					String(this.#m_model.headerData(
						section, this.#m_orientation) ?? ""),
					position + 5,
					this.height() / 2
				);
			} else {
				if (position + sectionSize < 0 ||
					position >= this.height())
					continue;

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
		}
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const position = this.#eventPosition(event);
		const section = this.#sectionHandleAt(position);

		if (section < 0) {
			event.ignore();
			return;
		}

		this.#m_resizeSection = section;
		this.#m_resizeStartPosition = position;
		this.#m_resizeStartSize = this.sectionSize(section);

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		const position = this.#eventPosition(event);

		if (this.#m_resizeSection >= 0) {
			const delta = position - this.#m_resizeStartPosition;

			this.resizeSection(
				this.#m_resizeSection,
				this.#m_resizeStartSize + delta
			);

			event.accept();
			return;
		}

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

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (this.#m_resizeSection < 0) {
			event.ignore();
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

	#resetSectionSizes(): void {
		const count = this.#sectionCount();
		const size = this.#defaultSectionSize();

		this.#m_sectionSizes = [];

		for (let section = 0; section < count; section++)
			this.#m_sectionSizes.push(size);
	}

	#eventPosition(event: CMouseEvent): number {
		return this.#m_orientation === COrientation.Horizontal
			? event.x()
			: event.y();
	}

	#sectionHandleAt(position: number): number {
		position += this.#m_offset;

		let end = 0;

		for (let section = 0; section < this.#sectionCount(); section++) {
			end += this.sectionSize(section);

			if (Math.abs(position - end) <=
				CHeaderView.ResizeHandleMargin)
				return section;
		}

		return -1;
	}
}