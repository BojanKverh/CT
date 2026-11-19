/** @module Widgets/CWizardPage */
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
    /**
    * Emitted when page completion changes so the wizard can update navigation buttons.
    * @group Signals
    */
    readonly completeChanged = new CSignal<[]>();
    /**
    * Emitted when page metadata changes so the wizard can refresh its page presentation.
    * @group Signals
    */
    readonly changed = new CSignal<[]>();

    /**
    * Caption displayed in the container's title region.
    * The initial value is `""`.
    */
    title(): string { return this.#title; }
    /**
    * Changes the page caption shown by the containing wizard.
    */
    setTitle(title: string): void {
        if (title === this.#title) return;
        this.#title = title; this.changed.emit();
    }
    /**
    * Supporting caption displayed beneath the page title.
    * The initial value is `""`.
    */
    subTitle(): string { return this.#subTitle; }
    /**
    * Changes supporting text shown under the wizard page title.
    */
    setSubTitle(title: string): void {
        if (title === this.#subTitle) return;
        this.#subTitle = title; this.changed.emit();
    }
    /** Override for completeness derived directly from fields; emit completeChanged on edits. */
    isComplete(): boolean { return this.#complete; }
    /**
    * Changes whether the page reports its requirements as complete.
    */
    setComplete(complete: boolean): void {
        if (complete === this.#complete) return;
        this.#complete = complete; this.completeChanged.emit();
    }
    /**
    * Whether a wizard step can be postponed.
    * The initial value is `false`.
    */
    isDeferrable(): boolean { return this.#deferrable; }
    /**
    * Controls whether the page can be postponed by the wizard's defer action.
    */
    setDeferrable(deferrable: boolean): void {
        if (deferrable === this.#deferrable) return;
        this.#deferrable = deferrable; this.changed.emit();
    }
    /**
    * Returns the containing wizard, or null when unattached.
    */
    wizard(): CWizardDialog | null { return this.#wizard; }
    /** Called once on the first visit in each run. Back/deferral retain entered values. */
    initializePage(): void {}
    /** Called on Next/Finish, never on Back or Skip for now. */
    validatePage(): boolean { return true; }
    /** Override for branching. -1 ends the normal route; deferred steps still follow. */
    nextId(): number {
        const wizard = this.#wizard;
        if (wizard === null) return -1;
        const ids = wizard.pageIds();
        const current = ids.findIndex(id => wizard.page(id) === this);
        return current < 0 ? -1 : ids[current + 1] ?? -1;
    }
    /** @internal Ownership is managed by CWizardDialog. */
    attachWizard(wizard: CWizardDialog | null): void { this.#wizard = wizard; }
}
