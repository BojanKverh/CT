import type { CPainter } from "../painting/CPainter.js";
import type { CLabel } from "../widgets/CLabel.js";
import type { CPushButton } from "../widgets/CPushButton.js";
import type { CCheckBox } from "../widgets/CCheckBox.js";
import type { CLineEdit } from "../widgets/CLineEdit.js";
import type { CSlider } from "../widgets/CSlider.js";
import type { CProgressBar } from "../widgets/CProgressBar.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";
import type { CScrollBar } from "../widgets/CScrollBar.js";
import type { CRadioButton } from "../widgets/CRadioButton.js";
import type { CTabWidget } from "../widgets/CTabWidget.js";
import type { CToolTipWidget } from "../widgets/CToolTipWidget.js";
import type { CFrame } from "../widgets/CFrame.js";
import type { CComboBox } from "../widgets/CComboBox.js";
import type { CToolBar } from "../widgets/CToolBar.js";
import type { CSplitterHandle } from "../widgets/CSplitterHandle.js";
import type { CSizeGrip } from "../widgets/CSizeGrip.js";
import type { CToolBoxButton } from "../widgets/CToolBoxButton.js";
import type { CKeySequenceEdit } from "../widgets/CKeySequenceEdit.js";
import type { CStyleOptionToolButton } from "./CStyleOptionToolButton.js";

export abstract class CStyle {
	
    abstract sliderHandleSize(): number;
    abstract toolTipHorizontalPadding(): number;
    abstract toolTipVerticalPadding(): number;
    abstract comboBoxArrowWidth(): number;
    abstract splitterHandleWidth(): number;

    abstract drawLabel(painter: CPainter, label: CLabel): void;
	abstract drawPushButton(painter: CPainter, button: CPushButton): void;
	abstract drawToolButton(painter: CPainter, option: CStyleOptionToolButton): void;
    abstract drawCheckBox(painter: CPainter, checkBox: CCheckBox): void;
    abstract drawLineEdit(painter: CPainter, lineEdit: CLineEdit): void;
    abstract drawSlider(painter: CPainter, slider: CSlider): void;
    abstract drawProgressBar(painter: CPainter, progressBar : CProgressBar): void;
    abstract drawGroupBox(painter: CPainter, groupBox: CGroupBox): void;
    abstract drawScrollBar(painter: CPainter, scrollBar: CScrollBar): void;
    abstract drawRadioButton(painter: CPainter, radioButton: CRadioButton): void
    abstract drawTabWidget(painter: CPainter, tabWidget: CTabWidget): void
    abstract drawToolTip(painter: CPainter, toolTip: CToolTipWidget): void;
    abstract drawFrame(painter: CPainter, frame: CFrame): void;
    abstract drawComboBox(painter: CPainter, comboBox: CComboBox): void;
    abstract drawToolBar(painter: CPainter, toolBar: CToolBar): void;
    abstract drawSplitterHandle(painter: CPainter, handle: CSplitterHandle): void;
    abstract drawSizeGrip(painter: CPainter, sizeGrip: CSizeGrip): void;
    abstract drawToolBoxButton(painter: CPainter, button: CToolBoxButton): void;
    abstract drawKeySequenceEdit(painter: CPainter, edit: CKeySequenceEdit): void;
}