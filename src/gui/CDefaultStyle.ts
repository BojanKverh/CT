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
import { CSlider } from "../widgets/CSlider.js";
import type { CProgressBar } from "../widgets/CProgressBar.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";
import type { CScrollBar } from "../widgets/CScrollBar.js";
import { COrientation } from "./COrientation.js";
import { CPixmap } from "../painting/CPixmap.js";

export class CDefaultStyle extends CStyle {
	override drawLabel(painter: CPainter, label: CLabel): void {
		const palette = label.palette();
		if (label.pixmap() === null) {
			painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
			painter.fillRect(label.rect());
			painter.setFillStyle(palette.color(CPaletteColorRole.Text).toCss());
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
		} else {
			painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
			painter.fillRect(label.rect());
			const pix = label.pixmap();
			const w = pix !== null? pix.width() : 0;
			const h = pix !== null? pix.height() : 0;
			const x = (label.width() - w) / 2;
			const y = (label.height() - h) / 2;
			if (pix !== null)
				painter.drawPixmap(pix.image(), x, y);
		}
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

		if (lineEdit.hasFocus() && lineEdit.cursorVisible()) {
    		const beforeCursor = lineEdit.text().slice(0, lineEdit.cursorPosition());
    		const cursorX = textX + metrics.textWidth(beforeCursor);
    		painter.setStrokeStyle(palette.color(CPaletteColorRole.Text).toCss());
    		painter.drawLine(cursorX, 4, cursorX, lineEdit.height() - 4);
	    }
    }

	override drawSlider(painter: CPainter, slider: CSlider): void {
		const palette = slider.palette();

		const grooveHeight = 4;
		const handleW = CSlider.HandleSize;
		const handleH = 12;

		const grooveX = handleW / 2;
		const grooveY = (slider.height() - grooveHeight) / 2;
		const grooveWidth = Math.max(0, slider.width() - handleW);

		painter.setFillStyle(palette.color(CPaletteColorRole.Window).toCss());

		painter.fillRect(new CRect(grooveX, grooveY, grooveWidth, grooveHeight));
		const range = slider.maximum() - slider.minimum();
		const ratio = range === 0? 0 : (slider.value() - slider.minimum()) / range;

		const handleCenterX = grooveX + grooveWidth * ratio;

		const handleY = (slider.height() - handleH) / 2;

		painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());

		painter.fillRect(new CRect(handleCenterX - handleW / 2, handleY, handleW,
			handleH));
	}

	override drawProgressBar(painter: CPainter, progressBar: CProgressBar): void {
		const palette = progressBar.palette();

		const range = progressBar.maximum() - progressBar.minimum();

		const ratio = range === 0? 0 : (progressBar.value() - progressBar.minimum()) / range;
		const fillWidth = progressBar.width() * ratio;
		painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(progressBar.rect());

		painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());
		painter.fillRect(new CRect(0, 0, fillWidth, progressBar.height()));

		painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(progressBar.rect());

		const percent = range === 0? 0 : Math.round(ratio * 100);

		const textRole = progressBar.isEnabled()? CPaletteColorRole.Text
			: CPaletteColorRole.DisabledText;
		painter.setFillStyle(palette.color(textRole).toCss());
		painter.setFont(progressBar.font());
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.drawText(`${percent} %`, progressBar.width() / 2, progressBar.height() / 2);
	}

	override drawGroupBox(painter: CPainter, groupBox: CGroupBox): void {
		const palette = groupBox.palette();
		const title = groupBox.title();

		const titleMargin = 8;
		const titlePadding = 4;
		const frameY = 8;

		painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());

		painter.setFillStyle(palette.color(groupBox.isEnabled()? CPaletteColorRole.Text
					: CPaletteColorRole.DisabledText).toCss());

		painter.setFont(groupBox.font());

		if (title.length === 0) {
			painter.strokeRect(new CRect(0, frameY, groupBox.width(), groupBox.height() - frameY));
			return;
		}

		const metrics = new CFontMetrics(groupBox.font());
		const titleWidth = metrics.textWidth(title);
		const titleStart = titleMargin;
		const titleEnd = titleStart + titleWidth + 2 * titlePadding;

		// Top-left part of frame.
		painter.drawLine(0, frameY, titleStart, frameY);

		// Top-right part of frame.
		painter.drawLine(titleEnd, frameY, groupBox.width(), frameY);

		// Left side.
		painter.drawLine(0, frameY, 0, groupBox.height());

		// Right side.
		painter.drawLine(groupBox.width(), frameY, groupBox.width(), groupBox.height());

		// Bottom.
		painter.drawLine(0, groupBox.height(), groupBox.width(), groupBox.height());

		painter.setTextAlign("left");
		painter.setTextBaseline("middle");
		painter.drawText( title, titleStart + titlePadding, frameY);
	}

	override drawScrollBar(painter: CPainter, scrollBar: CScrollBar): void {
		const palette = scrollBar.palette();
		const buttonSize = scrollBar.buttonSize();
		const trackStart = scrollBar.trackStart();
		const trackLength = scrollBar.trackLength();
		const thumbStart = scrollBar.thumbStart();
		const thumbLength = scrollBar.thumbLength();

		painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(scrollBar.rect());

		painter.setFillStyle(palette.color(CPaletteColorRole.Button).toCss());

		if (scrollBar.orientation() === COrientation.Horizontal) {
			painter.fillRect(new CRect(0, 0, buttonSize, scrollBar.height()));
			painter.fillRect(new CRect(scrollBar.width() - buttonSize, 0, buttonSize, scrollBar.height()));
			painter.setFillStyle(palette.color(CPaletteColorRole.Window).toCss());
			painter.fillRect(new CRect(trackStart, 0, trackLength, scrollBar.height()));
			painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillRect(new CRect(thumbStart, 0, thumbLength, scrollBar.height()));

			painter.setFillStyle(scrollBar.isEnabled() ? palette.color(CPaletteColorRole.ButtonText).toCss()
					: palette.color(CPaletteColorRole.DisabledText).toCss()
			);

			painter.setFont(scrollBar.font());
			painter.setTextAlign("center");
			painter.setTextBaseline("middle");
		} else {
			painter.fillRect(new CRect(0, 0, scrollBar.width(), buttonSize));
			painter.fillRect(new CRect(0, scrollBar.height() - buttonSize, scrollBar.width(), buttonSize ));
			painter.setFillStyle(palette.color(CPaletteColorRole.Window).toCss());
			painter.fillRect(new CRect(0, trackStart, scrollBar.width(), trackLength));
			painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillRect(new CRect(0, thumbStart, scrollBar.width(), thumbLength));

			painter.setFillStyle(scrollBar.isEnabled()? palette.color(CPaletteColorRole.ButtonText).toCss()
				: palette.color(CPaletteColorRole.DisabledText).toCss()
			);

			painter.setFont(scrollBar.font());
			painter.setTextAlign("center");
			painter.setTextBaseline("middle");
		}

		painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(scrollBar.rect());
	}
}