import type { CStyleOptionSplitButton } from "./CStyleOptionSplitButton.js";
import { CStyleState } from "./CStyleOption.js";
import { CPaletteColorRole } from "./CPalette.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CFontMetrics } from "./CFontMetrics.js";
import { CIconMode, CIconState } from "./CIcon.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CStyleOptionToolButton } from "./CStyleOptionToolButton.js";
import { CStyleOptionPushButton } from "./CStyleOptionPushButton.js";
import type { CStyleOptionCheckBox } from "./CStyleOptionCheckBox.js";
import type { CStyleOptionRadioButton } from "./CStyleOptionRadioButton.js";
import type { CStyleOptionComboBox } from "./CStyleOptionComboBox.js";
import type { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import type { CStyleOptionSlider } from "./CStyleOptionSlider.js";
import type { CStyleOptionScrollBar } from "./CStyleOptionScrollBar.js"
import type { CStyleOptionProgressBar } from "./CStyleOptionProgressBar.js";
import type { CStyleOptionToolBar } from "./CStyleOptionToolBar.js";
import type { CStyleOptionSizeGrip } from "./CStyleOptionSizeGrip.js";
import type { CStyleOptionFrame } from "./CStyleOptionFrame.js";
import type { CStyleOptionGroupBox } from "./CStyleOptionGroupBox.js";
import type { CStyleOptionToolBoxButton } from "./CStyleOptionToolBoxButton.js";
import type { CStyleOptionSplitterHandle } from "./CStyleOptionSplitterHandle.js";
import type { CStyleOptionKeySequenceEdit } from "./CStyleOptionKeySequenceEdit.js";
import type { CStyleOptionTabWidget } from "./CStyleOptionTabWidget.js";
import type { CStyleOptionLabel } from "./CStyleOptionLabel.js";
import type { CStyleOptionToolTipWidget } from "../gui/CStyleOptionToolTipWidget.js";

/**
 * Defines the abstract interface used to render Canvas Toolkit widgets.
 */
export abstract class CStyle {

    /** Draws both parts using the style's push button renderer and palette. */
    drawSplitButton(painter: CPainter, option: CStyleOptionSplitButton): void {
        const r = option.rect;
        if (r.width() <= 0 || r.height() <= 0) return;
        const menuWidth = Math.min(r.width(), Math.max(0, option.menuWidth));
        const mainWidth = r.width() - menuWidth;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        const paintPart = (clip: CRect, down: boolean, hovered: boolean): void => {
            if (clip.width() <= 0) return;
            const part = new CStyleOptionPushButton(option);
            part.text = "";
            part.state &= ~(CStyleState.Sunken | CStyleState.MouseOver | CStyleState.HasFocus);
            if (down) part.state |= CStyleState.Sunken;
            if (hovered) part.state |= CStyleState.MouseOver;
            painter.save();
            try { painter.clipRect(clip); this.drawPushButton(painter, part); }
            finally { painter.restore(); }
        };
        paintPart(new CRect(r.x(), r.y(), mainWidth, r.height()), option.mainDown, option.mainHovered);
        paintPart(new CRect(r.x() + mainWidth, r.y(), menuWidth, r.height()), option.menuDown, option.menuHovered);
        const role = !enabled ? CPaletteColorRole.DisabledText
            : option.mainDown ? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText;
        painter.save();
        try {
            painter.clipRect(r);
            painter.setFont(option.font);
            painter.setTextAlign("center");
            painter.setTextBaseline("middle");
            painter.setPen(option.palette.color(role).toCss());
            if (mainWidth > 0) {
                painter.save();
                try {
                    painter.clipRect(new CRect(r.x(), r.y(), mainWidth, r.height()));
                    const pixmap = option.icon?.pixmap(new CSize(16, 16), enabled ? CIconMode.Normal : CIconMode.Disabled,
                        (option.state & CStyleState.On) !== 0 ? CIconState.On : CIconState.Off) ?? null;
                    let textX = r.x() + mainWidth / 2;
                    if (pixmap !== null && mainWidth > 24 && r.height() > 8) {
                        const side = Math.min(16, r.height() - 8);
                        const textWidth = new CFontMetrics(option.font).textWidth(option.text);
                        const left = r.x() + Math.max(4, (mainWidth - textWidth - side - 6) / 2);
                        painter.drawPixmap(pixmap, left, r.y() + (r.height() - side) / 2, side, side);
                        textX = left + side + 6 + textWidth / 2;
                    }
                    painter.drawText(option.text, textX, r.y() + r.height() / 2);
                } finally { painter.restore(); }
            }
            if (menuWidth > 0) {
                const x = r.x() + mainWidth;
                painter.setPen(option.palette.color(CPaletteColorRole.Mid).toCss());
                painter.setLineWidth(1);
                if (r.height() > 8) painter.drawLine(x, r.y() + 4, x, r.y() + r.height() - 4);
                const arrowRole = !enabled ? CPaletteColorRole.DisabledText
                    : option.menuDown ? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText;
                painter.setPen(option.palette.color(arrowRole).toCss());
                const cx = x + menuWidth / 2, cy = r.y() + r.height() / 2;
                const d = Math.min(3, Math.max(0, (menuWidth - 4) / 2), Math.max(0, (r.height() - 4) / 2));
                if (d > 0) {
                    painter.drawLine(cx - d, cy - d / 2, cx, cy + d / 2);
                    painter.drawLine(cx, cy + d / 2, cx + d, cy - d / 2);
                }
            }
            if (enabled && (option.state & CStyleState.HasFocus) !== 0 && r.width() > 8 && r.height() > 8) {
                painter.setBrush(option.palette.color(CPaletteColorRole.ButtonText).toCss());
                for (let x = r.x() + 4; x < r.right() - 4; x += 2) {
                    painter.fillRect(new CRect(x, r.y() + 4, 1, 1));
                    painter.fillRect(new CRect(x, r.bottom() - 5, 1, 1));
                }
                for (let y = r.y() + 6; y < r.bottom() - 5; y += 2) {
                    painter.fillRect(new CRect(r.x() + 4, y, 1, 1));
                    painter.fillRect(new CRect(r.right() - 5, y, 1, 1));
                }
            }
        } finally { painter.restore(); }
    }

	
        /**
     * Returns the slider handle size used by the style.
     *
     * @returns The resulting value.
     */
abstract sliderHandleSize(): number;
        /**
     * Returns the tool tip horizontal padding used by the style.
     *
     * @returns The resulting value.
     */
abstract toolTipHorizontalPadding(): number;
        /**
     * Returns the tool tip vertical padding used by the style.
     *
     * @returns The resulting value.
     */
abstract toolTipVerticalPadding(): number;
        /**
     * Returns the combo box arrow width used by the style.
     *
     * @returns The resulting value.
     */
abstract comboBoxArrowWidth(): number;
        /**
     * Returns the splitter handle width used by the style.
     *
     * @returns The resulting value.
     */
abstract splitterHandleWidth(): number;

        /**
     * Draws the label using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawLabel(painter: CPainter, option: CStyleOptionLabel): void;
        /**
     * Draws the push button using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawPushButton(painter: CPainter, option: CStyleOptionPushButton): void;
		/**
	 * Draws the tool button using the supplied painter and style option.
	 *
	 * @param painter Painter.
	 * @param option Option.
	 */
abstract drawToolButton(painter: CPainter, option: CStyleOptionToolButton): void;
        /**
     * Draws the check box using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawCheckBox(painter: CPainter, option: CStyleOptionCheckBox): void;
        /**
     * Draws the line edit using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawLineEdit(painter: CPainter, option: CStyleOptionLineEdit): void;
        /**
     * Draws the slider using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawSlider(painter: CPainter, option: CStyleOptionSlider): void;
        /**
     * Draws the dial using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawDial(painter: CPainter, option: CStyleOptionSlider): void;
        /**
     * Draws the progress bar using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawProgressBar(painter: CPainter, option: CStyleOptionProgressBar): void;
        /**
     * Draws the group box using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawGroupBox(painter: CPainter, option: CStyleOptionGroupBox): void;
        /**
     * Draws the scroll bar using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawScrollBar(painter: CPainter, option: CStyleOptionScrollBar): void;
        /**
     * Draws the radio button using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawRadioButton(painter: CPainter, option: CStyleOptionRadioButton): void
        /**
     * Draws the tab widget using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawTabWidget(painter: CPainter, option: CStyleOptionTabWidget): void
        /**
     * Draws the tool tip using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawToolTip(painter: CPainter, option: CStyleOptionToolTipWidget): void;
        /**
     * Draws the frame using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawFrame(painter: CPainter, option: CStyleOptionFrame): void;
        /**
     * Draws the combo box using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawComboBox(painter: CPainter, option: CStyleOptionComboBox): void;
        /**
     * Draws the tool bar using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawToolBar(painter: CPainter, option: CStyleOptionToolBar): void;
        /**
     * Draws the splitter handle using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawSplitterHandle(painter: CPainter, option: CStyleOptionSplitterHandle): void;
        /**
     * Draws the size grip using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawSizeGrip(painter: CPainter, option: CStyleOptionSizeGrip): void;
        /**
     * Draws the tool box button using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawToolBoxButton(painter: CPainter, option: CStyleOptionToolBoxButton): void;
        /**
     * Draws the key sequence edit using the supplied painter and style option.
     *
     * @param painter Painter.
     * @param option Option.
     */
abstract drawKeySequenceEdit(painter: CPainter, option: CStyleOptionKeySequenceEdit): void;
}