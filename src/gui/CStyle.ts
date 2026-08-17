import type { CPainter } from "../painting/CPainter.js";
import type { CLabel } from "../widgets/CLabel.js";
import type { CPushButton } from "../widgets/CPushButton.js";
import type { CCheckBox } from "../widgets/CCheckBox.js";
import type { CLineEdit } from "../widgets/CLineEdit.js";
import type { CSlider } from "../widgets/CSlider.js";

export abstract class CStyle {
	
    abstract drawLabel(painter: CPainter, label: CLabel): void;
	abstract drawPushButton(painter: CPainter, button: CPushButton): void;
    abstract drawCheckBox(painter: CPainter, checkBox: CCheckBox): void;
    abstract drawLineEdit(painter: CPainter, lineEdit: CLineEdit): void;
    abstract drawSlider(painter: CPainter, slider: CSlider): void;

}