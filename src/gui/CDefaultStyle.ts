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
import type { CProgressBar } from "../widgets/CProgressBar.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";
import type { CScrollBar } from "../widgets/CScrollBar.js";
import { COrientation } from "./COrientation.js";
import type { CRadioButton } from "../widgets/CRadioButton.js";
import type { CTabWidget } from "../widgets/CTabWidget.js";
import type { CToolTipWidget } from "../widgets/CToolTipWidget.js";
import { CFrameShadow, CFrameShape } from "../widgets/CFrame.js";
import type { CFrame } from "../widgets/CFrame.js";
import type { CComboBox } from "../widgets/CComboBox.js";
import { CToolButtonStyle } from "../gui/CToolButtonStyle.js";
import type { CToolButton } from "../widgets/CToolButton.js";
import type { CToolBar } from "../widgets/CToolBar.js";
import type { CSlider } from "../widgets/CSlider.js";
import type { CSplitterHandle } from "../widgets/CSplitterHandle.js";

export class CDefaultStyle extends CStyle {

	override sliderHandleSize(): number {
		return 16;
	}

	override toolTipHorizontalPadding(): number {
		return 6;
	}

	override toolTipVerticalPadding(): number {
		return 3;
	}

	override comboBoxArrowWidth(): number {
		return 24;
	}

	override splitterHandleWidth(): number
	{
		return 6;
	}

	override drawLabel(painter: CPainter, label: CLabel): void {
		const palette = label.palette();
		if (label.pixmap() === null) {
			painter.setBrush(palette.color(CPaletteColorRole.Base).toCss());
			painter.fillRect(label.rect());
			painter.setPen(palette.color(CPaletteColorRole.Text).toCss());
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
			painter.setBrush(palette.color(CPaletteColorRole.Base).toCss());
			painter.fillRect(label.rect());
			const pix = label.pixmap();
			const margin = 3;
			const maxWidth = Math.max(0, label.width() - 2 * margin);
			const maxHeight = Math.max(0, label.height() - 2 * margin);
			let w = pix !== null? pix.width() : 0;
			let h = pix !== null? pix.height() : 0;

			if (w > maxWidth || h > maxHeight) {
				const scale = Math.min(maxWidth / w, maxHeight / h);
				w *= scale;
				h *= scale;
			}
			const x = (label.width() - w) / 2;
			const y = (label.height() - h) / 2;
			if (pix !== null)
				painter.drawPixmap(pix, x, y, w, h);
		}
	}

