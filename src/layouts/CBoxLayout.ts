import { CLayout } from "./CLayout.js";

export enum CBoxLayoutDirection {
	LeftToRight,
	TopToBottom
}

export class CBoxLayout extends CLayout {
	#m_direction: CBoxLayoutDirection;

	constructor(direction: CBoxLayoutDirection) {
		super();

		this.#m_direction = direction;
	}

	direction(): CBoxLayoutDirection {
		return this.#m_direction;
	}

    override update(): void {
	    const parent = this.parentWidget();
    	if (parent === null)
	    	return;

    	const count = this.count();

	    if (count === 0)
		    return;

    	const spacing = this.spacing();
	    const totalSpacing = spacing * (count - 1);
	    const margins = this.contentsMargins();

	    if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
		    const availableWidth = parent.width() - margins.left - margins.right
			    - totalSpacing;

		    const widgetWidth = availableWidth / count;
		    let x = margins.left;

		    for (let i = 0; i < count; ++i) {
			    const widget = this.widgetAt(i);
			    if (widget === null)
				    continue;

			    widget.setGeometry( x, margins.top, widgetWidth,
				    parent.height() - margins.top - margins.bottom
			    );

			    x += widgetWidth + spacing;
		    }
	    }   else {
		    const availableHeight = parent.height() - margins.top - margins.bottom
			    - totalSpacing;

		    const widgetHeight = availableHeight / count;

		    let y = margins.top;

		    for (let i = 0; i < count; ++i) {
			    const widget = this.widgetAt(i);
			    if (widget === null)
				    continue;

			    widget.setGeometry(margins.left, y,
                    parent.width() - margins.left - margins.right,
				    widgetHeight
			    );

			    y += widgetHeight + spacing;
		    }
	    }
    }
}