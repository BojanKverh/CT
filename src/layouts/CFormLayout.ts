import { CAlignment } from "../core/CAlignment.js";
import { CSize } from "../geometry/CSize.js";
import { CLabel } from "../widgets/CLabel.js";
import type { CWidget } from "../widgets/CWidget.js";
import { CLayout } from "./CLayout.js";
import { CWidgetItem } from "./CWidgetItem.js";

export enum CFormLayoutItemRole {
	LabelRole,
	FieldRole,
	SpanningRole
}

interface CFormLayoutRow {
	labelItem: CWidgetItem | null;
	fieldItem: CWidgetItem | null;
	spanningItem: CWidgetItem | null;
}

export class CFormLayout extends CLayout {
	#m_rows: CFormLayoutRow[] = [];

	#m_horizontalSpacing: number | null = null;
	#m_verticalSpacing: number | null = null;

	addRow(labelText: string, field: CWidget): void;
	addRow(label: CWidget, field: CWidget): void;
	addRow(widget: CWidget): void;

	addRow(
		labelOrWidget: string | CWidget,
		field?: CWidget
	): void {
		if (field === undefined) {
			const widget = labelOrWidget as CWidget;
			const item = new CWidgetItem(widget);

			this.#m_rows.push({
				labelItem: null,
				fieldItem: null,
				spanningItem: item
			});

			if (!this.addItem(item))
				this.#m_rows.pop();

