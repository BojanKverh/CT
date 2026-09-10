import type { CPainter } from "../painting/CPainter.js";
import type { CStyleOptionToolButton } from "./CStyleOptionToolButton.js";
import type { CStyleOptionPushButton } from "./CStyleOptionPushButton.js";
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