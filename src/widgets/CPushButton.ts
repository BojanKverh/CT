/** @module Widgets/CPushButton */
import type { CDialog } from "../dialogs/CDialog.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CPoint } from "../geometry/CPoint.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CSize } from "../geometry/CSize.js";
import type { CIcon } from "../gui/CIcon.js";
import { CIconPosition, CStyleOptionPushButton } from "../gui/CStyleOptionPushButton.js";

/**
 * Captioned action button supporting mouse, Space and Enter activation.
 * The inherited clicked signal reports activation. An optional CIcon appears
 * beside the caption; iconPosition() chooses its side.
 *
 * @example
 * Create CApplication first. This factory loads a same-origin icon before returning a button; replace the logging callback with the application save operation.
 * ```ts
 * import { CIcon, CPixmap, CPushButton, CWidget } from "canvas-toolkit-lib";
 *
 * async function createSaveButton(parent: CWidget): Promise<CPushButton> {
 *     const button = new CPushButton(parent);
 *     button.setText("Save");
 *     button.clicked.connect(() => console.log("Save requested"));
 *     const pixmap = await CPixmap.fromUrl("/icons/save.png");
 *     button.setIcon(new CIcon(pixmap));
 *     return button;
 * }
 * ```
 */
export class CPushButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;
	#m_radius = 3;
    #m_default = false;
    #icon: CIcon | null = null;
    #iconPosition = CIconPosition.Left;

    /**
    * Creates a non-checkable push button with no icon, 3-pixel corner radius and default-button status disabled.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
		this.setCheckable(false);
	}

    /** Whether this is the explicitly configured default button. */
    isDefault(): boolean { return this.#m_default; }

    /** Makes this the default button of its containing dialog. */
    setDefault(value = true): void {
        if (this.#m_default === value) return;
        this.#m_default = value;
        if (value) this.#defaultDialog()?.setDefaultButton(this);
        this.update();
    }

    override setParent(parent: CWidget | null): void {
        if (this.parent() === parent) return;
        super.setParent(parent);
        if (this.#m_default) this.#defaultDialog()?.setDefaultButton(this);
    }

    #defaultDialog(): CDialog | null {
        for (let owner = this.parent(); owner !== null; owner = owner.parent()) {
            const dialog = owner as CDialog;
            if (typeof dialog.defaultButton === "function"
                && typeof dialog.setDefaultButton === "function") return dialog;
        }
        return null;
    }

    /**
    * Reports the transient pressed appearance set by mouse or Space handling.
    */
    isDown(): boolean {
		return this.#m_down;
	}

    /**
    * Reports whether pointer hover feedback is active.
    */
    isHovered(): boolean {
		return this.#m_hovered;
	}

    /**
    * Logical corner radius used when painting the control.
    * The initial value is `3`.
    */
    radius(): number {
		return this.#m_radius;
	}

    /**
    * Changes the corner radius used by the style on subsequent paints.
    */
    setRadius(r: number) {
		this.#m_radius = r;
	}

    /**
    * Assigned icon used by the control's drawing style.
    * The initial value is `null`.
    */
    icon(): CIcon | null { return this.#icon; }

    /**
    * Assigns an icon or removes it with null. Updates preferred geometry and schedules repaint. Artwork loads before assignment through CPixmap.fromUrl().
    */
    setIcon(icon: CIcon | null): void {
        this.#icon = icon;
        this.updateGeometry();
        this.update();
    }

    /**
    * Returns the icon's side relative to the caption. Defaults to CIconPosition.Left.
    */
    iconPosition(): CIconPosition { return this.#iconPosition; }

    /**
    * Places the icon to the left or right of the caption and schedules repaint.
    */
    setIconPosition(position: CIconPosition): void {
        this.#iconPosition = position;
        this.update();
    }

    /**
    * Computes preferred width from caption, icon and spacing. Height is 30 logical pixels; enclosing layouts still apply size policies and bounds.
    */
    override sizeHint(): CSize {
		const fm = new CFontMetrics(this.font());
        const text = this.text();
        const iconWidth = this.#icon && !this.#icon.isNull()
            ? CStyleOptionPushButton.IconExtent + (text ? CStyleOptionPushButton.IconSpacing : 0)
            : 0;
        const width = fm.textWidth(text);
        return new CSize(iconWidth > 0 ? width + iconWidth + 12 : Math.max(80, width + 24), 30);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;
		event.accept();
		this.update();

		if (this.isAutoRepeat())
			this.startAutoRepeat();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;
		const inside = this.rect().contains(new CPoint(event.x(), event.y()));

		event.accept();
		this.update();

		if (wasDown && inside)
			this.clicked.emit();

		if (this.isAutoRepeat())
			this.stopAutoRepeat();
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionPushButton();
		option.initFromPushButton(this);

		this.style().drawPushButton(painter, option);
	}

	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		if (event.key() === "Enter" || event.key() === "Return") {
			event.accept();
			this.clicked.emit();
			return;
		}

		event.ignore();
	}

	protected override keyReleaseEvent(event: CKeyEvent): void {
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		if (wasDown)
			this.clicked.emit();
	}
}
