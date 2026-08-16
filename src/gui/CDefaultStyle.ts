import { CAlignment } from "../core/CAlignment.js";
import { CPaletteColorRole } from "./CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CLabel } from "../widgets/CLabel.js";
import type { CPushButton } from "../widgets/CPushButton.js";
import { CStyle } from "./CStyle.js";
import { CRect } from "../geometry/CRect.js";
import type { CCheckBox } from "../widgets/CCheckBox.js";
import type { CLineEdit } from "../widgets/CLineEdit.js";
import { CFontMetrics } from "./CFontMetrics.js";

export class CDefaultStyle extends CStyle {
	override drawLabel(painter: CPainter, label: CLabel): void {
		const palette = label.palette();

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Base).toCss()
		);
		painter.fillRect(label.rect());

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Text).toCss()
		);
		painter.setFont(label.font());

		let x: number;
		let y: number;

		if (label.alignment() & CAlignment.Right) {
			painter.setTextAlign("right");
			x = label.width();
		} else if (label.alignment() & CAlignment.HCenter) {
			painter.setTextAlign("center");
			x = label.width() / 2;
		} else {
			painter.setTextAlign("left");
			x = 0;
		}

		if (label.alignment() & CAlignment.Bottom) {
			painter.setTextBaseline("bottom");
			y = label.height();
		} else if (label.alignment() & CAlignment.VCenter) {
			painter.setTextBaseline("middle");
			y = label.height() / 2;
		} else {
			painter.setTextBaseline("top");
			y = 0;
		}

		painter.drawText(label.text(), x, y);
	}

	override drawPushButton(painter: CPainter, button: CPushButton): void {
		const palette = button.palette();

		if (!button.isEnabled()) {
			painter.setFillStyle(
				palette.color(CPaletteColorRole.Window).toCss()
			);
		} else if (button.isDown()) {
			painter.setFillStyle(
				palette.color(CPaletteColorRole.Highlight).toCss()
			);
		} else if (button.isHovered()) {
			painter.setFillStyle(
				palette.color(CPaletteColorRole.Base).toCss()
			);
		} else {
			painter.setFillStyle(
				palette.color(CPaletteColorRole.Button).toCss()
			);
		}

		painter.fillRect(button.rect());

		const textRole = button.isEnabled()
			? CPaletteColorRole.ButtonText
			: CPaletteColorRole.DisabledText;

		painter.setFillStyle(
			palette.color(textRole).toCss()
		);
		painter.setFont(button.font());
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.drawText(
			button.text(),
			button.width() / 2,
			button.height() / 2
		);
	}

    override drawCheckBox(painter: CPainter, checkBox: CCheckBox): void {
	    const palette = checkBox.palette();
	    const boxSize = 16;
	    const boxY = (checkBox.height() - boxSize) / 2;

    	painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
	    painter.fillRect(new CRect(0, boxY, boxSize, boxSize));

	    painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());
	    painter.strokeRect(new CRect(0, boxY, boxSize, boxSize));

	    if (checkBox.isChecked()) {
		    painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());
		    painter.fillRect(new CRect(3, boxY + 3, boxSize - 6, boxSize - 6));
	    }

	    const textRole = checkBox.isEnabled()? CPaletteColorRole.Text
            : CPaletteColorRole.DisabledText;

    	painter.setFillStyle(palette.color(textRole).toCss());
	    painter.setFont(checkBox.font());
	    painter.setTextAlign("left");
	    painter.setTextBaseline("middle");

	    painter.drawText(checkBox.text(), boxSize + 6, checkBox.height() / 2);
    }

    override drawLineEdit(painter: CPainter, lineEdit: CLineEdit): void {
	    const palette = lineEdit.palette();
	    const metrics = new CFontMetrics(lineEdit.font());
	    painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
	    painter.fillRect(lineEdit.rect());
	    painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());
	    painter.strokeRect(lineEdit.rect());
    	painter.setFont(lineEdit.font());
	    painter.setTextAlign("left");
	    painter.setTextBaseline("middle");
    	const textY = lineEdit.height() / 2;
	    const textX = 5;
	    if (!lineEdit.hasSelection()) {
		    const textRole = lineEdit.isEnabled()? CPaletteColorRole.Text
			    : CPaletteColorRole.DisabledText;
    		painter.setFillStyle(palette.color(textRole).toCss());
    		painter.drawText(lineEdit.text(), textX, textY);
	    } else {
		    const start = lineEdit.selectionStart();
		    const end = lineEdit.selectionEnd();
    		const before = lineEdit.text().slice(0, start);
	    	const selected = lineEdit.text().slice(start, end);
		    const after = lineEdit.text().slice(end);
		    const selectionStartX = textX + metrics.textWidth(before);
		    const selectionEndX = selectionStartX + metrics.textWidth(selected);
		    painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());
		    painter.fillRect(new CRect(selectionStartX, 2, selectionEndX - selectionStartX, lineEdit.height() - 4));
    		painter.setFillStyle(palette.color(CPaletteColorRole.Text).toCss());
	    	painter.drawText(before, textX, textY);
		    painter.setFillStyle(palette.color(CPaletteColorRole.HighlightedText).toCss());
		    painter.drawText(selected, selectionStartX, textY);
		    painter.setFillStyle(palette.color(CPaletteColorRole.Text).toCss());
		    painter.drawText(after, selectionEndX, textY);
	    }

    	if (lineEdit.hasFocus()) {
	    	const beforeCursor = lineEdit.text().slice(0, lineEdit.cursorPosition());
    		const cursorX = textX + metrics.textWidth(beforeCursor);
    		painter.setStrokeStyle(palette.color(CPaletteColorRole.Text).toCss());
    		painter.drawLine(cursorX, 4, cursorX, lineEdit.height() - 4);
	    }
    }
}