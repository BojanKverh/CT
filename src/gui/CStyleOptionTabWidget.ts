import { CStyleOption } from "./CStyleOption.js";
import type { CTabWidget } from "../widgets/CTabWidget.js";

export interface CStyleOptionTab {
	text: string;
	width: number;
	enabled: boolean;
	current: boolean;
	hovered: boolean;
	pressed: boolean;
}

export class CStyleOptionTabWidget extends CStyleOption {
	tabHeight = 0;
	tabs: CStyleOptionTab[] = [];

	constructor(other: CStyleOptionTabWidget | null = null) {
		super(other);

		if (other) {
			this.tabHeight = other.tabHeight;
			this.tabs = other.tabs.map(tab => ({ ...tab }));
		}
	}

	initFromTabWidget(tabWidget: CTabWidget): void {
		this.initFrom(tabWidget);

		this.tabHeight = tabWidget.tabHeight();
		this.tabs = [];

		for (let i = 0; i < tabWidget.count(); ++i) {
			this.tabs.push({
				text: tabWidget.tabText(i),
				width: tabWidget.tabWidth(i),
				enabled: tabWidget.isTabEnabled(i),
				current: i === tabWidget.currentIndex(),
				hovered: tabWidget.isTabHovered(i),
				pressed: tabWidget.isTabPressed(i)
			});
		}
	}
}