# Signals and slots

Signals connect controls and application state without making either component depend on the other implementation. A slot is an ordinary function. `CSignal<[string, number]>` accepts slots whose arguments are a string and a number; `CSignal<[]>` carries no arguments.

Create `CApplication` before constructing widgets. The factories below receive an existing parent widget; place their returned controls in that parent layout. Each TypeScript block has its own imports and context.

## Connect a user action

`CPushButton.clicked` is inherited from `CAbstractButton`. Connect it to the application action rather than invoking an event handler yourself. Arrow functions retain the surrounding `this`; passing an unbound instance method does not bind its receiver automatically.

```ts
import { CLabel, CPushButton, CWidget } from "canvas-toolkit-lib";

function createCounter(parent: CWidget) {
    const button = new CPushButton(parent);
    button.setText("Add one");
    const status = new CLabel(parent);
    let count = 0;
    status.setText("Count: 0");
    const disconnect = button.clicked.connect(() => {
        status.setText("Count: " + ++count);
    });
    return { button, status, disconnect };
}
```

`connect()` returns a function that removes that connection. Keep it if the subscription can end before the signal owner does. Alternatively, `disconnect(slot)` accepts the original callback reference. A newly created arrow function is a different reference, even when its text is identical.

The signal stores callbacks in a set. Connecting the same function object again does not add another invocation; connecting two different arrow functions does. Two calls connecting the same function therefore do not create independently removable subscriptions.

## Emission order and state changes

Emission is synchronous: connected functions run before `emit()` returns. Every emission takes a snapshot of its slots in connection order. Connecting or disconnecting during a callback changes later emissions; a callback already in the current snapshot still runs. A synchronous exception propagates to the emitter and prevents the remaining callbacks in that emission from running.

A slot that calls a setter can trigger another signal immediately. Avoid accidental cycles by checking whether the stored value actually changed. The following application object documents its argument order and emits only after committing the new state.

```ts
import { CObject, CSignal } from "canvas-toolkit-lib";

export class Counter extends CObject {
    readonly valueChanged = new CSignal<[number, number]>();
    #value = 0;

    value(): number { return this.#value; }

    setValue(value: number): void {
        if (!Number.isFinite(value)) throw new RangeError("Expected a finite count");
        const next = Math.max(0, Math.trunc(value));
        if (next === this.#value) return;
        const previous = this.#value;
        this.#value = next;
        this.valueChanged.emit(next, previous);
    }
}
```

A signal name alone does not specify whether programmatic changes emit it. For example, `CLineEdit.textChanged` includes programmatic replacements, whereas `textEdited` describes user edits. `CAbstractButton.toggled` can be emitted by `setChecked()`. Read the individual signal contract when deciding between observing all state changes and reacting only to user actions. Connect after initialization if initial setter calls should not trigger your action.

## Disconnect when a subscriber is destroyed

Widget ownership and signal subscriptions are separate concerns. A plain `CSignal` knows nothing about the lifetime of the objects captured by its slots. In particular, a long-lived application signal can retain a panel through its callback after that panel is closed or destroyed.

This panel explicitly releases its subscription before destroying its children. Calling the returned disconnection function repeatedly is harmless.

```ts
import { CLabel, CSignal, CVBoxLayout, CWidget } from "canvas-toolkit-lib";

export class ProgressPanel extends CWidget {
    #disconnect: () => void;

    constructor(updates: CSignal<[number]>, parent: CWidget | null = null) {
        super(parent);
        const label = new CLabel(this);
        label.setText("Waiting");
        const layout = new CVBoxLayout();
        layout.addWidget(label);
        this.setLayout(layout);
        this.#disconnect = updates.connect(value => label.setText(value + " %"));
    }

    override destroy(): void {
        this.#disconnect();
        super.destroy();
    }
}
```

Hiding a panel does not destroy it. Disconnect on hide only if hidden panels should stop observing updates, then reconnect deliberately when showing them. Avoid adding a fresh connection on every show without removing the previous one.

## Start asynchronous work safely

Signals do not await promises or serialize asynchronous callbacks. Handle rejected promises and decide what another activation should do while work is pending. This connection ignores repeated activation, disables its button while saving and restores it in `finally`.

```ts
import { CLabel, CPushButton } from "canvas-toolkit-lib";

function connectSave(button: CPushButton, status: CLabel, save: () => Promise<void>) {
    let saving = false;
    return button.clicked.connect(() => {
        if (saving) return;
        saving = true;
        button.setEnabled(false);
        void (async () => {
            try {
                await save();
                status.setText("Saved");
            } catch (error) {
                status.setText("Save failed: " + String(error));
            } finally {
                saving = false;
                button.setEnabled(true);
            }
        })();
    });
}
```

This example assumes the controls remain alive until saving finishes. Disconnecting prevents future activations but does not cancel an already running promise. If a form can close during a request, give the operation an application-owned lifetime or cancel it with an `AbortController` where the backend supports cancellation, and avoid updating destroyed controls.
