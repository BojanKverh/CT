import { CStyleOption } from "./CStyleOption.js";
import type { CTabWidget } from "../widgets/CTabWidget.js";

/**
 * Contains style information used to render a tab.
 */
export interface CStyleOptionTab {
		/**
	 * The text value.
	 */
text: string;
		/**
	 * The width value.
	 */
width: number;
		/**
	 * The enabled value.
	 */
enabled: boolean;
		/**
	 * The current value.
	 */
current: boolean;
		/**
	 * The hovered value.
	 */
hovered: boolean;
		/**
	 * The pressed value.
	 */
pressed: boolean;
}

/**
 * Contains style information used to render a tab widget.
 */
export class CStyleOptionTabWidget extends CStyleOption {
		/**
	 * Returns or updates the tab height value.
	 */
tabHeight = 0;
		/**
	 * Returns or updates the tabs value.
	 */
tabs: CStyleOptionTab[] = [];

		/**
	 * Creates a new CStyleOptionTabWidget instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionTabWidget | null = null) {
		super(other);

		if (other) {
			this.tabHeight = other.tabHeight;
			this.tabs = other.tabs.map(tab => ({ ...tab }));
		}
	}

		/**
	 * Initializes this style option from the specified tab widget.
	 *
	 * @param tabWidget Tab widget.
	 */
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