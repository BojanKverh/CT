import { CAction } from "../core/CAction.js";
import { CApplication } from "../core/CApplication.js";
import { CSignal } from "../core/CSignal.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import type { CFont } from "../gui/CFont.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CStyleOptionNavigationPath, type CNavigationPathSegment } from "../gui/CStyleOptionNavigationPath.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMenu } from "./CMenu.js";
import { CWidget } from "./CWidget.js";

/** A hierarchy path with clickable ancestors and an overflow menu.
 * Activation requests navigation; it never changes the path automatically.
 */
export class CNavigationPath extends CWidget {
    static readonly HorizontalPadding = 8;
    static readonly SeparatorWidth = 14;
    #path: string[] = [];
    #hovered = -2;
    #pressed = -2;
    #focused = -2;
    #spaceDown = false;
    #menu: CMenu | null = null;
    #actions: CAction[] = [];

    readonly activated = new CSignal<[number, string]>();
    readonly pathChanged = new CSignal<[string[]]>();

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Fixed);
    }
    path(): string[] { return [...this.#path]; }
    count(): number { return this.#path.length; }
    currentIndex(): number { return this.#path.length - 1; }
    setPath(path: readonly string[]): void {
        if (path.length === this.#path.length && path.every((text, i) => text === this.#path[i])) return;
        this.#disposeMenu();
        this.#path = [...path];
        this.#hovered = this.#pressed = this.#focused = -2;
        this.#spaceDown = false;
        this.updateGeometry(); this.update();
        this.pathChanged.emit(this.path());
    }
    clear(): void { this.setPath([]); }
    /** A copy of a visible segment's rectangle, or null when it is hidden. */
    segmentRect(index: number): CRect | null {
        return this.#layout().segments.find(segment => segment.index === index)?.rect ?? null;
    }
    overflowButtonRect(): CRect | null { return this.segmentRect(-1); }
    hiddenIndices(): number[] { return this.#layout().hidden; }
    /** The internally owned popup, created lazily when overflow is opened. */
    overflowMenu(): CMenu | null { return this.#menu; }

    override sizeHint(): CSize {
        const fm = new CFontMetrics(this.font());
        return new CSize(this.#path.reduce((sum, text) => sum + this.#width(text, fm), 0)
            + Math.max(0, this.#path.length - 1) * CNavigationPath.SeparatorWidth,
            Math.max(30, Math.ceil(fm.height()) + 12));
    }
    override setFont(font: CFont, propagate = false): void {
        this.#disposeMenu(); super.setFont(font, propagate); this.updateGeometry();
    }
    override setGeometry(x: number, y: number, width: number, height: number): void {
        if (x !== this.x() || y !== this.y() || width !== this.width() || height !== this.height()) {
            this.#disposeMenu(); this.#pressed = -2; this.#spaceDown = false;
        }
        super.setGeometry(x, y, width, height);
    }
    override setEnabled(enabled: boolean): void {
        if (!enabled) { this.#disposeMenu(); this.#pressed = -2; this.#spaceDown = false; }
        super.setEnabled(enabled);
    }
    override hide(): void { this.#disposeMenu(); super.hide(); }
    override destroy(): void { this.#disposeMenu(); super.destroy(); }

    #width(text: string, fm: CFontMetrics): number {
        return Math.ceil(fm.textWidth(text)) + 2 * CNavigationPath.HorizontalPadding;
    }
    #elide(text: string, width: number, fm: CFontMetrics): string {
        if (fm.textWidth(text) <= width) return text;
        if (fm.textWidth("…") > width) return "";
        const chars = Array.from(text);
        let low = 0, high = chars.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (fm.textWidth(chars.slice(0, middle).join("") + "…") <= width) low = middle;
            else high = middle - 1;
        }
        return chars.slice(0, low).join("") + "…";
    }
    #layout(): { segments: CNavigationPathSegment[]; hidden: number[] } {
        const last = this.currentIndex(), width = Math.max(0, this.width()), height = Math.max(0, this.height());
        if (last < 0 || width <= 0 || height <= 0) return { segments: [], hidden: [] };
        const fm = new CFontMetrics(this.font());
        const widths = this.#path.map(text => this.#width(text, fm));
        const gap = CNavigationPath.SeparatorWidth;
        const all = widths.reduce((a, b) => a + b, 0) + last * gap;
        let indices = this.#path.map((_, index) => index);
        if (all > width) {
            indices = [last];
            if (last > 0 && width >= 48) {
                const currentWidth = Math.min(widths[last]!, Math.max(24, Math.floor(width / 2)));
                // Keep the root when possible, then add the closest ancestors.
                const keep: number[] = [];
                const fits = (candidate: number[]): boolean => {
                    const hidden = candidate.length < last;
                    return candidate.reduce((sum, index) => sum + widths[index]!, 0) + currentWidth
                        + (hidden ? 28 : 0) + (candidate.length + (hidden ? 1 : 0)) * gap <= width;
                };
                if (fits([0])) keep.push(0);
                for (let i = last - 1; i >= 0; --i) {
                    if (!keep.includes(i) && fits([...keep, i])) keep.push(i);
                }
                keep.sort((a, b) => a - b);
                const missing = Array.from({ length: last }, (_, i) => i).filter(i => !keep.includes(i));
                // Insert the overflow button where the first omitted section belongs.
                indices = [...keep, last];
                if (missing.length > 0) {
                    const at = indices.findIndex(index => index > missing[0]!);
                    indices.splice(at, 0, -1);
                }
            }
        }
        const hidden = Array.from({ length: last }, (_, i) => i).filter(i => !indices.includes(i));
        const fixed = indices.slice(0, -1).reduce((sum, index) => sum + (index === -1 ? 28 : widths[index]!), 0);
        const currentWidth = Math.max(0, width - fixed - (indices.length - 1) * gap);
        let x = 0;
        const segments = indices.map(index => {
            const w = index === last ? Math.min(widths[last]!, currentWidth) : index === -1 ? 28 : widths[index]!;
            const rect = new CRect(x, 0, w, height); x += w + gap;
            return { index, rect, text: index === -1 ? "…"
                : this.#elide(this.#path[index]!, Math.max(0, w - 16), fm) };
        });
        return { segments, hidden };
    }
    #targets(): number[] { return this.#layout().segments.filter(s => s.index !== this.currentIndex()).map(s => s.index); }
    #focusTarget(): number {
        const targets = this.#targets();
        return targets.includes(this.#focused) ? this.#focused : targets[0] ?? -2;
    }
    #hit(event: CMouseEvent): number {
        return this.#layout().segments.find(segment => segment.index !== this.currentIndex()
            && segment.rect.contains(new CPoint(event.x(), event.y())))?.index ?? -2;
    }
    #activate(index: number): void {
        if (!this.isEnabled()) return;
        if (index === -1) this.showOverflow();
        else if (index >= 0 && index < this.currentIndex()) this.activated.emit(index, this.#path[index]!);
    }
    showOverflow(): void {
        if (!this.isEnabled()) return;
        const layout = this.#layout();
        if (layout.hidden.length === 0 || this.#menu?.isOpen()) return;
        this.#disposeMenu();
        const menu = new CMenu(); this.#menu = menu;
        menu.setFont(this.font()); menu.setPalette(this.palette());
        for (const index of layout.hidden) {
            const action = new CAction(this.#path[index]!);
            action.triggered.connect(() => this.#activate(index));
            this.#actions.push(action); menu.addAction(action);
        }
        menu.closed.connect(() => { this.#pressed = -2; this.update(); });
        const rect = layout.segments.find(segment => segment.index === -1)?.rect;
        const pos = this.mapToCanvas(rect?.x() ?? 0, this.height());
        const device = CApplication.instance().paintDevice();
        const x = Math.max(0, Math.min(pos.x(), device.width() - menu.width()));
        const y = pos.y() + menu.height() <= device.height() ? pos.y()
            : Math.max(0, this.mapToCanvas(0, 0).y() - menu.height());
        menu.setGeometry(x, y, menu.width(), menu.height());
        menu.open(); this.update();
    }
    #disposeMenu(): void {
        const menu = this.#menu; this.#menu = null;
        if (menu !== null) { menu.close(); menu.destroy(); }
        for (const action of this.#actions) action.destroy();
        this.#actions = [];
    }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#pressed = this.#hit(event); this.#focused = this.#pressed; this.#spaceDown = false;
        event.accept(); this.update();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const index = this.#pressed; this.#pressed = -2;
        event.accept(); this.update();
        if (index !== -2 && index === this.#hit(event)) this.#activate(index);
    }
    protected override mouseMoveEvent(event: CMouseEvent): void {
        this.#hovered = this.#hit(event); event.accept(); this.update();
    }
    protected override mouseEnterEvent(event: CMouseEvent): void { this.mouseMoveEvent(event); }
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = -2; event.accept(); this.update(); }
    protected override focusOutEvent(event: CFocusEvent): void {
        this.#pressed = -2; this.#spaceDown = false; super.focusOutEvent(event);
    }
    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() === "ArrowDown" && !event.ctrl() && !event.meta() && this.hiddenIndices().length > 0) {
            this.showOverflow(); event.accept(); return;
        }
        if (event.ctrl() || event.meta() || event.alt()) { event.ignore(); return; }
        const targets = this.#targets();
        if (targets.length === 0) { event.ignore(); return; }
        const current = targets.indexOf(this.#focusTarget());
        switch (event.key()) {
            case "ArrowLeft": this.#focused = targets[Math.max(0, current - 1)]!; break;
            case "ArrowRight": this.#focused = targets[Math.min(targets.length - 1, current + 1)]!; break;
            case "Home": this.#focused = targets[0]!; break;
            case "End": this.#focused = targets[targets.length - 1]!; break;
            case "Enter": case "Return": this.#activate(this.#focusTarget()); break;
            case " ": this.#spaceDown = true; this.#pressed = this.#focusTarget(); break;
            case "Escape": this.#pressed = -2; this.#spaceDown = false; this.#menu?.close(); break;
            default: event.ignore(); return;
        }
        event.accept(); this.update();
    }
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " " || !this.#spaceDown) { event.ignore(); return; }
        const index = this.#pressed;
        this.#spaceDown = false; this.#pressed = -2;
        event.accept(); this.update(); this.#activate(index);
    }
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionNavigationPath(); option.initFrom(this);
        option.segments = this.#layout().segments; option.currentIndex = this.currentIndex();
        option.hoveredIndex = this.#hovered; option.pressedIndex = this.#pressed;
        option.focusedIndex = this.#focusTarget();
        this.style().drawNavigationPath(painter, option);
    }
}
