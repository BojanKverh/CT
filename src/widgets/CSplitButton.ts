import type { CAction } from "../core/CAction.js";
import { CApplication } from "../core/CApplication.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CStyleOptionSplitButton } from "../gui/CStyleOptionSplitButton.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CMenu } from "./CMenu.js";
import { CPushButton } from "./CPushButton.js";
import type { CWidget } from "./CWidget.js";

type ButtonPart = "main" | "menu" | null;

/** A push button with a separate trailing menu arrow. Menus and actions are borrowed. */
export class CSplitButton extends CPushButton {
    static readonly MenuButtonWidth = 24;
    #menu: CMenu | null = null;
    #action: CAction | null = null;
    #disconnectAction: (() => void) | null = null;
    #disconnectMenu: (() => void) | null = null;
    #pressed: ButtonPart = null;
    #hovered: ButtonPart = null;
    #spaceDown = false;
    #destroying = false;

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.clicked.connect(() => {
            if (!this.isEnabled()) return;
            if (this.#action !== null) this.#action.trigger();
            else if (this.isCheckable()) this.toggle();
        });
    }

    /**
     * Reads the menu.
     * @returns The menu.
     */
    menu(): CMenu | null { return this.#menu; }
    /**
     * Closes and disconnects the old menu, attaches close handling to the new menu and updates preferred geometry.
     * @param menu Menu to open from the dropdown area, or `null` to remove the dropdown.
     */
    setMenu(menu: CMenu | null): void {
        if (menu === this.#menu) return;
        this.hideMenu();
        this.#disconnectMenu?.();
        this.#menu = menu;
        this.#disconnectMenu = menu?.closed.connect(() => {
            this.#pressed = null;
            this.update();
            if (!this.#destroying && CApplication.exists() && this.isVisible() && this.isEnabled()
                && CApplication.instance().focusWidget() === null) this.setFocus();
        }) ?? null;
        this.updateGeometry();
        this.update();
    }

