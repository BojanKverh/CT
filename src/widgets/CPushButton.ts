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

/** Implements the push button widget. */
export class CPushButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;
	#m_radius = 3;
    #m_default = false;
    #icon: CIcon | null = null;
    #iconPosition = CIconPosition.Left;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		this.setCheckable(false);
	}

    /**
     * Checks the button's explicitly configured default flag.
     * @returns `true` if this button was marked as default.
     */
    isDefault(): boolean { return this.#m_default; }

    /**
     * Changes the default flag, registers the button with its containing dialog when enabled and requests repainting.
     * @param value Whether to mark the button as default. Defaults to `true`.
     */
    setDefault(value = true): void {
        if (this.#m_default === value) return;
        this.#m_default = value;
        if (value) this.#defaultDialog()?.setDefaultButton(this);
        this.update();
    }

    /**
     * Reparents the button and registers it as the default in the destination dialog if its default flag is set.
     * @param parent New parent widget, or `null` for a top-level button.
     */
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
	 * Reads the visual pressed state.
	 * @returns `true` while the button is marked as pressed.
	 */
	isDown(): boolean {
		return this.#m_down;
	}

	/**
	 * Reads the pointer hover state.
	 * @returns `true` if the pointer has entered and has not yet left.
	 */
	isHovered(): boolean {
		return this.#m_hovered;
	}

	/**
	 * Reads the stored corner radius.
	 * @returns The configured radius.
	 */
	radius(): number {
		return this.#m_radius;
	}

	/**
	 * Stores a new corner radius.
	 * @param r Radius value to store.
	 */
	setRadius(r: number) {
		this.#m_radius = r;
	}

    /**
     * Reads the icon.
     * @returns The icon.
     */
    icon(): CIcon | null { return this.#icon; }

    /**
     * Sets the icon. May refresh layout geometry and request a repaint.
     * @param icon Icon.
     */
    setIcon(icon: CIcon | null): void {
        this.#icon = icon;
        this.updateGeometry();
        this.update();
    }

    /**
     * Reads the icon position.
     * @returns The icon position.
     */
    iconPosition(): CIconPosition { return this.#iconPosition; }

    /**
     * Sets the icon position. May request a repaint.
     * @param position Icon placement relative to the button caption.
     */
    setIconPosition(position: CIconPosition): void {
        this.#iconPosition = position;
        this.update();
    }

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
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

	/**
	 * Accepts a left-button press, marks the button as down and starts auto-repeat if configured.
	 * @param event Mouse event containing the pressed button.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;
		event.accept();
		this.update();
		
		/** Provides if behavior. */
		if (this.isAutoRepeat())
			this.startAutoRepeat();
	}

	/**
	 * Clears the pressed state on left-button release, stops auto-repeat and emits `clicked` when the button was down and the release is inside.
	 * @param event Mouse event with the released button and local pointer coordinates.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;
		const inside = this.rect().contains(new CPoint(event.x(), event.y()));

		event.accept();
		this.update();
		
		/** Provides if behavior. */
		if (wasDown && inside)
			this.clicked.emit();

		/** Provides if behavior. */
		if (this.isAutoRepeat())
			this.stopAutoRepeat();
	}

	/**
	 * Builds a style option from the current button state and delegates drawing to the active style.
	 * @param painter Painter for the button's local drawing area.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionPushButton();
		option.initFromPushButton(this);

		this.style().drawPushButton(painter, option);
	}

	/**
	 * Sets the hover state, accepts the event and requests repainting.
	 * @param event Mouse event for pointer entry.
	 */
	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	/**
	 * Clears the hover state, accepts the event and requests repainting.
	 * @param event Mouse event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	/**
	 * Marks the button as down for Space and emits `clicked` immediately for Enter or Return.
	 * @param event Key event containing the pressed key.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		/** Provides if behavior. */
		if (event.key() === "Enter" || event.key() === "Return") {
			event.accept();
			this.clicked.emit();
			return;
		}

		event.ignore();
	}

	/**
	 * Accepts Space release, clears the pressed state and emits `clicked` if the button was down.
	 * @param event Key event containing the released key.
	 */
	protected override keyReleaseEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		/** Provides if behavior. */
		if (wasDown)
			this.clicked.emit();
	}
}
