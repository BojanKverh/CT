import { CSize } from "../geometry/CSize.js";
import { COrientation } from "../gui/COrientation.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CAbstractItemModel } from "../models/CAbstractItemModel.js";
import { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

export class CHeaderView extends CWidget {
	static readonly DefaultSectionWidth = 120;
	static readonly DefaultSectionHeight = 24;
	static readonly DefaultVerticalWidth = 40;

	#m_orientation: COrientation;
	#m_model: CAbstractItemModel | null = null;
	#m_offset = 0;

	constructor(
		orientation: COrientation,
		parent: CWidget | null = null
	) {
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

	sectionSize(_section: number): number {
		return this.#m_orientation === COrientation.Horizontal
			? CHeaderView.DefaultSectionWidth
			: CHeaderView.DefaultSectionHeight;
	}

	length(): number {
		if (this.#m_model === null)
			return 0;

		const count = this.#m_orientation === COrientation.Horizontal
			? this.#m_model.columnCount()
			: this.#m_model.rowCount();

		return count * this.sectionSize(0);
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

		const count = this.#m_orientation === COrientation.Horizontal
			? this.#m_model.columnCount()
			: this.#m_model.rowCount();

		painter.setFont(this.font());
		painter.setTextBaseline("middle");

		for (let section = 0; section < count; section++) {
			const sectionSize = this.sectionSize(section);
			const position =
				section * sectionSize - this.#m_offset;

			if (this.#m_orientation === COrientation.Horizontal) {
				if (position + sectionSize < 0
					|| position >= this.width())
					continue;

				painter.setBrush(base);
				painter.setPen(text);
				painter.drawRect(
					position,
					0,
					sectionSize,
					this.height()
				);

				painter.drawText(
					String(
						this.#m_model.headerData(
							section,
							this.#m_orientation
						) ?? ""
					),
					position + 5,
					this.height() / 2
				);
			} else {
				if (position + sectionSize < 0
					|| position >= this.height())
					continue;

				painter.setBrush(base);
				painter.setPen(text);
				painter.drawRect(
					0,
					position,
					this.width(),
					sectionSize
				);

				painter.drawText(
					String(
						this.#m_model.headerData(
							section,
							this.#m_orientation
						) ?? ""
					),
					5,
					position + sectionSize / 2
				);
			}
		}
	}
}