/** @module GUI/CStyleOptionTabWidget */
import { CStyleOption } from "./CStyleOption.js";
import type { CTabWidget } from "../widgets/CTabWidget.js";

/**
 * Contains style information used to render a tab.
 */
export interface CStyleOptionTab {
    /**
    * Caption painted inside this tab.
    */
    text: string;
    /**
    * Logical width allocated to this tab.
    */
    width: number;
    /**
    * Whether this tab can be activated.
    */
    enabled: boolean;
    /**
    * Whether this tab owns the visible page.
    */
    current: boolean;
    /**
    * Whether the pointer is over this tab.
    */
    hovered: boolean;
    /**
    * Whether this tab has an active press interaction.
    */
    pressed: boolean;
}

/**
 * Contains style information used to render a tab widget.
 */
export class CStyleOptionTabWidget extends CStyleOption {
    /**
    * Logical pixel height allocated to the strip above the current page.
    */
    tabHeight = 0;
    /**
    * Ordered tab captions, widths and interaction states painted in the tab strip.
    */
    tabs: CStyleOptionTab[] = [];

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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