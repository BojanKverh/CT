import { CVariantAnimation } from "../animation/CVariantAnimation.js";
import { CEasingCurveType } from "../animation/CEasingCurve.js";
import { CRect } from "../geometry/CRect.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CScrollArea } from "../widgets/CScrollArea.js";
import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CLabel } from "../widgets/CLabel.js";
import { CPushButton } from "../widgets/CPushButton.js";
import { CStackedWidget } from "../widgets/CStackedWidget.js";
import { CWidget } from "../widgets/CWidget.js";
import { CWizardPage } from "../widgets/CWizardPage.js";
import { CDialog } from "./CDialog.js";

export enum CWizardButton { BackButton, NextButton, FinishButton, CancelButton, SkipButton }
type Visit = { id: number; deferred: number[]; completed: number[] };

/** A branching wizard with history and a FIFO queue of deferred steps. */
export class CWizardDialog extends CDialog {
    #pages = new Map<number, CWizardPage>();
    #disconnect = new Map<number, Array<() => void>>();
    #stack: CWizardPageStack;
    #stepListVisible = true;
    #stepList: CScrollArea;
    #stepContent: CWizardStepListContent;
    #title: CLabel;
    #subTitle: CLabel;
    #buttons = new Map<CWizardButton, CPushButton>();
    #start = -1;
    #current = -1;
    #history: Visit[] = [];
    #deferred: number[] = [];
    #completed = new Set<number>();
    #initialized = new Set<number>();
    #busy = false;
    #transitionsEnabled = true;
    #transitionDuration = 280;
    #transition: { animation: CVariantAnimation; outgoing: CWizardPage; incoming: CWizardPage;
        outgoingEnabled: boolean; incomingEnabled: boolean } | null = null;
    readonly currentIdChanged = new CSignal<[number]>();
    readonly pageDeferred = new CSignal<[number]>();

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.#title = new CLabel(this);
        const font = this.#title.font(); font.setPixelSize(22); this.#title.setFont(font);
        this.#subTitle = new CLabel(this); this.#subTitle.setWordWrap(true);
        this.#stack = new CWizardPageStack(this);
        this.#stepList = new CScrollArea(this);
        this.#stepList.setFocusPolicy(CFocusPolicy.NoFocus);
        this.#stepContent = new CWizardStepListContent(this.#stepList, () => this.#stepEntries());
        this.#stepList.setWidget(this.#stepContent);
        const definitions: Array<[CWizardButton, string, () => void]> = [
            [CWizardButton.BackButton, "Back", () => this.back()],
            [CWizardButton.NextButton, "Next", () => this.next()],
            [CWizardButton.FinishButton, "Finish", () => this.accept()],
            [CWizardButton.CancelButton, "Cancel", () => this.reject()],
            [CWizardButton.SkipButton, "Skip for now", () => this.skipForNow()]
        ];
        for (const [role, text, callback] of definitions) {
            const button = new CPushButton(this); button.setText(text); button.clicked.connect(callback);
            this.#buttons.set(role, button);
        }
        this.resize(640, 440);
        this.#refresh();
    }
    /**
     * Supplies the default preferred size of the wizard body.
     * @returns A new size of 640 by 440 logical pixels.
     */
    override sizeHint(): CSize { return new CSize(640, 440); }
    /**
     * Reads whether page changes can use slide animations.
     * @returns `true` if transitions are enabled.
     */
    transitionsEnabled(): boolean { return this.#transitionsEnabled; }
    /**
     * Changes whether future navigation can animate. Disabling transitions immediately settles any active slide.
     * @param enabled Whether to enable page slide transitions.
     */
    setTransitionsEnabled(enabled: boolean): void {
        this.#transitionsEnabled = enabled;
        if (!enabled) this.#finishTransition();
    }
    /**
     * Reads the configured slide duration.
     * @returns Transition time in milliseconds.
     */
    transitionDuration(): number { return this.#transitionDuration; }
    /**
     * Sets the page slide duration. Zero settles the active slide and suppresses animation on future navigation.
     * @param duration Finite nonnegative duration in milliseconds. Invalid values throw `RangeError`.
     */
    setTransitionDuration(duration: number): void {
        if (!Number.isFinite(duration) || duration < 0) throw new RangeError("Transition duration must be finite and nonnegative.");
        this.#transitionDuration = duration;
        if (duration === 0) this.#finishTransition();
    }
    /**
     * Reads whether the wizard is configured to show the informational step list.
     * @returns `true` if the sidebar is enabled.
     */
    stepListVisible(): boolean { return this.#stepListVisible; }
    /**
     * Shows or hides the informational step list and recalculates the page area.
     * @param visible Whether to show the step sidebar.
     */
    setStepListVisible(visible: boolean): void {
        if (visible === this.#stepListVisible) return;
        this.#stepListVisible = visible;
        this.#layoutContents(); this.#updateStepList();
    }
    /**
     * Looks up a navigation control by role.
     * @param role Supported wizard button role, such as Next, Back, Finish, Skip or Cancel.
     * @returns The button for the supplied role.
     */
    button(role: CWizardButton): CPushButton { return this.#buttons.get(role)!; }
    /**
     * Lists the currently registered page identifiers.
     * @returns A new array of page IDs sorted numerically.
     */
    pageIds(): number[] { return [...this.#pages.keys()].sort((a, b) => a - b); }
    /**
     * Looks up a registered wizard page.
     * @param id Page identifier to look up.
     * @returns The registered page, or `null` if no page has that ID.
     */
    page(id: number): CWizardPage | null { return this.#pages.get(id) ?? null; }
    /**
     * Reads the current navigation position.
     * @returns Current page ID, or `-1` if no page is active.
     */
    currentId(): number { return this.#current; }
    /**
     * Looks up the active wizard page.
     * @returns The active page, or `null` if no page is active.
     */
    currentPage(): CWizardPage | null { return this.page(this.#current); }
    /**
     * Lists the current navigation history with the active page appended. Backtracking removes entries from this history.
     * @returns A new array of page IDs in visit order.
     */
    visitedIds(): number[] { return [...this.#history.map(visit => visit.id), ...(this.#current < 0 ? [] : [this.#current])]; }
    /**
     * Lists pages set aside through Skip for Now.
     * @returns A new array of deferred page IDs in queue order.
     */
    deferredPageIds(): number[] { return [...this.#deferred]; }
    /**
     * Resolves the configured start page or falls back to the lowest registered ID.
     * @returns Effective start page ID, or `-1` when no page is registered.
     */
    startId(): number { return this.#start >= 0 ? this.#start : this.pageIds()[0] ?? -1; }
    /**
     * Changes the page selected on the next restart. An unknown explicit ID throws.
     * @param id Registered page ID, or `-1` to use the lowest registered ID.
     */
    setStartId(id: number): void {
        if (id !== -1 && !this.#pages.has(id)) throw new Error("Unknown wizard start page.");
        this.#start = id;
    }
    /**
     * Registers a page under the next ID above the highest registered ID.
     * @param page Unattached wizard page to register.
     * @returns Assigned page ID, starting at zero for an empty wizard.
     */
    addPage(page: CWizardPage): number {
        const ids = this.pageIds();
        const id = (ids[ids.length - 1] ?? -1) + 1;
        this.setPage(id, page); return id;
    }
    /**
     * Registers and attaches a page, then updates navigation. The first page starts the initial run. Re-registering the same page at the same ID has no effect.
     * @param id Unique nonnegative safe integer identifier.
     * @param page Unattached page to register.
     */
    setPage(id: number, page: CWizardPage): void {
        if (!Number.isSafeInteger(id) || id < 0) throw new Error("Invalid wizard page ID.");
        if (this.page(id) === page) return;
        if (this.#pages.has(id) || [...this.#pages.values()].includes(page) || page.wizard() !== null)
            throw new Error("Wizard page or ID is already registered.");
        this.#pages.set(id, page); page.attachWizard(this);
        this.#stack.addWidget(page);
        this.#disconnect.set(id, [page.completeChanged.connect(() => this.#refresh()), page.changed.connect(() => this.#refresh())]);
        if (this.#current === -1) this.restart(); else this.#refresh();
    }
    /**
     * Detaches a page without destroying it, clears its connections and restarts navigation. If the page was explicitly configured as the start page, automatic start selection resumes.
     * @param id ID of the page to remove.
     * @returns Detached page, or `null` if the ID was absent.
     */
    removePage(id: number): CWizardPage | null {
        const page = this.page(id); if (page === null) return null;
        this.#finishTransition();
        for (const disconnect of this.#disconnect.get(id) ?? []) disconnect();
        this.#disconnect.delete(id); this.#pages.delete(id);
        this.#stack.removeWidget(this.#stack.indexOf(page)); page.attachWizard(null);
        if (this.#start === id) this.#start = -1;
        this.restart(); return page;
    }
    /** Clears visit history, deferred and completed pages and initialization tracking, then shows the effective start page. Page widgets retain their data. */
    restart(): void {
        if (this.#busy) return;
        this.#finishTransition();
        this.#history = []; this.#deferred = []; this.#completed.clear(); this.#initialized.clear();
        this.#showPage(this.startId());
    }
    /** Starts a new navigation run, opens the dialog and focuses the current page. An already open wizard is left as-is. */
    override open(): void {
        if (this.isOpen()) return;
        this.restart(); super.open(); this.#focusPage();
    }
    /** Validates the completed current page and advances along the normal or deferred route. Accepts when no step remains and stays in place when the route or validation fails. */
    next(): void {
        this.#navigate(() => {
            const page = this.currentPage();
            if (page === null || !page.isComplete() || !page.validatePage()) { this.#refresh(); return; }
            const target = this.#nextTarget();
            if (target === null) { this.#refresh(); return; }
            if (target === -1) { this.#completeCurrent(); super.accept(); return; }
            this.#saveVisit();
            this.#completed.add(this.#current);
            this.#deferred = this.#deferred.filter(id => id !== this.#current);
            this.#showPage(target, 1);
        });
    }
    /** Finishes only when the current page is complete, validation succeeds and neither a normal nor a deferred step remains. */
    override accept(): void {
        this.#navigate(() => {
            const page = this.currentPage();
            if (page === null || !page.isComplete() || this.#nextTarget() !== -1) return;
            if (page.validatePage() && this.#nextTarget() === -1) { this.#completeCurrent(); super.accept(); }
            else this.#refresh();
        });
    }
    /** Returns to the previous visit and restores its saved deferred and completed state. Has no effect if there is no history. */
    back(): void {
        this.#navigate(() => {
            const visit = this.#history.pop(); if (visit === undefined) return;
            this.#deferred = [...visit.deferred]; this.#completed = new Set(visit.completed);
            this.#showPage(visit.id, -1);
        });
    }
    /** Defers the current page without validating it if the page permits deferral and there is another reachable step. Emits `pageDeferred` after advancing. */
    skipForNow(): void {
        this.#navigate(() => {
            if (!this.currentPage()?.isDeferrable()) return;
            const target = this.#nextTarget();
            if (target === null || target === -1 || target === this.#current) return;
            const id = this.#current;
            this.#saveVisit();
            this.#deferred = [...this.#deferred.filter(other => other !== id), id];
            this.#showPage(target, 1); this.pageDeferred.emit(id);
        });
    }
    #navigate(action: () => void): void {
        if (this.#busy) return;
        this.#busy = true; try { action(); } finally { this.#busy = false; }
    }
    #completeCurrent(): void {
        this.#completed.add(this.#current);
        this.#deferred = this.#deferred.filter(id => id !== this.#current);
        this.#updateStepList();
    }
    #saveVisit(): void {
        this.#history.push({ id: this.#current, deferred: [...this.#deferred], completed: [...this.#completed] });
    }
    /** null means an invalid/cyclic route: neither Next nor Finish may proceed. */
    #nextTarget(): number | null {
        let id = this.currentPage()?.nextId() ?? -1;
        const seen = new Set<number>([this.#current]);
        while (id !== -1) {
            if (!Number.isSafeInteger(id) || !this.#pages.has(id) || seen.has(id)) return null;
            seen.add(id);
            if (!this.#completed.has(id) && !this.#deferred.includes(id)) return id;
            id = this.page(id)!.nextId();
        }
        return this.#deferred.find(id => id !== this.#current && this.#pages.has(id)) ?? -1;
    }
    #showPage(id: number, direction = 0): void {
        this.#finishTransition();
        const outgoing = this.currentPage();
        const previous = this.#current; this.#current = id;
        const page = this.currentPage();
        if (page !== null) {
            this.#stack.setCurrentWidget(page);
            if (!this.#initialized.has(id)) { this.#initialized.add(id); page.initializePage(); }
        }
        if (page !== null && outgoing !== null && page !== outgoing && direction !== 0
            && this.isOpen() && this.isVisible() && this.#transitionsEnabled && this.#transitionDuration > 0
            && this.#stack.width() > 0 && typeof requestAnimationFrame === "function"
            && typeof cancelAnimationFrame === "function") this.#startTransition(outgoing, page, direction);
        this.#refresh(); this.#focusPage();
        if (id !== previous) this.currentIdChanged.emit(id);
    }
    #startTransition(outgoing: CWizardPage, incoming: CWizardPage, direction: number): void {
        const animation = new CVariantAnimation();
        animation.setDuration(this.#transitionDuration);
        animation.setEasingCurve(CEasingCurveType.InOutQuad);
        const transition = { animation, outgoing, incoming,
            outgoingEnabled: outgoing.isEnabled(), incomingEnabled: incoming.isEnabled() };
        this.#transition = transition;
        this.#stack.setTransitioning(true);
        // Keep both pages inside the stack's existing paint clip. Neither page accepts
        // input during motion; the dialog buttons remain available for rapid navigation.
        outgoing.setEnabled(false); incoming.setEnabled(false); outgoing.show();
        const width = this.#stack.width();
        incoming.move(direction * width, 0);
        animation.valueChanged.connect(progress => {
            if (this.#transition !== transition) return;
            outgoing.move(-direction * width * progress || 0, 0);
            incoming.move(direction * width * (1 - progress) || 0, 0);
        });
        animation.finished.connect(() => {
            if (this.#transition === transition) this.#finishTransition();
        });
        animation.start();
    }
    #finishTransition(): void {
        const transition = this.#transition;
        if (transition === null) return;
        this.#transition = null;
        this.#stack.setTransitioning(false);
        transition.animation.destroy();
        transition.outgoing.hide(); transition.outgoing.move(0, 0);
        transition.incoming.move(0, 0);
        transition.outgoing.setEnabled(transition.outgoingEnabled);
        transition.incoming.setEnabled(transition.incomingEnabled);
        this.#focusPage();
    }
    /** Settles an active page transition before closing the dialog. */
    override close(): void { this.#finishTransition(); super.close(); }
    /**
     * Changes visibility and settles an active page transition when hiding.
     * @param visible Whether to show the wizard.
     */
    override setVisible(visible: boolean): void {
        if (!visible && #transition in this) this.#finishTransition();
        super.setVisible(visible);
    }
    #focusPage(): void {
        if (!this.isOpen()) return;
        const visit = (widget: CWidget): CWidget | null => {
            if (!widget.isVisible() || !widget.isEnabled()) return null;
            if (widget.acceptsTabFocus()) return widget;
            for (const child of widget.children()) {
                if (child instanceof CWidget) { const target = visit(child); if (target !== null) return target; }
            }
            return null;
        };
        const page = this.currentPage();
        const target = page === null ? null : visit(page);
        const primary = this.defaultButton();
        (target ?? (primary?.isEnabled() ? primary : this.button(CWizardButton.CancelButton))).setFocus();
    }
    #refresh(): void {
        const page = this.currentPage(), target = this.#nextTarget();
        this.#title.setText(page?.title() ?? ""); this.#subTitle.setText(page?.subTitle() ?? "");
        const next = this.button(CWizardButton.NextButton), finish = this.button(CWizardButton.FinishButton);
        next.setVisible(target !== -1); finish.setVisible(target === -1);
        next.setEnabled(page !== null && page.isComplete() && target !== null && target !== -1);
        finish.setEnabled(page !== null && page.isComplete() && target === -1);
        this.button(CWizardButton.BackButton).setEnabled(this.#history.length > 0);
        const skip = this.button(CWizardButton.SkipButton);
        skip.setVisible(page?.isDeferrable() ?? false);
        skip.setEnabled(page !== null && page.isDeferrable() && target !== null && target !== -1 && target !== this.#current);
        this.setDefaultButton(target === -1 ? finish : next);
        this.#updateStepList();
    }
    #stepEntries(): WizardStepEntry[] {
        return this.pageIds().map((id, index) => ({ id,
            title: this.page(id)!.title() || `Step ${index + 1}`,
            status: this.#completed.has(id) ? "completed" : id === this.#current ? "current"
                : this.#deferred.includes(id) ? "deferred" : "pending",
            deferred: this.#deferred.includes(id) }));
    }
    #updateStepList(): void {
        this.#stepList.setVisible(this.#stepListVisible);
        const count = this.#pages.size;
        const height = count * CWizardStepListContent.RowHeight;
        // The content never requests horizontal scrolling; long titles are elided.
        this.#stepContent.resize(0, height);
        this.#stepList.resize(this.#stepList.width(), this.#stepList.height());
        this.#stepContent.resize(this.#stepList.viewport().width(), height);
        this.#stepList.resize(this.#stepList.width(), this.#stepList.height());
        const index = this.pageIds().indexOf(this.#current);
        if (index >= 0) {
            const top = index * CWizardStepListContent.RowHeight;
            const bottom = top + CWizardStepListContent.RowHeight;
            if (top < this.#stepList.scrollY()) this.#stepList.setScrollY(top);
            else if (bottom > this.#stepList.scrollY() + this.#stepList.viewport().height())
                this.#stepList.setScrollY(bottom - this.#stepList.viewport().height());
        }
        this.#stepContent.update();
    }
    /**
     * Moves or resizes the dialog and recalculates the page, controls and step sidebar.
     * @param x Horizontal position in parent or canvas coordinates.
     * @param y Vertical position in parent or canvas coordinates.
     * @param width Dialog width in logical pixels.
     * @param height Dialog body height excluding the title bar.
     */
    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#layoutContents();
        this.#updateStepList();
    }
    #layoutContents(): void {
        this.#finishTransition();
        const width = this.width(), height = this.height();
        this.#title.setGeometry(20, 16, Math.max(0, width - 40), 32);
        this.#subTitle.setGeometry(20, 52, Math.max(0, width - 40), 44);
        const sideWidth = this.#stepListVisible ? Math.min(176, Math.max(0, width - 360)) : 0;
        const pageX = 20 + (sideWidth > 0 ? sideWidth + 16 : 0);
        this.#stepList.setGeometry(20, 108, sideWidth, Math.max(0, height - 172));
        this.#stack.setGeometry(pageX, 108, Math.max(0, width - pageX - 20), Math.max(0, height - 172));
        const yButton = Math.max(0, height - 48), gap = 8, buttonWidth = 90;
        this.button(CWizardButton.SkipButton).setGeometry(20, yButton, 120, 30);
        this.button(CWizardButton.BackButton).setGeometry(Math.max(148, width - 20 - 3 * buttonWidth - 2 * gap), yButton, buttonWidth, 30);
        const nextX = Math.max(246, width - 20 - 2 * buttonWidth - gap);
        this.button(CWizardButton.NextButton).setGeometry(nextX, yButton, buttonWidth, 30);
        this.button(CWizardButton.FinishButton).setGeometry(nextX, yButton, buttonWidth, 30);
        this.button(CWizardButton.CancelButton).setGeometry(Math.max(344, width - 20 - buttonWidth), yButton, buttonWidth, 30);
    }
    /** Settles any transition, disconnects page listeners, detaches each page's wizard association and destroys the dialog. */
    override destroy(): void {
        this.#finishTransition();
        for (const connections of this.#disconnect.values()) for (const disconnect of connections) disconnect();
        this.#disconnect.clear();
        for (const page of this.#pages.values()) page.attachWizard(null);
        super.destroy();
    }
}


/** Keeps pointer events out of moving page contents without changing their children. */
class CWizardPageStack extends CStackedWidget {
    #transitioning = false;
    /**
     * Controls whether pointer hits may reach page contents while they move.
     * @param transitioning `true` while a transition is in progress.
     */
    setTransitioning(transitioning: boolean): void { this.#transitioning = transitioning; }
    /**
     * Hit-tests the stack. During a slide, returns the stack itself for hits inside its bounds, keeping the pointer away from moving page contents.
     * @param x Horizontal coordinate local to the stack.
     * @param y Vertical coordinate local to the stack.
     * @returns Hit widget, or `null` outside the hittable bounds.
     */
    override widgetAt(x: number, y: number): CWidget | null {
        if (!this.#transitioning) return super.widgetAt(x, y);
        return this.isVisible() && x >= 0 && y >= 0 && x < this.width() && y < this.height() ? this : null;
    }
}


type WizardStepEntry = {
    id: number; title: string; status: "current" | "completed" | "deferred" | "pending"; deferred: boolean;
};

/** Informational sidebar: no click actions or keyboard focus, with vertical scrolling. */
class CWizardStepListContent extends CWidget {
    static readonly RowHeight = 52;
    constructor(private readonly area: CScrollArea, private readonly entries: () => WizardStepEntry[]) {
        super(area.viewport());
        this.setFocusPolicy(CFocusPolicy.NoFocus);
    }
    /**
     * Paints only the step rows intersecting the sidebar viewport, including their status symbols and clipped labels.
     * @param painter Painter in sidebar content coordinates.
     */
    protected override paintEvent(painter: CPainter): void {
        const entries = this.entries(), rowHeight = CWizardStepListContent.RowHeight;
        const palette = this.palette(), metrics = this.fontMetrics();
        const first = Math.max(0, Math.floor(this.area.scrollY() / rowHeight));
        const last = Math.min(entries.length, Math.ceil((this.area.scrollY() + this.area.viewport().height()) / rowHeight));
        painter.save();
        try {
            painter.setBrush(palette.color(CPaletteColorRole.Base).toCss());
            painter.fillRect(new CRect(0, this.area.scrollY(), this.width(), this.area.viewport().height()));
            painter.setFont(this.font()); painter.setTextAlign("left"); painter.setTextBaseline("top");
            for (let index = first; index < last; ++index) {
                const entry = entries[index]!, top = index * rowHeight, current = entry.status === "current";
                if (current) {
                    painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
                    painter.fillRect(new CRect(2, top + 2, Math.max(0, this.width() - 4), rowHeight - 4));
                }
                const textColor = palette.color(current ? CPaletteColorRole.HighlightedText : CPaletteColorRole.Text).toCss();
                const glyph = { current: "●", completed: "✓", deferred: "↷", pending: "○" }[entry.status];
                painter.setPen(current ? textColor : entry.status === "completed" ? "#22834a"
                    : entry.status === "deferred" ? "#a36a13" : textColor);
                painter.drawText(glyph, 10, top + 10);
                painter.setPen(textColor);
                const available = Math.max(0, this.width() - 40);
                let title = entry.title;
                if (metrics.textWidth(title) > available) {
                    const chars = Array.from(title);
                    while (chars.length > 0 && metrics.textWidth(chars.join("") + "…") > available) chars.pop();
                    title = metrics.textWidth("…") <= available ? chars.join("") + "…" : "";
                }
                painter.drawText(title, 32, top + 8);
                const label = current ? (entry.deferred ? "Current · deferred" : "Current step")
                    : entry.status === "completed" ? "Completed" : entry.status === "deferred" ? "Deferred" : "Not visited";
                // Clip the complete row, including status text, to the sidebar viewport.
                painter.save();
                try {
                    painter.clipRect(new CRect(32, top + 27, available, rowHeight - 29));
                    painter.drawText(label, 32, top + 28);
                } finally { painter.restore(); }
            }
        } finally { painter.restore(); }
    }
}
