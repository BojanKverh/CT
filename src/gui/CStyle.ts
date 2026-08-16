import type { CPainter } from "../painting/CPainter.js";
import type { CLabel } from "../widgets/CLabel.js";
import type { CPushButton } from "../widgets/CPushButton.js";

export abstract class CStyle {
	abstract drawLabel(painter: CPainter, label: CLabel): void;

	abstract drawPushButton(
		painter: CPainter,
		button: CPushButton
	): void;
}