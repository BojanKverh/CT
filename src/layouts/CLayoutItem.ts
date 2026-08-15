import type { CWidget } from "../widgets/CWidget.js";

export abstract class CLayoutItem {
	abstract widget(): CWidget | null;
}