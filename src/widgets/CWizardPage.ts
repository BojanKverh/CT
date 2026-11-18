import { CSignal } from "../core/CSignal.js";
import type { CWizardDialog } from "../dialogs/CWizardDialog.js";
import { CWidget } from "./CWidget.js";

/** A wizard step; its child controls and data survive Back and Skip for now. */
export class CWizardPage extends CWidget {
    #title = "";
    #subTitle = "";
    #complete = true;
    #deferrable = false;
    #wizard: CWizardDialog | null = null;
    readonly completeChanged = new CSignal<[]>();
    readonly changed = new CSignal<[]>();

    /**
     * Reads the title.
     * @returns The title.
     */
    title(): string { return this.#title; }
    /**
     * Sets the title. May emit `changed`.
     * @param title Title.
     */
    setTitle(title: string): void {
        if (title === this.#title) return;
        this.#title = title; this.changed.emit();
    }
    /**
     * Reads the sub title.
     * @returns The sub title.
     */
    subTitle(): string { return this.#subTitle; }
    /**
     * Sets the sub title. May emit `changed`.
     * @param title Title.
     */
    setSubTitle(title: string): void {
        if (title === this.#subTitle) return;
        this.#subTitle = title; this.changed.emit();
    }
    /**
     * Override for completeness derived directly from fields; emit completeChanged on edits.
     * @returns `true` if the wizard page is complete, otherwise `false`.
     */
    isComplete(): boolean { return this.#complete; }
    /**
     * Sets the complete. May emit `completeChanged`.
     * @param complete Complete flag.
     */
    setComplete(complete: boolean): void {
        if (complete === this.#complete) return;
        this.#complete = complete; this.completeChanged.emit();
    }
    /**
     * Checks whether the wizard page is deferrable.
     * @returns `true` if the wizard page is deferrable, otherwise `false`.
     */
    isDeferrable(): boolean { return this.#deferrable; }
    /**
     * Sets the deferrable. May emit `changed`.
     * @param deferrable Deferrable flag.
     */
    setDeferrable(deferrable: boolean): void {
        if (deferrable === this.#deferrable) return;
        this.#deferrable = deferrable; this.changed.emit();
    }
    /**
     * Reads the wizard.
     * @returns The wizard.
     */
    wizard(): CWizardDialog | null { return this.#wizard; }
    /** Called once on the first visit in each run. Back/deferral retain entered values. */
    initializePage(): void {}
    /**
     * Called on Next/Finish, never on Back or Skip for now.
     * @returns `true` in this implementation.
     */
    validatePage(): boolean { return true; }
    /**
     * Returns the next higher registered page ID by default. Override to branch or end the normal route, after which deferred steps may still follow.
     * @returns Next page ID, or `-1` when detached, unregistered or at the end of the normal route.
     */
    nextId(): number {
        const wizard = this.#wizard;
        if (wizard === null) return -1;
        const ids = wizard.pageIds();
        const current = ids.findIndex(id => wizard.page(id) === this);
        return current < 0 ? -1 : ids[current + 1] ?? -1;
    }
    /**
     * Records or clears the page's wizard association.
     * @param wizard Owning wizard, or `null` to detach the page.
     * @internal
     */
    attachWizard(wizard: CWizardDialog | null): void { this.#wizard = wizard; }
}
