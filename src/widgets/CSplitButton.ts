/** @module Widgets/CSplitButton */
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

/** A push button with a separate trailing menu arrow. Menus and actions are borrowed.
 *
 * @example
 * With an existing application and parent widget, assign the main action separately from the arrow menu. Keep the borrowed actions and menu available for the lifetime of the button.
 * ```ts
 * import { CWidget, CAction, CMenu, CSplitButton } from "canvas-toolkit-lib";
 *
 * function createSaveMenu(parent: CWidget) {
 *     const save = new CAction("Save");
 *     save.triggered.connect(() => console.log("Save current document"));
 *     const saveCopy = new CAction("Save a copy");
 *     saveCopy.triggered.connect(() => console.log("Save another copy"));
 *     const menu = new CMenu();
 *     menu.addAction(saveCopy);
 *     const button = new CSplitButton(parent);
 *     button.setDefaultAction(save);
 *     button.setMenu(menu);
 *     return button;
 * }
 * ```
 */
export class CSplitButton extends CPushButton {
    /** Logical width reserved for a split button's menu region. */
    static readonly MenuButtonWidth = 24;
    #menu: CMenu | null = null;
    #action: CAction | null = null;
    #disconnectAction: (() => void) | null = null;
    #disconnectMenu: (() => void) | null = null;
    #pressed: ButtonPart = null;
    #hovered: ButtonPart = null;
    #spaceDown = false;
    #destroying = false;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
        super(parent);
        this.clicked.connect(() => {
            if (!this.isEnabled()) return;
            if (this.#action !== null) this.#action.trigger();
            else if (this.isCheckable()) this.toggle();
        });
    }

    /**
    * Assigned popup menu.
    * The initial value is `null`.
    */
    menu(): CMenu | null { return this.#menu; }
    /**
    * Assigns the popup opened by the menu segment.
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
    * Returns the action mirrored and triggered by the main button segment, or null.
    */
    defaultAction(): CAction | null { return this.#action; }
    /**
    * Connects the main segment to an action and updates its presentation from that action.
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
    * Returns the local rectangle of the independent menu segment.
    */
    menuButtonRect(): CRect {
        const width = this.#menu === null ? 0 : Math.min(CSplitButton.MenuButtonWidth, this.width());
        return new CRect(this.width() - width, 0, width, this.height());
    }
    override sizeHint(): CSize {
        const hint = super.sizeHint();
        return new CSize(hint.width() + (this.#menu === null ? 0 : CSplitButton.MenuButtonWidth)
            + (this.#action?.icon() ? 22 : 0), hint.height());
    }
    override isDown(): boolean { return this.#spaceDown || this.#pressed !== null || this.#menu?.isOpen() === true; }
    override isHovered(): boolean { return this.#hovered !== null; }

    /**
    * Opens the assigned popup anchored to this button.
    */
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
    /**
    * Closes the assigned popup.
    */
    hideMenu(): void { this.#menu?.close(); }

    override setEnabled(enabled: boolean): void {
        if (!enabled) {
            this.#pressed = null;
            this.#spaceDown = false;
            this.stopAutoRepeat();
            this.hideMenu();
        }
        super.setEnabled(enabled);
    }
    override hide(): void { this.hideMenu(); super.hide(); }
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
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#pressed = this.#part(event);
        this.#hovered = this.#pressed;
        this.#spaceDown = false;
        if (this.#pressed === "main" && this.isAutoRepeat()) this.startAutoRepeat();
        event.accept(); this.update();
    }
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
    protected override mouseMoveEvent(event: CMouseEvent): void {
        this.#hovered = this.#part(event);
        event.accept(); this.update();
    }
    protected override mouseEnterEvent(event: CMouseEvent): void {
        this.#hovered = this.#part(event);
        event.accept(); this.update();
    }
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        this.#hovered = null;
        event.accept(); this.update();
    }
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
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " ") { event.ignore(); return; }
        const down = this.#spaceDown;
        this.#spaceDown = false;
        event.accept(); this.update();
        if (down) this.clicked.emit();
    }
    protected override focusOutEvent(event: CFocusEvent): void {
        this.#spaceDown = false;
        this.#pressed = null;
        this.stopAutoRepeat();
        super.focusOutEvent(event);
    }
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