	override drawPushButton(painter: CPainter, button: CPushButton): void {
		const palette = button.palette();

		if (!button.isEnabled()) {
			painter.setBrush(palette.color(CPaletteColorRole.Window).toCss());
		} else if (button.isDown()) {
			painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
		} else if (button.isHovered()) {
			painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
		} else {
			painter.setBrush(palette.color(CPaletteColorRole.Button).toCss());
		}

		painter.fillRect(button.rect());

		const textRole = button.isEnabled()
			? (button.isHovered()? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText)
			: CPaletteColorRole.DisabledText;

		painter.setPen(palette.color(textRole).toCss());
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
		const handleW = this.sliderHandleSize();
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
		painter.drawLine(titleEnd + 0.5, frameY + 0.5, groupBox.width() - 0.5, frameY - 0.5);

		// Left side.
		painter.drawLine(0.5, frameY + 0.5, 0.5, groupBox.height() - 0.5);

		// Right side.
		painter.drawLine(groupBox.width() - 0.5, frameY + 0.5, groupBox.width() - 0.5, groupBox.height() -0.5);

		// Bottom.
		painter.drawLine(0.5, groupBox.height() - 0.5, groupBox.width() - 0.5, groupBox.height() - 0.5);

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

	override drawRadioButton(painter: CPainter, radioButton: CRadioButton): void {
		const palette = radioButton.palette();
		const indicatorSize = 14;
		const indicatorX = 2;
		const indicatorY = (radioButton.height() - indicatorSize) / 2;
		const centerX = indicatorX + indicatorSize / 2;
		const centerY = indicatorY + indicatorSize / 2;

		painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(radioButton.rect());

		painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.drawEllipse(centerX, centerY, indicatorSize / 2, indicatorSize / 2);

		if (radioButton.isChecked()) {
			painter.setFillStyle(palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillEllipse(centerX, centerY, 4, 4);
		}

		painter.setFillStyle(radioButton.isEnabled()
			? palette.color(CPaletteColorRole.Text).toCss()
			: palette.color(CPaletteColorRole.DisabledText).toCss());

		painter.setFont(radioButton.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");
		painter.drawText(radioButton.text(), indicatorX + indicatorSize + 6,
			radioButton.height() / 2);
	}

	override drawTabWidget(painter: CPainter, tabWidget: CTabWidget): void {
		const palette = tabWidget.palette();
		const tabHeight = tabWidget.tabHeight();

		painter.setFillStyle(palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(new CRect(0, 0, tabWidget.width(), tabHeight));

		let x = 0;
		for (let i = 0; i < tabWidget.count(); ++i) {
			const w = tabWidget.tabWidth(i)
			const enabled = tabWidget.isTabEnabled(i);
			const current = i === tabWidget.currentIndex();
			const hovered = tabWidget.isTabHovered(i);
			const pressed = tabWidget.isTabPressed(i);

			let backgroundRole = CPaletteColorRole.Button;
			let foregroundRole = CPaletteColorRole.Text;

			if (!enabled) {
				backgroundRole = CPaletteColorRole.Window;
				foregroundRole = CPaletteColorRole.DisabledText;
			} else if (current || pressed) {
				backgroundRole = CPaletteColorRole.Highlight;
				foregroundRole = CPaletteColorRole.HighlightedText;
			} else if (hovered) {
				backgroundRole = CPaletteColorRole.Hover;
			}

			painter.setFillStyle(palette.color(backgroundRole).toCss());			
			painter.setStrokeStyle(palette.color(foregroundRole).toCss());
			painter.drawRoundedRect(x + 1, 1, w - 1, tabHeight - 2, [9, 9, 0, 0]);

			let textRole = CPaletteColorRole.ButtonText;

			if (!enabled)
				textRole = CPaletteColorRole.DisabledText;
			else if (current || pressed || hovered)
				textRole = CPaletteColorRole.HighlightedText;

			painter.setFillStyle(palette.color(textRole).toCss());
			painter.setFont(tabWidget.font());
			painter.setTextAlign("center");
			painter.setTextBaseline("middle");
			painter.drawText(tabWidget.tabText(i), x + w / 2, tabHeight / 2);
			x += w;
		}
	}

	override drawToolTip(painter: CPainter, toolTip: CToolTipWidget): void {
		const palette = toolTip.palette();

		painter.setFillStyle(palette.color(CPaletteColorRole.ToolTipBase).toCss());
		painter.fillRect(toolTip.rect());

		painter.setStrokeStyle(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(toolTip.rect());

		painter.setFillStyle(palette.color(CPaletteColorRole.ToolTipText).toCss());
		painter.setFont(toolTip.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");

		painter.drawText(toolTip.text(), this.toolTipHorizontalPadding(), toolTip.height() / 2);
	}

	override drawFrame(painter: CPainter, frame: CFrame): void {
		const shape = frame.frameShape();

		if (shape === CFrameShape.NoFrame)
			return;

		const palette = frame.palette();
		const rect = frame.frameRect();
		const lineWidth = frame.lineWidth();
		const midLineWidth = frame.midLineWidth();

		if (lineWidth <= 0)
			return;

		if (shape === CFrameShape.HLine) {
			this.#drawFrameHLine(
				painter, frame, rect, lineWidth, midLineWidth
			);
			return;
		}

		if (shape === CFrameShape.VLine) {
			this.#drawFrameVLine(
				painter, frame, rect, lineWidth, midLineWidth
			);
			return;
		}

		if (frame.frameShadow() === CFrameShadow.Plain) {
			const offset = lineWidth / 2;
			const left = rect.x() + offset;
			const top = rect.y() + offset;
			const right = rect.x() + rect.width() - offset;
			const bottom = rect.y() + rect.height() - offset;

			painter.setPen(
				palette.color(CPaletteColorRole.WindowText).toCss()
			);
			painter.setLineWidth(lineWidth);

			painter.drawLine(left, top, right, top);
			painter.drawLine(left, top, left, bottom);
			painter.drawLine(left, bottom, right, bottom);
			painter.drawLine(right, top, right, bottom);
			return;
		}

		const raised = frame.frameShadow() === CFrameShadow.Raised;
		const topLeftRole = raised ?
			CPaletteColorRole.Light : CPaletteColorRole.Dark;
		const bottomRightRole = raised ?
			CPaletteColorRole.Dark : CPaletteColorRole.Light;

		const offset = lineWidth / 2;
		const left = rect.x() + offset;
		const top = rect.y() + offset;
		const right = rect.x() + rect.width() - offset;
		const bottom = rect.y() + rect.height() - offset;

		painter.setLineWidth(lineWidth);
		painter.setPen(palette.color(topLeftRole).toCss());

		painter.drawLine(left, top, right, top);
		painter.drawLine(left, top, left, bottom);

		painter.setPen(palette.color(bottomRightRole).toCss());

		painter.drawLine(left, bottom, right, bottom);
		painter.drawLine(right, top, right, bottom);

		if (shape === CFrameShape.Panel)
			return;

		const innerOffset =
			lineWidth + midLineWidth + lineWidth / 2;

		const innerLeft = rect.x() + innerOffset;
		const innerTop = rect.y() + innerOffset;
		const innerRight =
			rect.x() + rect.width() - innerOffset;
		const innerBottom =
			rect.y() + rect.height() - innerOffset;

		if (midLineWidth > 0) {
			const midOffset = lineWidth + midLineWidth / 2;
			const midLeft = rect.x() + midOffset;
			const midTop = rect.y() + midOffset;
			const midRight =
				rect.x() + rect.width() - midOffset;
			const midBottom =
				rect.y() + rect.height() - midOffset;

			painter.setPen(
				palette.color(CPaletteColorRole.Mid).toCss()
			);
			painter.setLineWidth(midLineWidth);

			painter.drawLine(midLeft, midTop, midRight, midTop);
			painter.drawLine(midLeft, midTop, midLeft, midBottom);
			painter.drawLine(
				midLeft, midBottom, midRight, midBottom
			);
			painter.drawLine(
				midRight, midTop, midRight, midBottom
			);
		}

		painter.setLineWidth(lineWidth);
		painter.setPen(palette.color(bottomRightRole).toCss());

		painter.drawLine(
			innerLeft, innerTop, innerRight, innerTop
		);
		painter.drawLine(
			innerLeft, innerTop, innerLeft, innerBottom
		);

		painter.setPen(palette.color(topLeftRole).toCss());

		painter.drawLine(
			innerLeft, innerBottom, innerRight, innerBottom
		);
		painter.drawLine(
			innerRight, innerTop, innerRight, innerBottom
		);
	}

	override drawToolButton(painter: CPainter, button: CToolButton): void {
		const palette = button.palette();
		const active = button.isDown() || button.isHovered();
		if (!button.autoRaise() || active) {
			const backgroundRole = active? CPaletteColorRole.Highlight
				: CPaletteColorRole.Button;

			painter.setFillStyle(palette.color(backgroundRole).toCss());
			painter.fillRect(button.rect());
		}

		const textRole = !button.isEnabled()? CPaletteColorRole.DisabledText
			: active ? CPaletteColorRole.HighlightedText
				: CPaletteColorRole.WindowText;

		painter.setPen(palette.color(textRole).toCss());
		painter.setFont(button.font());

		const icon = button.icon();
		const style = button.toolButtonStyle();
		const margin = 4;

		if (style === CToolButtonStyle.TextOnly) {
			painter.setTextAlign("center");
			painter.setTextBaseline("middle");

			painter.drawText(button.text(), button.width() / 2, button.height() / 2);
			return;
		}

		if (style === CToolButtonStyle.IconOnly) {
			if (icon === null)
				return;

			const maxWidth = Math.max(0, button.width() - 2 * margin);
			const maxHeight = Math.max(0, button.height() - 2 * margin);
			let width = icon.width();
			let height = icon.height();
			if (width > maxWidth || height > maxHeight) {
				const scale = Math.min(
					maxWidth / width,
					maxHeight / height
				);

				width *= scale;
				height *= scale;
			}

			const x = (button.width() - width) / 2;
			const y = (button.height() - height) / 2;
			painter.drawPixmap(icon, x, y, width, height);
			return;
		}

		if (style === CToolButtonStyle.TextUnderIcon) {
			const fm = new CFontMetrics(button.font());
			const textHeight = fm.height();
			const iconAreaHeight = Math.max(0, button.height() - textHeight - 3 * margin);

			if (icon !== null && iconAreaHeight > 0) {
				const maxWidth = Math.max(0, button.width() - 2 * margin);
				let width = icon.width();
				let height = icon.height();
				if (width > maxWidth || height > iconAreaHeight) {
					const scale = Math.min(
						maxWidth / width,
						iconAreaHeight / height
					);

					width *= scale;
					height *= scale;
				}

				const x = (button.width() - width) / 2;
				const y = margin + (iconAreaHeight - height) / 2;

				painter.drawPixmap(icon, x, y, width, height);
			}

			painter.setTextAlign("center");
			painter.setTextBaseline("bottom");

			painter.drawText(button.text(), button.width() / 2, button.height() - margin);
			return;
		}

		if (style === CToolButtonStyle.TextBesideIcon) {
			const fm = new CFontMetrics(button.font());
			const textWidth = fm.textWidth(button.text());
			const iconSize = Math.max(0, Math.min(button.height() - 2 * margin,
					button.width() - textWidth - 3 * margin));

			const totalWidth = iconSize + margin + textWidth;
			const startX = (button.width() - totalWidth) / 2;

			if (icon !== null && iconSize > 0) {
				const scale = Math.min(iconSize / icon.width(), iconSize / icon.height());

				const width = icon.width() * scale;
				const height = icon.height() * scale;
				const x = startX + (iconSize - width) / 2;
				const y = (button.height() - height) / 2;
				painter.drawPixmap(icon, x, y, width, height);
			}

			painter.setTextAlign("left");
			painter.setTextBaseline("middle");
			painter.drawText(button.text(), startX + iconSize + margin, button.height() / 2);
		}
	}

	override drawToolBar(painter: CPainter, toolBar: CToolBar): void {
		const palette = toolBar.palette();
		painter.setFillStyle(palette.color(CPaletteColorRole.Window).toCss());
		painter.fillRect(toolBar.rect());
	}

	override drawComboBox(painter: CPainter, comboBox: CComboBox): void {
		const palette = comboBox.palette();
		const arrowWidth = this.comboBoxArrowWidth();
		const arrowX = comboBox.width() - arrowWidth;

		let buttonRole = CPaletteColorRole.Button;
		if (comboBox.isDown())
			buttonRole = CPaletteColorRole.Highlight;
		else if (comboBox.isArrowHovered())
			buttonRole = CPaletteColorRole.Highlight;

		painter.setBrush(palette.color(buttonRole).toCss());
		painter.fillRect(new CRect(arrowX, 0, arrowWidth, comboBox.height()));

		painter.setPen(palette.color(CPaletteColorRole.WindowText).toCss());
		painter.setLineWidth(1);

		painter.drawLine(arrowX + 0.5, 0, arrowX + 0.5, comboBox.height());

		const centerX = arrowX + arrowWidth / 2;
		const centerY = comboBox.height() / 2;

		const arrowHalfWidth = 4;
		const arrowHeight = 4;

		painter.drawLine(centerX - arrowHalfWidth, centerY - arrowHeight / 2, centerX,
			centerY + arrowHeight / 2);

		painter.drawLine(centerX, centerY + arrowHeight / 2, centerX + arrowHalfWidth, 
			centerY - arrowHeight / 2);
	}

	#drawFrameHLine(painter: CPainter, frame: CFrame, rect: CRect, lineWidth: number, midLineWidth: number): void {
		const palette = frame.palette();
		const center = rect.y() + rect.height() / 2;

		if (frame.frameShadow() === CFrameShadow.Plain) {
			painter.setPen(
				palette.color(CPaletteColorRole.WindowText).toCss()
			);
			painter.setLineWidth(lineWidth);
			painter.drawLine(
				rect.x(), center, rect.x() + rect.width(), center
			);
			return;
		}

		const raised = frame.frameShadow() === CFrameShadow.Raised;
		const topRole = raised ?
			CPaletteColorRole.Light : CPaletteColorRole.Dark;
		const bottomRole = raised ?
			CPaletteColorRole.Dark : CPaletteColorRole.Light;

		const frameWidth = 2 * lineWidth + midLineWidth;
		const top = center - frameWidth / 2 + lineWidth / 2;
		const bottom = center + frameWidth / 2 - lineWidth / 2;

		painter.setLineWidth(lineWidth);
		painter.setPen(palette.color(topRole).toCss());
		painter.drawLine(
			rect.x(), top, rect.x() + rect.width(), top
		);

		if (midLineWidth > 0) {
			painter.setLineWidth(midLineWidth);
			painter.setPen(
				palette.color(CPaletteColorRole.Mid).toCss()
			);
			painter.drawLine(
				rect.x(), center, rect.x() + rect.width(), center
			);
		}

		painter.setLineWidth(lineWidth);
		painter.setPen(palette.color(bottomRole).toCss());
		painter.drawLine(
			rect.x(), bottom, rect.x() + rect.width(), bottom
		);
	}

	#drawFrameVLine(painter: CPainter, frame: CFrame, rect: CRect, lineWidth: number, midLineWidth: number): void {
		const palette = frame.palette();
		const center = rect.x() + rect.width() / 2;

		if (frame.frameShadow() === CFrameShadow.Plain) {
			painter.setPen(
				palette.color(CPaletteColorRole.WindowText).toCss()
			);
			painter.setLineWidth(lineWidth);
			painter.drawLine(
				center, rect.y(), center, rect.y() + rect.height()
			);
			return;
		}

		const raised = frame.frameShadow() === CFrameShadow.Raised;
		const leftRole = raised ?
			CPaletteColorRole.Light : CPaletteColorRole.Dark;
		const rightRole = raised ?
			CPaletteColorRole.Dark : CPaletteColorRole.Light;

		const frameWidth = 2 * lineWidth + midLineWidth;
		const left = center - frameWidth / 2 + lineWidth / 2;
		const right = center + frameWidth / 2 - lineWidth / 2;

		painter.setLineWidth(lineWidth);
		painter.setPen(palette.color(leftRole).toCss());
		painter.drawLine(
			left, rect.y(), left, rect.y() + rect.height()
		);

		if (midLineWidth > 0) {
			painter.setLineWidth(midLineWidth);
			painter.setPen(
				palette.color(CPaletteColorRole.Mid).toCss()
			);
			painter.drawLine(
				center, rect.y(), center, rect.y() + rect.height()
			);
		}

		painter.setLineWidth(lineWidth);
		painter.setPen(palette.color(rightRole).toCss());
		painter.drawLine(
			right, rect.y(), right, rect.y() + rect.height()
		);
	}

	override drawSplitterHandle(painter: CPainter, handle: CSplitterHandle): void
	{
		const palette = handle.palette();

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Window).toCss()
		);
		painter.fillRect(handle.rect());

		painter.setStrokeStyle(
			palette.color(CPaletteColorRole.Mid).toCss()
		);
		painter.setLineWidth(1);

		if (handle.orientation() === COrientation.Horizontal) {
			const x = handle.width() / 2;
			painter.drawLine(x, handle.height() / 2 - 8, x, handle.height() / 2 + 8);
		} else {
			const y = handle.height() / 2;
			painter.drawLine(handle.width() / 2 - 8, y, handle.width() / 2 + 8, y);
		}
	}
}