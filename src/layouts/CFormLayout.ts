/** @module Layouts/CFormLayout */
import { CSizePolicy } from "../geometry/CSizePolicy.js";
import { CAlignment } from "../core/CAlignment.js";
import { CSize } from "../geometry/CSize.js";
import { CLabel } from "../widgets/CLabel.js";
import type { CWidget } from "../widgets/CWidget.js";
import { CLayout } from "./CLayout.js";
import { CWidgetItem } from "./CWidgetItem.js";

/**
 * Role of an item within a form-layout row.
 */
export enum CFormLayoutItemRole {
    /** Label cell of a two-column row. */
    LabelRole,
    /** Field cell of a two-column row. */
    FieldRole,
    /** Widget spanning the complete row. */
    SpanningRole
}

interface CFormLayoutRow {
	labelItem: CWidgetItem | null;
	fieldItem: CWidgetItem | null;
	spanningItem: CWidgetItem | null;
}

/**
 * Two-column layout for label/field forms, with support for spanning rows.
 */
export class CFormLayout extends CLayout {
	#m_rows: CFormLayoutRow[] = [];

	#m_horizontalSpacing: number | null = null;
	#m_verticalSpacing: number | null = null;
	#m_labelColumnWidth: number | null = null;
    #stackBelowWidth: number | null = null;
	#m_labelAlignment = CAlignment.Right | CAlignment.VCenter;

    /**
    * Appends a label/field pair or a widget spanning the row. String labels are created with the field as their buddy.
    */
    addRow(labelText: string, field: CWidget): void;
    /**
    * Appends a label/field pair or a widget spanning the row. String labels are created with the field as their buddy.
    */
    addRow(label: CWidget, field: CWidget): void;
    /**
    * Appends a label/field pair or a widget spanning the row. String labels are created with the field as their buddy.
    */
    addRow(widget: CWidget): void;