			return;
		}

		let label: CWidget;

		if (typeof labelOrWidget === "string") {
			const textLabel = new CLabel();

			textLabel.setText(labelOrWidget);
			textLabel.setAlignment(
				CAlignment.Right | CAlignment.VCenter
			);

			label = textLabel;
		} else {
			label = labelOrWidget;
		}

		const labelItem = new CWidgetItem(label);
		const fieldItem = new CWidgetItem(field);

		this.#m_rows.push({
			labelItem,
			fieldItem,
			spanningItem: null
		});

		if (!this.addItem(labelItem)) {
			this.#m_rows.pop();
			return;
		}

		if (!this.addItem(fieldItem)) {
			this.#m_rows.pop();
			this.removeWidget(label);
			return;
		}
	}

	rowCount(): number {
		return this.#m_rows.length;
	}

	horizontalSpacing(): number {
		return this.#m_horizontalSpacing ?? this.spacing();
	}

	setHorizontalSpacing(spacing: number): void {
		spacing = Math.max(0, spacing);

		if (this.#m_horizontalSpacing === spacing)
			return;

		this.#m_horizontalSpacing = spacing;
		this.update();
	}

	verticalSpacing(): number {
		return this.#m_verticalSpacing ?? this.spacing();
	}

	setVerticalSpacing(spacing: number): void {
		spacing = Math.max(0, spacing);

		if (this.#m_verticalSpacing === spacing)
			return;

		this.#m_verticalSpacing = spacing;
		this.update();
	}

	override widgetAt(index: number): CWidget | null;
	override widgetAt(row: number, role: CFormLayoutItemRole): CWidget | null;

	override widgetAt(
		indexOrRow: number,
		role?: CFormLayoutItemRole
	): CWidget | null {
		if (role === undefined)
			return super.widgetAt(indexOrRow);

		const row = this.#m_rows[indexOrRow];

		if (row === undefined)
			return null;

		switch (role) {
			case CFormLayoutItemRole.LabelRole:
				return row.labelItem?.widget() ?? null;

			case CFormLayoutItemRole.FieldRole:
				return row.fieldItem?.widget() ?? null;

			case CFormLayoutItemRole.SpanningRole:
				return row.spanningItem?.widget() ?? null;
		}

		return null;
	}

	override clear(): void {
		this.#m_rows.length = 0;
		super.clear();
	}

	override update(): void {
		const parent = this.parentWidget();

		if (parent === null || this.#m_rows.length === 0)
			return;

		const margins = this.contentsMargins();
		const horizontalSpacing = this.horizontalSpacing();
		const verticalSpacing = this.verticalSpacing();

		const contentWidth = Math.max(
			0,
			parent.width() - margins.left - margins.right
		);

		const labelWidth = this.#labelColumnWidth();
		const hasLabelColumn = labelWidth > 0;

		const fieldX = margins.left + labelWidth +
			(hasLabelColumn ? horizontalSpacing : 0);

		const fieldWidth = Math.max(
			0,
			contentWidth - labelWidth -
				(hasLabelColumn ? horizontalSpacing : 0)
		);

		let y = margins.top;

		for (const row of this.#m_rows) {
			const spanning = row.spanningItem?.widget() ?? null;

			if (spanning !== null) {
				const height = this.#preferredHeight(spanning);

				spanning.setGeometry(
					margins.left,
					y,
					contentWidth,
					height
				);

				y += height + verticalSpacing;
				continue;
			}

			const label = row.labelItem?.widget() ?? null;
			const field = row.fieldItem?.widget() ?? null;

			const labelHeight = label !== null
				? this.#preferredHeight(label)
				: 0;

			const fieldHeight = field !== null
				? this.#preferredHeight(field)
				: 0;

			const rowHeight = Math.max(
				labelHeight,
				fieldHeight
			);

			if (label !== null) {
				label.setGeometry(
					margins.left,
					y + (rowHeight - labelHeight) / 2,
					labelWidth,
					labelHeight
				);
			}

			if (field !== null) {
				field.setGeometry(
					fieldX,
					y + (rowHeight - fieldHeight) / 2,
					fieldWidth,
					fieldHeight
				);
			}

			y += rowHeight + verticalSpacing;
		}
	}

	sizeHint(): CSize {
		const margins = this.contentsMargins();
		const horizontalSpacing = this.horizontalSpacing();
		const verticalSpacing = this.verticalSpacing();

		const labelWidth = this.#labelColumnWidth();

		let fieldWidth = 0;
		let spanningWidth = 0;
		let height = 0;

		for (const row of this.#m_rows) {
			const spanning = row.spanningItem?.widget() ?? null;

			if (spanning !== null) {
				spanningWidth = Math.max(
					spanningWidth,
					this.#preferredWidth(spanning)
				);

				height += this.#preferredHeight(spanning);
				continue;
			}

			const label = row.labelItem?.widget() ?? null;
			const field = row.fieldItem?.widget() ?? null;

			const labelHeight = label !== null
				? this.#preferredHeight(label)
				: 0;

			const fieldHeight = field !== null
				? this.#preferredHeight(field)
				: 0;

			if (field !== null) {
				fieldWidth = Math.max(
					fieldWidth,
					this.#preferredWidth(field)
				);
			}

			height += Math.max(
				labelHeight,
				fieldHeight
			);
		}

		if (this.#m_rows.length > 1) {
			height += verticalSpacing *
				(this.#m_rows.length - 1);
		}

		const twoColumnWidth =
			labelWidth +
			(labelWidth > 0 && fieldWidth > 0
				? horizontalSpacing
				: 0) +
			fieldWidth;

		const width = Math.max(
			twoColumnWidth,
			spanningWidth
		);

		return new CSize(
			width + margins.left + margins.right,
			height + margins.top + margins.bottom
		);
	}

	#labelColumnWidth(): number {
		let width = 0;

		for (const row of this.#m_rows) {
			const label = row.labelItem?.widget() ?? null;

			if (label === null)
				continue;

			width = Math.max(
				width,
				this.#preferredWidth(label)
			);
		}

		return width;
	}

	#preferredWidth(widget: CWidget): number {
		const minimum = widget.minimumSize().width();
		const hint = widget.sizeHint().width();

		if (hint > 0)
			return Math.max(minimum, hint);

		return Math.max(minimum, widget.width());
	}

	#preferredHeight(widget: CWidget): number {
		const minimum = widget.minimumSize().height();
		const hint = widget.sizeHint().height();

		if (hint > 0)
			return Math.max(minimum, hint);

		return Math.max(minimum, widget.height());
	}
}