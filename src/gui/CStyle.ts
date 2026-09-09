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

export abstract class CStyle {
	
    abstract sliderHandleSize(): number;
    abstract toolTipHorizontalPadding(): number;
    abstract toolTipVerticalPadding(): number;
    abstract comboBoxArrowWidth(): number;
    abstract splitterHandleWidth(): number;

    abstract drawLabel(painter: CPainter, option: CStyleOptionLabel): void;
    abstract drawPushButton(painter: CPainter, option: CStyleOptionPushButton): void;
	abstract drawToolButton(painter: CPainter, option: CStyleOptionToolButton): void;
    abstract drawCheckBox(painter: CPainter, option: CStyleOptionCheckBox): void;
    abstract drawLineEdit(painter: CPainter, option: CStyleOptionLineEdit): void;
    abstract drawSlider(painter: CPainter, option: CStyleOptionSlider): void;
    abstract drawProgressBar(painter: CPainter, option: CStyleOptionProgressBar): void;
    abstract drawGroupBox(painter: CPainter, option: CStyleOptionGroupBox): void;
    abstract drawScrollBar(painter: CPainter, option: CStyleOptionScrollBar): void;
    abstract drawRadioButton(painter: CPainter, option: CStyleOptionRadioButton): void
    abstract drawTabWidget(painter: CPainter, option: CStyleOptionTabWidget): void
    abstract drawToolTip(painter: CPainter, option: CStyleOptionToolTipWidget): void;
    abstract drawFrame(painter: CPainter, option: CStyleOptionFrame): void;
    abstract drawComboBox(painter: CPainter, option: CStyleOptionComboBox): void;
    abstract drawToolBar(painter: CPainter, option: CStyleOptionToolBar): void;
    abstract drawSplitterHandle(painter: CPainter, option: CStyleOptionSplitterHandle): void;
    abstract drawSizeGrip(painter: CPainter, option: CStyleOptionSizeGrip): void;
    abstract drawToolBoxButton(painter: CPainter, option: CStyleOptionToolBoxButton): void;
    abstract drawKeySequenceEdit(painter: CPainter, option: CStyleOptionKeySequenceEdit): void;
}