    /**
    * Appends a label/field pair or a widget spanning the row. String labels are created with the field as their buddy.
    */
    addRow(
		labelOrWidget: string | CWidget,
		field?: CWidget
	): void {
		if (field === undefined)
			this.insertRow(this.#m_rows.length, labelOrWidget as CWidget);
		else if (typeof labelOrWidget === "string")
			this.insertRow(this.#m_rows.length, labelOrWidget, field);
		else
			this.insertRow(this.#m_rows.length, labelOrWidget, field);
	}

    /**
    * Inserts a label/field pair or spanning widget at a row position. Explicit label widgets retain their existing buddy association.
    */
    insertRow(row: number, labelText: string, field: CWidget): void;
    /**
    * Inserts a label/field pair or spanning widget at a row position. Explicit label widgets retain their existing buddy association.
    */
    insertRow(row: number, label: CWidget, field: CWidget): void;
    /**
    * Inserts a label/field pair or spanning widget at a row position. Explicit label widgets retain their existing buddy association.
    */
    insertRow(row: number, widget: CWidget): void;

    /**
    * Inserts a label/field pair or spanning widget at a row position. Explicit label widgets retain their existing buddy association.
    */
    insertRow(
		row: number,
		labelOrWidget: string | CWidget,
		field?: CWidget
	): void {
		row = Number.isFinite(row) ? Math.trunc(row) : this.#m_rows.length;
		row = Math.max(0, Math.min(row, this.#m_rows.length));
		const itemIndex = this.#flatIndexForRow(row);

		if (field === undefined) {
			const widget = labelOrWidget as CWidget;
			const item = new CWidgetItem(widget);

			if (!this.insertItem(itemIndex, item))
				return;

			this.#m_rows.splice(row, 0, {
				labelItem: null,
				fieldItem: null,
				spanningItem: item
			});
			this.update();
			return;
		}

		let label: CWidget;

		if (typeof labelOrWidget === "string") {
			const textLabel = new CLabel();

			textLabel.setText(labelOrWidget);
            textLabel.setBuddy(field);
			textLabel.setAlignment(this.#m_labelAlignment);

			label = textLabel;
		} else {
			label = labelOrWidget;
		}

		const labelItem = new CWidgetItem(label);
		const fieldItem = new CWidgetItem(field);

		if (!this.insertItem(itemIndex, labelItem))
			return;

		if (!this.insertItem(itemIndex + 1, fieldItem)) {
			this.removeWidget(label);
			return;
		}

		this.#m_rows.splice(row, 0, {
			labelItem,
			fieldItem,
			spanningItem: null
		});
		this.update();
	}

    /** Returns the number of rows in the form. */
    rowCount(): number {
		return this.#m_rows.length;
	}

    /** Removes the row at the specified position. */
    removeRow(row: number): void {
		if (!Number.isInteger(row) || row < 0 || row >= this.#m_rows.length)
			return;

		const removed = this.#m_rows.splice(row, 1)[0];
		if (removed === undefined)
			return;

		const widgets = [
			removed.labelItem?.widget(),
			removed.fieldItem?.widget(),
			removed.spanningItem?.widget()
		];
		for (const widget of widgets) {
			if (widget !== null && widget !== undefined)
				super.removeWidget(widget);
		}
		this.update();
	}

    /** Returns the label associated with a field widget. */
    labelForField(field: CWidget): CWidget | null {
		for (const row of this.#m_rows) {
			if (row.fieldItem?.widget() === field)
				return row.labelItem?.widget() ?? null;
		}
		return null;
	}

    /** Returns the effective width of the label column. */
    labelColumnWidth(): number {
		return this.#m_labelColumnWidth ?? this.#automaticLabelColumnWidth();
	}

    /** Sets a fixed label-column width, or `null` for automatic sizing. */
    setLabelColumnWidth(width: number | null): void {
		const normalized = width === null ? null : Math.max(0, width);
		if (normalized === this.#m_labelColumnWidth)
			return;
		this.#m_labelColumnWidth = normalized;
		this.update();
	}

    /** Returns the alignment applied to label widgets. */
    labelAlignment(): CAlignment {
		return this.#m_labelAlignment;
	}

    /** Sets the alignment of all label widgets. */
    setLabelAlignment(alignment: CAlignment): void {
		if (alignment === this.#m_labelAlignment)
			return;
		this.#m_labelAlignment = alignment;
		for (const row of this.#m_rows) {
			const label = row.labelItem?.widget();
			if (label instanceof CLabel)
				label.setAlignment(alignment);
		}
		this.update();
	}

    /** Returns the horizontal spacing between labels and fields. */
    horizontalSpacing(): number {
		return this.#m_horizontalSpacing ?? this.spacing();
	}

    /** Sets the horizontal spacing between labels and fields. */
    setHorizontalSpacing(spacing: number): void {
		spacing = Math.max(0, spacing);

		if (this.#m_horizontalSpacing === spacing)
			return;

		this.#m_horizontalSpacing = spacing;
		this.update();
	}

    /** Returns the vertical spacing between rows. */
    verticalSpacing(): number {
		return this.#m_verticalSpacing ?? this.spacing();
	}

    /** Sets the vertical spacing between rows. */
    setVerticalSpacing(spacing: number): void {
		spacing = Math.max(0, spacing);

		if (this.#m_verticalSpacing === spacing)
			return;

		this.#m_verticalSpacing = spacing;
		this.update();
	}

    /** Returns a widget by flat index or by row and item role. */
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

    /** Removes all rows and layout items. */
    override clear(): void {
		this.#m_rows.length = 0;
		super.clear();
	}

    /** Returns the content width below which each label sits above its field. */
    stackBelowWidth(): number | null {
        return this.#stackBelowWidth;
    }

    /** Sets the stacking threshold in content pixels, or null to keep two columns. */
    setStackBelowWidth(width: number | null): void {
        if (width !== null && (!Number.isFinite(width) || width < 0))
            throw new RangeError("Stacking width must be a finite, non-negative number.");
        if (width === this.#stackBelowWidth) return;
        this.#stackBelowWidth = width;
        this.update();
        this.parentWidget()?.updateGeometry();
    }

    override hasHeightForWidth(): boolean {
        return (this.#stackBelowWidth !== null && this.#m_rows.some(row =>
            row.labelItem !== null && row.fieldItem !== null)) || super.hasHeightForWidth();
    }

    #rowsForWidth(contentWidth: number): readonly CFormLayoutRow[] {
        if (this.#stackBelowWidth === null || contentWidth >= this.#stackBelowWidth)
            return this.#m_rows;

        const rows: CFormLayoutRow[] = [];
        for (const row of this.#m_rows) {
            if (row.spanningItem !== null) {
                rows.push(row);
                continue;
            }
            for (const item of [row.labelItem, row.fieldItem]) {
                if (item !== null)
                    rows.push({ labelItem: null, fieldItem: null, spanningItem: item });
            }
        }
        return rows;
    }

    override heightForWidth(width: number): number {
        if (!this.hasHeightForWidth()) return -1;
        const margins = this.contentsMargins();
        const contentWidth = Math.max(0, width - margins.left - margins.right);
        // Asking for zero available height returns row minima, not preferred heights.
        // Evaluate each row at its actual column width instead.
        const rows = this.#rowsForWidth(contentWidth);
        const { labelWidth, fieldWidth } = rows === this.#m_rows
            ? this.#columnWidths(contentWidth) : { labelWidth: 0, fieldWidth: contentWidth };
        let height = margins.top + margins.bottom + Math.max(0, rows.length - 1) * this.verticalSpacing();
        for (const row of rows) {
            let rowHeight = 0;
            for (const [item, available] of [[row.labelItem, labelWidth], [row.fieldItem, fieldWidth],
                [row.spanningItem, contentWidth]] as const) {
                const widget = item?.widget();
                if (widget) rowHeight = Math.max(rowHeight,
                    CLayout.layoutAxisBounds(widget, false, true, this.#fitWidth(widget, available)).preferred);
            }
            height += rowHeight;
        }
        return height;
    }

    /** Recalculates and applies the geometry of all form rows. */
    override update(): void {
		const parent = this.parentWidget();

		if (parent === null || this.#m_rows.length === 0)
			return;

		const margins = this.contentsMargins();
		const horizontalSpacing = this.horizontalSpacing();
		const verticalSpacing = this.verticalSpacing();
		const contentsRect = parent.contentsRect();

		const contentX = contentsRect.x() + margins.left;
		const contentY = contentsRect.y() + margins.top;
		const contentWidth = Math.max(
			0,
			contentsRect.width() - margins.left - margins.right
		);

        const rows = this.#rowsForWidth(contentWidth);
        const { labelWidth, fieldWidth } = rows === this.#m_rows
            ? this.#columnWidths(contentWidth) : { labelWidth: 0, fieldWidth: contentWidth };
        const fieldX = contentX + labelWidth + (labelWidth > 0 ? horizontalSpacing : 0);
        const heights = this.#rowHeights(Math.max(0, contentsRect.height() - margins.top - margins.bottom
            - Math.max(0, rows.length - 1) * verticalSpacing), contentWidth, labelWidth, fieldWidth, rows);
        let rowIndex = 0;
		let y = contentY;

		for (const row of rows) {
            const allocatedHeight = heights[rowIndex++]!;
			const spanning = row.spanningItem?.widget() ?? null;

			if (spanning !== null) {
				const height = this.#fitHeight(spanning, allocatedHeight, this.#fitWidth(spanning, contentWidth));

				spanning.setGeometry(
					contentX,
					y,
					this.#fitWidth(spanning, contentWidth),
					height
				);

				y += allocatedHeight + verticalSpacing;
				continue;
			}

			const label = row.labelItem?.widget() ?? null;
			const field = row.fieldItem?.widget() ?? null;

			const labelHeight = label !== null
				? this.#fitHeight(label, allocatedHeight, this.#fitWidth(label, labelWidth))
				: 0;

			const fieldHeight = field !== null
				? this.#fitHeight(field, allocatedHeight, this.#fitWidth(field, fieldWidth))
				: 0;

			const rowHeight = allocatedHeight;

			if (label !== null) {
                const actualLabelWidth = this.#fitWidth(label, labelWidth);
                const labelOffset = (this.#m_labelAlignment & CAlignment.Right) !== 0 ? labelWidth - actualLabelWidth
                    : (this.#m_labelAlignment & CAlignment.HCenter) !== 0 ? (labelWidth - actualLabelWidth) / 2 : 0;
				label.setGeometry(
					contentX + labelOffset,
					y + (rowHeight - labelHeight) / 2,
                    actualLabelWidth,
					labelHeight
				);
			}

			if (field !== null) {
				field.setGeometry(
					fieldX,
					y + (rowHeight - fieldHeight) / 2,
					this.#fitWidth(field, fieldWidth),
					fieldHeight
				);
			}

			y += rowHeight + verticalSpacing;
		}
	}

    /** Returns the preferred size required by the form. */
    sizeHint(): CSize {
		const margins = this.contentsMargins();
		const horizontalSpacing = this.horizontalSpacing();
		const verticalSpacing = this.verticalSpacing();

		const labelWidth = this.labelColumnWidth();

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

	#automaticLabelColumnWidth(): number {
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

	#flatIndexForRow(row: number): number {
		let index = 0;
		for (let i = 0; i < row; ++i) {
			const current = this.#m_rows[i]!;
			index += current.spanningItem !== null ? 1 : 2;
		}
		return index;
	}

    #preferredWidth(widget: CWidget): number { return CLayout.layoutAxisBounds(widget, true, true).preferred; }
    #preferredHeight(widget: CWidget): number { return CLayout.layoutAxisBounds(widget, false, true).preferred; }
    #fitWidth(widget: CWidget, available: number): number {
        const bounds = CLayout.layoutAxisBounds(widget, true, true);
        return Math.min(bounds.maximum, Math.max(bounds.minimum, available));
    }
    #fitHeight(widget: CWidget, available: number, width?: number): number {
        const bounds = CLayout.layoutAxisBounds(widget, false, true, width);
        const policy = widget.sizePolicy();
        const canExpand = CSizePolicy.isExpanding(policy.verticalPolicy()) || policy.verticalStretch() > 0;
        return Math.min(canExpand ? bounds.maximum : bounds.preferred, Math.max(bounds.minimum, available));
    }
    #columnWidths(contentWidth: number): { labelWidth: number; fieldWidth: number } {
        let labelWidth = this.labelColumnWidth();
        const spacing = labelWidth > 0 ? this.horizontalSpacing() : 0;
        if (this.#m_labelColumnWidth === null && labelWidth > 0) {
            let minimumLabel = 0;
            let minimumField = 0;
            let preferredField = 0;
            let hasWrappingLabel = false;
            for (const row of this.#m_rows) {
                const label = row.labelItem?.widget();
                const field = row.fieldItem?.widget();
                if (label) {
                    minimumLabel = Math.max(minimumLabel, CLayout.layoutAxisBounds(label, true, true).minimum);
                    hasWrappingLabel ||= label.hasHeightForWidth();
                }
                if (field) {
                    const bounds = CLayout.layoutAxisBounds(field, true, true);
                    minimumField = Math.max(minimumField, bounds.minimum);
                    preferredField = Math.max(preferredField, bounds.preferred);
                }
            }
            const available = Math.max(0, contentWidth - spacing);
            const reserved = hasWrappingLabel ? Math.max(minimumField, Math.min(preferredField, available / 2)) : minimumField;
            labelWidth = Math.min(labelWidth, Math.max(minimumLabel, available - reserved));
        }
        return { labelWidth, fieldWidth: Math.max(0, contentWidth - labelWidth - (labelWidth > 0 ? spacing : 0)) };
    }

    #rowHeights(available: number, contentWidth: number, labelWidth: number, fieldWidth: number, rows: readonly CFormLayoutRow[]): number[] {
        const minimums: number[] = [], preferred: number[] = [], maximums: number[] = [];
        const weights: number[] = [], priorities: number[] = [];
        for (const row of rows) {
            const widgets = [row.labelItem?.widget(), row.fieldItem?.widget(), row.spanningItem?.widget()]
                .filter((widget): widget is CWidget => widget !== null && widget !== undefined);
            let minimum = 0, hint = 0, maximum = 0, weight = 0, priority = 0;
            for (const widget of widgets) {
                const availableWidth = widget === row.spanningItem?.widget() ? contentWidth
                    : widget === row.labelItem?.widget() ? labelWidth : fieldWidth;
                const width = this.#fitWidth(widget, availableWidth);
                const bounds = CLayout.layoutAxisBounds(widget, false, true, width);
                const policy = widget.sizePolicy();
                const stretch = policy.verticalStretch();
                const expanding = CSizePolicy.isExpanding(policy.verticalPolicy());
                minimum = Math.max(minimum, bounds.minimum); hint = Math.max(hint, bounds.preferred);
                maximum = Math.max(maximum, expanding || stretch > 0 ? bounds.maximum : bounds.preferred);
                weight = Math.max(weight, stretch); priority = Math.max(priority, stretch > 0 ? 3 : expanding ? 2 : 0);
            }
            minimums.push(minimum); preferred.push(hint); maximums.push(maximum);
            weights.push(weight || 1); priorities.push(priority);
        }
        return CLayout.layoutAxisSizes(available, minimums, preferred, maximums, weights, priorities);
    }
}
