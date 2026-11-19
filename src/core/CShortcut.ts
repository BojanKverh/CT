/** @module Core/CShortcut */
import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CWidget } from "../widgets/CWidget.js";

/** A single key combination active in its parent widget and descendants. */
export class CShortcut extends CObject {
    /** Validates and canonicalizes the single-combination shortcut syntax. */
    static normalizeSequence(key: string): string { return normalizeSequence(key); }
    /**
    * Emitted when this shortcut matches a keyboard event within its configured activation scope.
    * @group Signals
    */
    readonly activated = new CSignal<[]>();
    /**
    * Emitted instead of activated when the same owner has duplicate matches.
    * @group Signals
    */
    readonly activatedAmbiguously = new CSignal<[]>();
    #m_key = "";
    #m_enabled = true;

    /**
    * Registers a key sequence in a widget's shortcut scope.
    */
    constructor(key: string, parent: CWidget) {
        const normalized = normalizeSequence(key);
        super(parent);
        this.#m_key = normalized;
    }

    /**
    * Returns the configured key-sequence text.
    */
    key(): string { return this.#m_key; }
    /**
    * Changes the key sequence matched by this shortcut.
    */
    setKey(key: string): void { this.#m_key = normalizeSequence(key); }
    /**
    * Reports whether this shortcut may activate.
    */
    isEnabled(): boolean { return this.#m_enabled; }
    /**
    * Enables or disables activation while retaining its key sequence.
    */
    setEnabled(enabled = true): void { this.#m_enabled = enabled; }

    /** Used by CApplication when dispatching a key press. */
    matches(event: CKeyEvent): boolean {
        return this.#m_enabled && CShortcut.matchesSequence(this.#m_key, event);
    }

    /** Matches a sequence without registering another keyboard binding. */
    static matchesSequence(sequence: string, event: CKeyEvent): boolean {
        if (sequence === "" || event.altGraph()) return false;
        if (["Control", "Shift", "Alt", "Meta", "AltGraph"].includes(event.key())) return false;
        const modifiers: string[] = [];
        if (event.ctrl()) modifiers.push("Ctrl");
        if (event.alt()) modifiers.push("Alt");
        if (event.shift()) modifiers.push("Shift");
        if (event.meta()) modifiers.push("Meta");
        const code = event.code();
        const key = code.startsWith("Key") ? code.slice(3)
            : code.startsWith("Digit") ? code.slice(5) : event.key();
        return [...modifiers, normalizeKey(key)].join("+") === normalizeSequence(sequence);
    }
}

function normalizeKey(key: string): string {
    const aliases: Record<string, string> = {
        " ": "Space", space: "Space", spacebar: "Space", esc: "Escape", escape: "Escape",
        return: "Enter", enter: "Enter", arrowleft: "Left", left: "Left",
        arrowright: "Right", right: "Right", arrowup: "Up", up: "Up",
        arrowdown: "Down", down: "Down", tab: "Tab", backspace: "Backspace",
        delete: "Delete", del: "Delete", home: "Home", end: "End",
        pageup: "PageUp", pagedown: "PageDown", insert: "Insert"
    };
    return aliases[key.toLowerCase()] ?? key.toUpperCase();
}

function normalizeSequence(sequence: string): string {
    const text = sequence.trim();
    if (text === "") return "";
    const plusKey = text === "+" || text.endsWith("++");
    const parts = (plusKey ? text.slice(0, -1) : text).split("+");
    const key = plusKey ? "+" : parts.pop()!.trim();
    if (plusKey) parts.pop();
    const modifiers = new Set<string>();
    const aliases: Record<string, string> = {
        ctrl: "Ctrl", control: "Ctrl", alt: "Alt", shift: "Shift",
        meta: "Meta", cmd: "Meta", command: "Meta"
    };
    for (const part of parts) {
        const modifier = aliases[part.trim().toLowerCase()];
        if (modifier === undefined || modifiers.has(modifier))
            throw new RangeError("A shortcut must contain one key and distinct modifiers.");
        modifiers.add(modifier);
    }
    const normalized = normalizeKey(key);
    if (!(Array.from(key).length === 1 || /^(F[1-9]|F[12][0-9]|F3[0-5])$/.test(normalized)
        || ["Space", "Escape", "Enter", "Left", "Right", "Up", "Down", "Tab", "Backspace",
            "Delete", "Home", "End", "PageUp", "PageDown", "Insert"].includes(normalized)))
        throw new RangeError("A shortcut must contain one key, not a multi-key sequence.");
    return [...["Ctrl", "Alt", "Shift", "Meta"].filter(value => modifiers.has(value)), normalized].join("+");
}