    /**
     * Reads the action.
     * @returns The action.
     */
    defaultAction(): CAction | null { return this.#action; }
    /**
     * Replaces the bound action and synchronizes the button with the new action's properties. Future action changes update the button.
     * @param action Action to bind, or `null` to remove the binding.
     */
    setDefaultAction(action: CAction | null): void {
        if (action === this.#action) return;
        this.#disconnectAction?.();
        this.#action = action;
        const sync = (): void => {
            if (action === null) return;
            this.setText(action.text());
            this.setCheckable(action.isCheckable());
            this.setChecked(action.isChecked());
            this.setEnabled(action.isEnabled());
            this.updateGeometry();
            this.update();
        };
        this.#disconnectAction = action?.changed.connect(sync) ?? null;
        sync();
        this.updateGeometry();
        this.update();
    }

    /**
     * Computes the bounds of the separate menu control along the right edge.
     * @returns Local rectangle with zero width when no menu is assigned.
     */
    menuButtonRect(): CRect {
        const width = this.#menu === null ? 0 : Math.min(CSplitButton.MenuButtonWidth, this.width());
        return new CRect(this.width() - width, 0, width, this.height());
    }
    /**
     * Adds space for the menu control and an action icon, when present, to the base button size.
     * @returns Preferred button dimensions in logical pixels.
     */
    override sizeHint(): CSize {
        const hint = super.sizeHint();
        return new CSize(hint.width() + (this.#menu === null ? 0 : CSplitButton.MenuButtonWidth)
            + (this.#action?.icon() ? 22 : 0), hint.height());
    }
    /**
     * Checks whether the split button is down.
     * @returns `true` if the split button is down, otherwise `false`.
     */
    override isDown(): boolean { return this.#spaceDown || this.#pressed !== null || this.#menu?.isOpen() === true; }
    /**
     * Checks whether the split button is hovered.
     * @returns `true` if the split button is hovered, otherwise `false`.
     */
    override isHovered(): boolean { return this.#hovered !== null; }

    /** Opens the configured nonempty menu for an enabled button, positions it near the button and selects its first selectable entry. */
    showMenu(): void {
        const menu = this.#menu;
        if (!this.isEnabled() || menu === null || menu.count() === 0 || menu.isOpen()) return;
        this.#pressed = null;
        this.#spaceDown = false;
        this.stopAutoRepeat();
        menu.setFont(this.font());
        menu.setPalette(this.palette());
        const origin = this.mapToCanvas(0, this.height());
        const device = CApplication.instance().paintDevice();
        const x = Math.max(0, Math.min(origin.x(), device.width() - menu.width()));
        const top = this.mapToCanvas(0, 0).y();
        const y = origin.y() + menu.height() <= device.height() ? origin.y()
            : Math.max(0, top - menu.height());
        // Popup widgets use canvas coordinates, independently of the button's parent.
        menu.setGeometry(x, y, menu.width(), menu.height());
        menu.selectFirstItem();
        menu.open();
        this.update();
    }
    /** Closes the associated menu if one is assigned. */
    hideMenu(): void { this.#menu?.close(); }

    /**
     * Changes enabled state. Disabling cancels a press and repetition and closes the menu.
     * @param enabled Whether to enable interaction.
     */
    override setEnabled(enabled: boolean): void {
        if (!enabled) {
            this.#pressed = null;
            this.#spaceDown = false;
            this.stopAutoRepeat();
            this.hideMenu();
        }
        super.setEnabled(enabled);
    }
    /** Closes the menu before hiding the split button. */
    override hide(): void { this.hideMenu(); super.hide(); }
    /**
     * Releases resources held by the split button. May update the destroying, the disconnect menu, the disconnect action.
     */
    override destroy(): void {
        this.#destroying = true;
        this.hideMenu();
        this.#disconnectMenu?.();
        this.#disconnectAction?.();
        this.#disconnectMenu = this.#disconnectAction = null;
        this.stopAutoRepeat();
        super.destroy();
    }
    #part(event: CMouseEvent): ButtonPart {
        const point = new CPoint(event.x(), event.y());
        if (!this.rect().contains(point)) return null;
        return this.#menu !== null && this.menuButtonRect().contains(point) ? "menu" : "main";
    }
    /**
     * Tracks which part of the button was pressed on a left click and starts auto-repeat only for the main part when configured.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#pressed = this.#part(event);
        this.#hovered = this.#pressed;
        this.#spaceDown = false;
        if (this.#pressed === "main" && this.isAutoRepeat()) this.startAutoRepeat();
        event.accept(); this.update();
    }
    /**
     * Stops repetition and activates the part where a left press began if the pointer releases over the same part.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const pressed = this.#pressed;
        this.#pressed = null;
        this.stopAutoRepeat();
        event.accept(); this.update();
        if (pressed === null || pressed !== this.#part(event)) return;
        if (pressed === "menu") this.showMenu();
        else this.clicked.emit();
    }
    /**
     * Updates hover styling for whichever part is under the pointer.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void {
        this.#hovered = this.#part(event);
        event.accept(); this.update();
    }
    /**
     * Updates hover styling from the entry position.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseEnterEvent(event: CMouseEvent): void {
        this.#hovered = this.#part(event);
        event.accept(); this.update();
    }
    /**
     * Clears hover styling for both button parts.
     * @param event Mouse event with pointer coordinates local to the control.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        this.#hovered = null;
        event.accept(); this.update();
    }
    /**
     * Handles dropdown shortcuts and main-button keyboard activation.
     * @param event Keyboard event containing the key and modifiers.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        if (!event.ctrl() && !event.meta() && (event.key() === "ArrowDown" || event.key() === "F4")) {
            if (this.#menu === null) { event.ignore(); return; }
            this.showMenu(); event.accept(); return;
        }
        if (event.key() === "Escape" && this.isDown()) {
            this.#pressed = null; this.#spaceDown = false; this.stopAutoRepeat(); this.hideMenu();
            event.accept(); this.update(); return;
        }
        if (event.ctrl() || event.meta() || event.alt()) { event.ignore(); return; }
        if (event.key() === " ") {
            this.#spaceDown = true; event.accept(); this.update(); return;
        }
        if (event.key() === "Enter" || event.key() === "Return") {
            event.accept(); this.clicked.emit(); return;
        }
        event.ignore();
    }
    /**
     * Emits `clicked` when a tracked Space press is released.
     * @param event Keyboard event containing the key and modifiers.
     */
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " ") { event.ignore(); return; }
        const down = this.#spaceDown;
        this.#spaceDown = false;
        event.accept(); this.update();
        if (down) this.clicked.emit();
    }
    /**
     * Cancels pointer and Space presses and stops auto-repeat before forwarding focus exit.
     * @param event Focus exit event.
     */
    protected override focusOutEvent(event: CFocusEvent): void {
        this.#spaceDown = false;
        this.#pressed = null;
        this.stopAutoRepeat();
        super.focusOutEvent(event);
    }
    /**
     * Draws the split button through the supplied painter.
     * @param painter Painter for the current drawing operation.
     */
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionSplitButton();
        option.initFromPushButton(this);
        option.menuWidth = this.menuButtonRect().width();
        option.mainDown = this.#spaceDown || this.#pressed === "main";
        option.menuDown = this.#pressed === "menu" || this.#menu?.isOpen() === true;
        option.mainHovered = this.#hovered === "main";
        option.menuHovered = this.#hovered === "menu";
        option.icon = this.#action?.icon() ?? null;
        this.style().drawSplitButton(painter, option);
    }
}
