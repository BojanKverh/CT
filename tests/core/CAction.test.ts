import { CObject } from "../../src/core/CObject.js";
import { CShortcut } from "../../src/core/CShortcut.js";
import type { CWidget } from "../../src/widgets/CWidget.js";
import { describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";

describe("CAction", () => {
	test("stores text", () => {
		const action = new CAction("Open");

		expect(action.text()).toBe("Open");
	});

	test("changes text", () => {
		const action = new CAction("Open");

		action.setText("Save");

		expect(action.text()).toBe("Save");
	});

	test("is enabled by default", () => {
		const action = new CAction();

		expect(action.isEnabled()).toBe(true);
	});

	test("changes enabled state", () => {
		const action = new CAction();

		action.setEnabled(false);

		expect(action.isEnabled()).toBe(false);
	});

	test("is not checkable by default", () => {
		const action = new CAction();

		expect(action.isCheckable()).toBe(false);
		expect(action.isChecked()).toBe(false);
	});

	test("can be made checkable", () => {
		const action = new CAction();

		action.setCheckable(true);
		action.setChecked(true);

		expect(action.isCheckable()).toBe(true);
		expect(action.isChecked()).toBe(true);
	});

	test("cannot stay checked when not checkable", () => {
		const action = new CAction();

		action.setCheckable(true);
		action.setChecked(true);
		action.setCheckable(false);

		expect(action.isCheckable()).toBe(false);
		expect(action.isChecked()).toBe(false);
	});

	test("emits toggled when checked state changes", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.setCheckable(true);
		action.toggled.connect(slot);

		action.setChecked(true);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(true);
	});

	test("does not emit toggled when checked state is unchanged", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.setCheckable(true);
		action.setChecked(true);
		action.toggled.connect(slot);

		action.setChecked(true);

		expect(slot).not.toHaveBeenCalled();
	});

	test("trigger emits triggered", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.triggered.connect(slot);
		action.trigger();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("disabled action does not trigger", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.setEnabled(false);
		action.triggered.connect(slot);

		action.trigger();

		expect(slot).not.toHaveBeenCalled();
	});

	test("trigger toggles checkable action", () => {
		const action = new CAction();

		action.setCheckable(true);

		action.trigger();
		expect(action.isChecked()).toBe(true);

		action.trigger();
		expect(action.isChecked()).toBe(false);
	});
});
describe("CAction keyboard shortcut", () => {
    function owner(): CWidget { return new CObject() as CWidget; }
    function bindings(widget: CWidget): CShortcut[] {
        return (widget as CObject).children().filter((child): child is CShortcut => child instanceof CShortcut);
    }
    test("has no shortcut or scope by default", () => {
        const action = new CAction();
        expect(action.shortcut()).toBe("");
        expect(action.shortcutParent()).toBeNull();
    });
    test("stores a canonical shortcut without requiring an application", () => {
        const action = new CAction();
        action.setShortcut("shift+control+s");
        expect(action.shortcut()).toBe("Ctrl+Shift+S");
    });
    test("creates one binding in the constructor's scope", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setShortcut("Ctrl+S");
        expect(bindings(widget)).toHaveLength(1);
        expect(bindings(widget)[0]!.key()).toBe("Ctrl+S");
        expect(action.shortcutParent()).toBe(widget);
    });
    test("can assign the scope after setting a key", () => {
        const action = new CAction("Save"); const widget = owner();
        action.setShortcut("Ctrl+S"); action.setShortcutParent(widget);
        expect(bindings(widget)).toHaveLength(1);
    });
    test("binding activation uses the action's ordinary trigger", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        const triggered = vi.fn(); action.triggered.connect(triggered);
        action.setShortcut("Ctrl+S"); bindings(widget)[0]!.activated.emit();
        expect(triggered).toHaveBeenCalledOnce();
    });
    test("shortcut activation toggles checkable actions", () => {
        const widget = owner(); const action = new CAction("Toggle", widget);
        action.setCheckable(true); action.setShortcut("Ctrl+T");
        bindings(widget)[0]!.activated.emit(); expect(action.isChecked()).toBe(true);
        bindings(widget)[0]!.activated.emit(); expect(action.isChecked()).toBe(false);
    });
    test("disabling an action disables its shortcut and trigger", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setShortcut("Ctrl+S"); action.setEnabled(false);
        expect(bindings(widget)[0]!.isEnabled()).toBe(false);
        const triggered = vi.fn(); action.triggered.connect(triggered);
        bindings(widget)[0]!.activated.emit(); expect(triggered).not.toHaveBeenCalled();
        action.setEnabled(true); expect(bindings(widget)[0]!.isEnabled()).toBe(true);
    });
    test("a shortcut assigned to an already disabled action is disabled", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setEnabled(false); action.setShortcut("Ctrl+S");
        expect(bindings(widget)[0]!.isEnabled()).toBe(false);
    });
    test("changing a key reuses its binding and invalid input retains the old key", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setShortcut("Ctrl+S"); const binding = bindings(widget)[0]!;
        action.setShortcut("Ctrl+Shift+S");
        expect(bindings(widget)).toHaveLength(1);
        expect(bindings(widget)[0]).toBe(binding);
        expect(binding.key()).toBe("Ctrl+Shift+S");
        expect(() => action.setShortcut("Wrong+S")).toThrow(RangeError);
        expect(action.shortcut()).toBe("Ctrl+Shift+S");
        expect(binding.key()).toBe("Ctrl+Shift+S");
    });
    test("clearing a shortcut removes the binding", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setShortcut("Ctrl+S"); action.setShortcut("");
        expect(bindings(widget)).toHaveLength(0);
    });
    test("moving the scope removes the old binding", () => {
        const first = owner(); const second = owner(); const action = new CAction("Save", first);
        action.setShortcut("Ctrl+S"); action.setShortcutParent(second);
        expect(bindings(first)).toHaveLength(0);
        expect(bindings(second)).toHaveLength(1);
        action.setShortcutParent(null); expect(bindings(second)).toHaveLength(0);
    });
    test("equivalent keys and the same scope do not emit changed or duplicate bindings", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setShortcut("Ctrl+S"); const changed = vi.fn(); action.changed.connect(changed);
        action.setShortcut("control+s"); action.setShortcutParent(widget);
        expect(changed).not.toHaveBeenCalled();
        expect(bindings(widget)).toHaveLength(1);
    });
    test("shortcut changes emit changed", () => {
        const action = new CAction(); const changed = vi.fn(); action.changed.connect(changed);
        action.setShortcut("Ctrl+S"); expect(changed).toHaveBeenCalledOnce();
    });
    test("destroy releases the keyboard binding", () => {
        const widget = owner(); const action = new CAction("Save", widget);
        action.setShortcut("Ctrl+S"); action.destroy(); action.destroy();
        expect(bindings(widget)).toHaveLength(0);
        expect(action.shortcutParent()).toBeNull();
    });
});
