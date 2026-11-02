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
    #stack: CStackedWidget;
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
    readonly currentIdChanged = new CSignal<[number]>();
    readonly pageDeferred = new CSignal<[number]>();

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.#title = new CLabel(this);
        const font = this.#title.font(); font.setPixelSize(22); this.#title.setFont(font);
        this.#subTitle = new CLabel(this); this.#subTitle.setWordWrap(true);
        this.#stack = new CStackedWidget(this);
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
    override sizeHint(): CSize { return new CSize(640, 440); }
    button(role: CWizardButton): CPushButton { return this.#buttons.get(role)!; }
    pageIds(): number[] { return [...this.#pages.keys()].sort((a, b) => a - b); }
    page(id: number): CWizardPage | null { return this.#pages.get(id) ?? null; }
    currentId(): number { return this.#current; }
    currentPage(): CWizardPage | null { return this.page(this.#current); }
    visitedIds(): number[] { return [...this.#history.map(visit => visit.id), ...(this.#current < 0 ? [] : [this.#current])]; }
    deferredPageIds(): number[] { return [...this.#deferred]; }
    startId(): number { return this.#start >= 0 ? this.#start : this.pageIds()[0] ?? -1; }
    setStartId(id: number): void {
        if (id !== -1 && !this.#pages.has(id)) throw new Error("Unknown wizard start page.");
        this.#start = id;
    }
    addPage(page: CWizardPage): number {
        const ids = this.pageIds();
        const id = (ids[ids.length - 1] ?? -1) + 1;
        this.setPage(id, page); return id;
    }
    /** IDs must be unique nonnegative safe integers; a page belongs to only one wizard. */
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
    /** Detaches a page without destroying it. Removing a page restarts navigation. */
    removePage(id: number): CWizardPage | null {
        const page = this.page(id); if (page === null) return null;
        for (const disconnect of this.#disconnect.get(id) ?? []) disconnect();
        this.#disconnect.delete(id); this.#pages.delete(id);
        this.#stack.removeWidget(this.#stack.indexOf(page)); page.attachWizard(null);
        if (this.#start === id) this.#start = -1;
        this.restart(); return page;
    }
    /** Starts a new navigation run; page widgets retain their data. */
    restart(): void {
        if (this.#busy) return;
        this.#history = []; this.#deferred = []; this.#completed.clear(); this.#initialized.clear();
        this.#showPage(this.startId());
    }
    override open(): void {
        if (this.isOpen()) return;
        this.restart(); super.open(); this.#focusPage();
    }
    /** Advances after successful validation, or accepts on the final remaining step. */
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
            this.#showPage(target);
        });
    }
    /** Finish cannot bypass completeness, validation, a normal next step or deferred steps. */
    override accept(): void {
        this.#navigate(() => {
            const page = this.currentPage();
            if (page === null || !page.isComplete() || this.#nextTarget() !== -1) return;
            if (page.validatePage() && this.#nextTarget() === -1) { this.#completeCurrent(); super.accept(); }
            else this.#refresh();
        });
    }
    back(): void {
        this.#navigate(() => {
            const visit = this.#history.pop(); if (visit === undefined) return;
            this.#deferred = [...visit.deferred]; this.#completed = new Set(visit.completed);
            this.#showPage(visit.id);
        });
    }
    skipForNow(): void {
        this.#navigate(() => {
            if (!this.currentPage()?.isDeferrable()) return;
            const target = this.#nextTarget();
            if (target === null || target === -1 || target === this.#current) return;
            const id = this.#current;
            this.#saveVisit();
            this.#deferred = [...this.#deferred.filter(other => other !== id), id];
            this.#showPage(target); this.pageDeferred.emit(id);
        });
    }
    #navigate(action: () => void): void {
        if (this.#busy) return;
        this.#busy = true; try { action(); } finally { this.#busy = false; }
    }
    #completeCurrent(): void {
        this.#completed.add(this.#current);
        this.#deferred = this.#deferred.filter(id => id !== this.#current);
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
    #showPage(id: number): void {
        const previous = this.#current; this.#current = id;
        const page = this.currentPage();
        if (page !== null) {
            this.#stack.setCurrentWidget(page);
            if (!this.#initialized.has(id)) { this.#initialized.add(id); page.initializePage(); }
        }
        this.#refresh(); this.#focusPage();
        if (id !== previous) this.currentIdChanged.emit(id);
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
    }
    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#title.setGeometry(20, 16, Math.max(0, width - 40), 32);
        this.#subTitle.setGeometry(20, 52, Math.max(0, width - 40), 44);
        this.#stack.setGeometry(20, 108, Math.max(0, width - 40), Math.max(0, height - 172));
        const yButton = Math.max(0, height - 48), gap = 8, buttonWidth = 90;
        this.button(CWizardButton.SkipButton).setGeometry(20, yButton, 120, 30);
        this.button(CWizardButton.BackButton).setGeometry(Math.max(148, width - 20 - 3 * buttonWidth - 2 * gap), yButton, buttonWidth, 30);
        const nextX = Math.max(246, width - 20 - 2 * buttonWidth - gap);
        this.button(CWizardButton.NextButton).setGeometry(nextX, yButton, buttonWidth, 30);
        this.button(CWizardButton.FinishButton).setGeometry(nextX, yButton, buttonWidth, 30);
        this.button(CWizardButton.CancelButton).setGeometry(Math.max(344, width - 20 - buttonWidth), yButton, buttonWidth, 30);
    }
    override destroy(): void {
        for (const connections of this.#disconnect.values()) for (const disconnect of connections) disconnect();
        this.#disconnect.clear();
        for (const page of this.#pages.values()) page.attachWizard(null);
        super.destroy();
    }
}
