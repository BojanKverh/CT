import { CAlignment } from "../core/CAlignment.js";
import { CPaletteColorRole } from "./CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CLabel } from "../widgets/CLabel.js";
import { CStyle } from "./CStyle.js";
import { CRect } from "../geometry/CRect.js";
import { CFontMetrics } from "./CFontMetrics.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";
import { COrientation } from "./COrientation.js";
import type { CTabWidget } from "../widgets/CTabWidget.js";
import type { CToolTipWidget } from "../widgets/CToolTipWidget.js";
import { CFrameShadow, CFrameShape } from "../gui/CFrameStyle.js";
import { CToolButtonStyle } from "../gui/CToolButtonStyle.js";
import type { CStyleOptionToolButton } from "../gui/CStyleOptionToolButton.js";
import type { CSplitterHandle } from "../widgets/CSplitterHandle.js";
import type { CToolBoxButton } from "../widgets/CToolBoxButton.js";
import type { CKeySequenceEdit } from "../widgets/CKeySequenceEdit.js";
import { CIconMode, CIconState } from "./CIcon.js";
import { CStyleState } from "./CStyleOption.js";
import { CStyleOptionPushButton } from "./CStyleOptionPushButton.js";
import { CStyleOptionCheckBox } from "./CStyleOptionCheckBox.js";
import { CStyleOptionRadioButton } from "./CStyleOptionRadioButton.js";
import { CStyleOptionComboBox } from "./CStyleOptionComboBox.js";
import { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import { CStyleOptionSlider } from "../gui/CStyleOptionSlider.js";
import { CStyleOptionScrollBar } from "./CStyleOptionScrollBar.js";
import { CStyleOptionProgressBar } from "./CStyleOptionProgressBar.js";
import { CStyleOptionToolBar } from "./CStyleOptionToolBar.js";
import { CStyleOptionSizeGrip } from "./CStyleOptionSizeGrip.js";
import { CStyleOptionFrame } from "../gui/CStyleOptionFrame.js";

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

	override drawPushButton(painter: CPainter, option: CStyleOptionPushButton): void {
		const enabled = (option.state & CStyleState.Enabled) !== 0;
		const down = (option.state & CStyleState.Sunken) !== 0;
		const hovered = (option.state & CStyleState.MouseOver) !== 0;

		if (!enabled) {
			painter.setBrush(option.palette.color(CPaletteColorRole.Window).toCss());
		} else if (down || hovered) {
			painter.setBrush(option.palette.color(CPaletteColorRole.Highlight).toCss());
		} else {
			painter.setBrush(option.palette.color(CPaletteColorRole.Button).toCss());
		}

		painter.fillRect(option.rect);

		const textRole = !enabled? CPaletteColorRole.DisabledText
			: hovered? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText;

		painter.setPen(option.palette.color(textRole).toCss());
		painter.setFont(option.font);
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.drawText(option.text, option.rect.width() / 2, option.rect.height() / 2);
	}

	override drawCheckBox(painter: CPainter, option: CStyleOptionCheckBox): void {
		const enabled = (option.state & CStyleState.Enabled) !== 0;
		const checked = (option.state & CStyleState.On) !== 0;
		const boxSize = 16;
		const boxY = (option.rect.height() - boxSize) / 2;

		painter.setFillStyle(option.palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(new CRect(0, boxY, boxSize, boxSize));

		painter.setStrokeStyle(option.palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(new CRect(0, boxY, boxSize, boxSize));

		if (checked) {
			painter.setFillStyle(option.palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillRect(new CRect(3, boxY + 3, boxSize - 6, boxSize - 6));
		}

		const textRole = enabled? CPaletteColorRole.Text : CPaletteColorRole.DisabledText;

		painter.setFillStyle(option.palette.color(textRole).toCss());
		painter.setFont(option.font);
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");

		painter.drawText(option.text, boxSize + 6, option.rect.height() / 2);
	}
	
	override drawLineEdit(painter: CPainter, option: CStyleOptionLineEdit): void {
		const metrics = new CFontMetrics(option.font);
		const enabled = (option.state & CStyleState.Enabled) !== 0;
		const focused = (option.state & CStyleState.HasFocus) !== 0;
		const hasSelection = option.selectionStart !== option.selectionEnd;

		painter.setFillStyle(option.palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(option.rect);

		painter.setStrokeStyle(option.palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(option.rect);

		painter.setFont(option.font);
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");

		const textY = option.rect.height() / 2;
		const textX = 5;

		if (!hasSelection) {
			const textRole = enabled? CPaletteColorRole.Text : CPaletteColorRole.DisabledText;

			painter.setPen(option.palette.color(textRole).toCss());
			painter.drawText(option.text, textX, textY);
		} else {
			const before = option.text.slice(0, option.selectionStart);
			const selected = option.text.slice(option.selectionStart, option.selectionEnd);
			const after = option.text.slice(option.selectionEnd);

			const selectionStartX = textX + metrics.textWidth(before);
			const selectionEndX = selectionStartX + metrics.textWidth(selected);

			painter.setBrush(option.palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillRect(new CRect(selectionStartX, 2, selectionEndX - selectionStartX,
				option.rect.height() - 4));

			painter.setPen(option.palette.color(CPaletteColorRole.Text).toCss());
			painter.drawText(before, textX, textY);

			painter.setPen(option.palette.color(CPaletteColorRole.HighlightedText).toCss());
			painter.drawText(selected, selectionStartX, textY);

			painter.setPen(option.palette.color(CPaletteColorRole.Text).toCss());
			painter.drawText(after, selectionEndX, textY);
		}

		if (focused && option.cursorVisible) {
			const beforeCursor = option.text.slice(0, option.cursorPosition);
			const cursorX = textX + metrics.textWidth(beforeCursor);

			painter.setStrokeStyle(option.palette.color(CPaletteColorRole.Text).toCss());
			painter.drawLine(cursorX, 4, cursorX, option.rect.height() - 4);
		}
	}

	override drawSlider(painter: CPainter, option: CStyleOptionSlider): void {
		const grooveHeight = 4;
		const handleW = this.sliderHandleSize();
		const handleH = 12;

		const grooveX = handleW / 2;
		const grooveY = (option.rect.height() - grooveHeight) / 2;
		const grooveWidth = Math.max(0, option.rect.width() - handleW);

		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Window).toCss());
		painter.fillRect(
			new CRect(grooveX, grooveY, grooveWidth, grooveHeight));

		const range = option.maximum - option.minimum;
		const ratio = range === 0? 0
			: (option.value - option.minimum) / range;

		const handleCenterX = grooveX + grooveWidth * ratio;
		const handleY = (option.rect.height() - handleH) / 2;

		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Highlight).toCss());

		painter.fillRect(new CRect(handleCenterX - handleW / 2,
			handleY, handleW, handleH));
	}

	override drawProgressBar(painter: CPainter, option: CStyleOptionProgressBar): void {
		const range = option.maximum - option.minimum;
		const ratio = range === 0? 0
			: (option.value - option.minimum) / range;
		const fillWidth = option.rect.width() * ratio;

		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(option.rect);

		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Highlight).toCss());
		painter.fillRect(new CRect(0, 0, fillWidth,
			option.rect.height()));

		painter.setStrokeStyle(
			option.palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(option.rect);

		const percent = range === 0? 0 : Math.round(ratio * 100);
		const enabled = (option.state & CStyleState.Enabled) !== 0;
		const textRole = enabled? CPaletteColorRole.Text
			: CPaletteColorRole.DisabledText;

		painter.setFillStyle(option.palette.color(textRole).toCss());
		painter.setFont(option.font);
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.drawText(`${percent} %`, option.rect.width() / 2,
			option.rect.height() / 2);
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

	override drawScrollBar(painter: CPainter, option: CStyleOptionScrollBar): void {
		const enabled = (option.state & CStyleState.Enabled) !== 0;

		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(option.rect);

		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Button).toCss());

		if (option.orientation === COrientation.Horizontal) {
			painter.fillRect(new CRect(0, 0, option.buttonSize,
				option.rect.height()));
			painter.fillRect(new CRect(
				option.rect.width() - option.buttonSize, 0,
				option.buttonSize, option.rect.height()));

			painter.setFillStyle(
				option.palette.color(CPaletteColorRole.Window).toCss());
			painter.fillRect(new CRect(option.trackStart, 0,
				option.trackLength, option.rect.height()));

			painter.setFillStyle(
				option.palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillRect(new CRect(option.thumbStart, 0,
				option.thumbLength, option.rect.height()));
		} else {
			painter.fillRect(new CRect(0, 0, option.rect.width(),
				option.buttonSize));
			painter.fillRect(new CRect(0,
				option.rect.height() - option.buttonSize,
				option.rect.width(), option.buttonSize));

			painter.setFillStyle(
				option.palette.color(CPaletteColorRole.Window).toCss());
			painter.fillRect(new CRect(0, option.trackStart,
				option.rect.width(), option.trackLength));

			painter.setFillStyle(
				option.palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillRect(new CRect(0, option.thumbStart,
				option.rect.width(), option.thumbLength));
		}

		const textRole = enabled? CPaletteColorRole.ButtonText
			: CPaletteColorRole.DisabledText;

		painter.setFillStyle(option.palette.color(textRole).toCss());
		painter.setFont(option.font);
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.setStrokeStyle(
			option.palette.color(CPaletteColorRole.WindowText).toCss());
		painter.strokeRect(option.rect);
	}

	override drawRadioButton(painter: CPainter, option: CStyleOptionRadioButton): void {
		const enabled = (option.state & CStyleState.Enabled) !== 0;
		const checked = (option.state & CStyleState.On) !== 0;

		const indicatorSize = 14;
		const indicatorX = 2;
		const indicatorY = (option.rect.height() - indicatorSize) / 2;
		const centerX = indicatorX + indicatorSize / 2;
		const centerY = indicatorY + indicatorSize / 2;

		painter.setFillStyle(option.palette.color(CPaletteColorRole.Base).toCss());
		painter.fillRect(option.rect);

		painter.setStrokeStyle(option.palette.color(CPaletteColorRole.WindowText).toCss());
		painter.drawEllipse(centerX, centerY, indicatorSize / 2, indicatorSize / 2);

		if (checked) {
			painter.setFillStyle(option.palette.color(CPaletteColorRole.Highlight).toCss());
			painter.fillEllipse(centerX, centerY, 4, 4);
		}

		painter.setFillStyle(option.palette.color(enabled ? CPaletteColorRole.Text
					: CPaletteColorRole.DisabledText).toCss());

		painter.setFont(option.font);
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");
		painter.drawText(option.text, indicatorX + indicatorSize + 6, option.rect.height() / 2);
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

	override drawFrame(painter: CPainter, option: CStyleOptionFrame): void {
		const shape = option.frameShape;

		if (shape === CFrameShape.NoFrame)
			return;

		const palette = option.palette;
		const rect = option.rect;
		const lineWidth = option.lineWidth;
		const midLineWidth = option.midLineWidth;

		if (lineWidth <= 0)
			return;

		if (shape === CFrameShape.HLine) {
			this.#drawFrameHLine(
				painter, option, rect, lineWidth, midLineWidth
			);
			return;
		}

		if (shape === CFrameShape.VLine) {
			this.#drawFrameVLine(
				painter, option, rect, lineWidth, midLineWidth
			);
			return;
		}

		if (option.frameShadow === CFrameShadow.Plain) {
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

		const raised = option.frameShadow === CFrameShadow.Raised;
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

	override drawToolButton(painter: CPainter, option: CStyleOptionToolButton): void {
		const enabled = (option.state & CStyleState.Enabled) !== 0;
		const hovered = (option.state & CStyleState.MouseOver) !== 0;
		const down = (option.state & CStyleState.Sunken) !== 0;
		const checked = (option.state & CStyleState.On) !== 0;
		const text = option.text;
		const icon = option.icon;
		const iconSize = option.iconSize;
		const toolButtonStyle = option.toolButtonStyle;
		const rect = option.rect;
		const palette = option.palette;

		const active = down || hovered;
		if (!option.autoRaise || active) {
			const backgroundRole = active? CPaletteColorRole.Highlight
				: CPaletteColorRole.Button;

			painter.setFillStyle(palette.color(backgroundRole).toCss());
			painter.fillRect(rect);
		}

		const textRole = !enabled? CPaletteColorRole.DisabledText
			: active ? CPaletteColorRole.HighlightedText
				: CPaletteColorRole.WindowText;

		painter.setPen(palette.color(textRole).toCss());
		painter.setFont(option.font);

		const margin = 4;

		const iconMode = !enabled
			? CIconMode.Disabled
			: down || hovered
				? CIconMode.Active
				: CIconMode.Normal;

		const iconState = checked? CIconState.On : CIconState.Off;

		const pixmap = icon?.pixmap(iconSize, iconMode, iconState) ?? null;

		if (toolButtonStyle === CToolButtonStyle.TextOnly) {
			painter.setTextAlign("center");
			painter.setTextBaseline("middle");

			painter.drawText(text, rect.width() / 2, rect.height() / 2);
			return;
		}

		if (toolButtonStyle === CToolButtonStyle.IconOnly) {
			if (pixmap === null)
				return;

			const maxWidth = Math.min(
				iconSize.width(),
				Math.max(0, rect.width() - 2 * margin)
			);
			const maxHeight = Math.min(
				iconSize.height(),
				Math.max(0, rect.height() - 2 * margin)
			);

			let width = pixmap.width();
			let height = pixmap.height();

			if (width > maxWidth || height > maxHeight) {
				const scale = Math.min(
					maxWidth / width,
					maxHeight / height
				);

				width *= scale;
				height *= scale;
			}

			const x = (rect.width() - width) / 2;
			const y = (rect.height() - height) / 2;

			painter.drawPixmap(pixmap, x, y, width, height);
			return;
		}

		if (toolButtonStyle === CToolButtonStyle.TextUnderIcon) {
			const fm = new CFontMetrics(option.font);
			const textHeight = fm.height();
			const iconAreaHeight = Math.max(
				0, rect.height() - textHeight - 3 * margin);

			if (pixmap !== null && iconAreaHeight > 0) {
				const maxWidth = Math.min(
					iconSize.width(),
					Math.max(0, rect.width() - 2 * margin)
				);
				const maxHeight = Math.min(
					iconSize.height(),
					iconAreaHeight
				);

				let width = pixmap.width();
				let height = pixmap.height();

				if (width > maxWidth || height > maxHeight) {
					const scale = Math.min(
						maxWidth / width,
						maxHeight / height
					);

					width *= scale;
					height *= scale;
				}

				const x = (rect.width() - width) / 2;
				const y = margin +
					(iconAreaHeight - height) / 2;

				painter.drawPixmap(pixmap, x, y, width, height);
			}

			painter.setTextAlign("center");
			painter.setTextBaseline("bottom");
			painter.drawText(text, rect.width() / 2, rect.height() - margin
			);

			return;
		}

		if (toolButtonStyle === CToolButtonStyle.TextBesideIcon) {
			const fm = new CFontMetrics(option.font);
			const textWidth = fm.textWidth(text);
			const iconSize = Math.max(0, Math.min(rect.height() - 2 * margin,
					rect.width() - textWidth - 3 * margin));

			const totalWidth = iconSize + margin + textWidth;
			const startX = (rect.width() - totalWidth) / 2;

			if (pixmap !== null && iconSize > 0) {
				const scale = Math.min(iconSize / pixmap.width(), iconSize / pixmap.height());

				const width = pixmap.width() * scale;
				const height = pixmap.height() * scale;
				const x = startX + (iconSize - width) / 2;
				const y = (rect.height() - height) / 2;
				painter.drawPixmap(pixmap, x, y, width, height);
			}

			painter.setTextAlign("left");
			painter.setTextBaseline("middle");
			painter.drawText(text, startX + iconSize + margin, rect.height() / 2);
		}
	}

	override drawToolBar(painter: CPainter, option: CStyleOptionToolBar): void {
		painter.setFillStyle(
			option.palette.color(CPaletteColorRole.Window).toCss());
		painter.fillRect(option.rect);

		painter.setStrokeStyle(
			option.palette.color(CPaletteColorRole.Mid).toCss());
		painter.strokeRect(option.rect);
	}

	override drawComboBox(painter: CPainter,
		option: CStyleOptionComboBox): void {
		const arrowWidth = this.comboBoxArrowWidth();
		const arrowX = option.rect.width() - arrowWidth;
		const down = (option.state & CStyleState.Sunken) !== 0;

		let buttonRole = CPaletteColorRole.Button;
		if (down)
			buttonRole = CPaletteColorRole.Highlight;
		else if (option.arrowHovered)
			buttonRole = CPaletteColorRole.Highlight;

		painter.setBrush(option.palette.color(buttonRole).toCss());
		painter.fillRect(new CRect(arrowX, 0, arrowWidth, option.rect.height()));

		painter.setPen(option.palette.color(CPaletteColorRole.WindowText).toCss());
		painter.setLineWidth(1);

		painter.drawLine(arrowX + 0.5, 0, arrowX + 0.5, option.rect.height());

		const centerX = arrowX + arrowWidth / 2;
		const centerY = option.rect.height() / 2;

		const arrowHalfWidth = 4;
		const arrowHeight = 4;

		painter.drawLine(centerX - arrowHalfWidth, centerY - arrowHeight / 2,
			centerX, centerY + arrowHeight / 2);

		painter.drawLine(centerX, centerY + arrowHeight / 2, centerX + arrowHalfWidth,
			centerY - arrowHeight / 2);
	}

	#drawFrameHLine(painter: CPainter, option: CStyleOptionFrame, rect: CRect, 
		lineWidth: number, midLineWidth: number): void { 
		
		const palette = option.palette;
		const center = rect.y() + rect.height() / 2;

		if (option.frameShadow === CFrameShadow.Plain) {
			painter.setPen(
				palette.color(CPaletteColorRole.WindowText).toCss()
			);
			painter.setLineWidth(lineWidth);
			painter.drawLine(
				rect.x(), center, rect.x() + rect.width(), center
			);
			return;
		}

		const raised = option.frameShadow === CFrameShadow.Raised;
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

	#drawFrameVLine(painter: CPainter, option: CStyleOptionFrame, rect: CRect, 
		lineWidth: number, midLineWidth: number): void {
		const palette = option.palette;
		const center = rect.x() + rect.width() / 2;

		if (option.frameShadow === CFrameShadow.Plain) {
			painter.setPen(
				palette.color(CPaletteColorRole.WindowText).toCss()
			);
			painter.setLineWidth(lineWidth);
			painter.drawLine(
				center, rect.y(), center, rect.y() + rect.height()
			);
			return;
		}

		const raised = option.frameShadow === CFrameShadow.Raised;
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

	override drawSizeGrip(painter: CPainter, option: CStyleOptionSizeGrip): void
	{
		const rect = option.rect;
		const color = option.palette.color(CPaletteColorRole.Mid);
		painter.setPen(color.toHex());

		const right = rect.width() - 1;
		const bottom = rect.height() - 1;

		for (let i = 0; i < 4; ++i) {
			const offset = i * 3;
			painter.drawLine(right - offset, bottom, right, bottom - offset);
		}
	}

	override drawToolBoxButton(painter: CPainter, button: CToolBoxButton): void
	{
		const palette = button.palette();
		let backgroundRole = CPaletteColorRole.Window;
		let textRole = CPaletteColorRole.Text;

		if (!button.isEnabled()) {
			backgroundRole = CPaletteColorRole.Window;
			textRole = CPaletteColorRole.DisabledText;
		} else if (button.isCurrent() || button.isDown()) {
			backgroundRole = CPaletteColorRole.Highlight;
			textRole = CPaletteColorRole.HighlightedText;
		} else if (button.isHovered()) {
			backgroundRole = CPaletteColorRole.Hover;
			textRole = CPaletteColorRole.Text;
		}

		painter.setFillStyle(palette.color(backgroundRole).toCss());
		painter.fillRect(button.rect());

		painter.setStrokeStyle(palette.color(CPaletteColorRole.Mid).toCss());
		painter.drawLine(0, button.height() - 0.5, button.width(), button.height() - 0.5);

		painter.setPen(palette.color(textRole).toCss());
		painter.setFont(button.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");
		painter.drawText(button.text(), 8, button.height() / 2);
	}

	override drawKeySequenceEdit(painter: CPainter, edit: CKeySequenceEdit): void
	{
		const palette = edit.palette();
		const textRole = edit.isEnabled()
			? CPaletteColorRole.Text
			: CPaletteColorRole.DisabledText;

		painter.setFillStyle(
			palette.color(CPaletteColorRole.Base).toCss()
		);
		painter.fillRect(edit.rect());

		painter.setStrokeStyle(
			palette.color(CPaletteColorRole.WindowText).toCss()
		);
		painter.strokeRect(edit.rect());

		painter.setPen(palette.color(textRole).toCss());
		painter.setFont(edit.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");

		painter.drawText(edit.keySequence(), 5, edit.height() / 2);
	}
}