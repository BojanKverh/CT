# Signals and slots

`CSignal<TArgs>` invokes functions connected with `connect()`. A slot receives the tuple's argument types. Emission is synchronous.

```ts
const disconnect = button.clicked.connect(() => status.setText("Started"));
// When this connection is no longer needed.
disconnect();
```

The returned function disconnects that slot. `signal.disconnect(slot)` also accepts the original function reference. Keep the disconnection function when a long-lived signal references a shorter-lived component.

Each emission snapshots the connected slots. Connection changes inside a callback affect subsequent emissions. A thrown exception propagates to the emitter.

```ts
const changed = new CSignal<[string]>();
const onChanged = (text: string): void => console.log(text);
changed.connect(onChanged);
changed.emit("Ready");
changed.disconnect(onChanged);
```

`CPushButton` inherits `clicked` from `CAbstractButton`. Check-state changes use `toggled`, whose argument is the new boolean value. Calling `setChecked()` can emit `toggled` programmatically.

Signals do not await asynchronous slots. Handle failures inside the asynchronous action.

```ts
button.clicked.connect(() => {
    void save().catch(error => status.setText(String(error)));
});
```

Document signal arguments, emission conditions, programmatic emissions and unchanged-value behavior when defining an application signal.
