# Focus and dialogs

`CFocusPolicy` controls mouse and Tab focus. Base widgets default to `NoFocus`; interactive controls choose a more specific policy. `CWidget.setTabOrder(first, second)` places the second control after the first within the same parent hierarchy.

```ts
CWidget.setTabOrder(name, email);
CWidget.setTabOrder(email, submit);
```

Hidden and disabled controls keep their configured positions but are skipped by Tab. Disabling a parent disables input in its descendants while preserving their own enabled flags. Hiding a focused subtree clears focus and remembers its Tab position.

## Dialog lifetime

`open()` opens a dialog with its current modality, initially non-modal. `exec()` sets modality and opens it. Both return immediately; use signals to receive results.

```ts
const dialog = new CDialog(parent);
const buttons = new CDialogButtonBox(CStandardButton.Ok | CStandardButton.Cancel, dialog);
buttons.accepted.connect(() => dialog.accept());
buttons.rejected.connect(() => dialog.reject());
dialog.accepted.connect(() => applyChanges());
dialog.exec();
```

A modal dialog restricts input and Tab traversal to the active modal scope. Nested modal dialogs restore focus through the dialog stack when they close. If the previous control becomes unavailable, subsequent Tab navigation uses its saved position when possible.

A non-modal dialog permits focus to move to other windows. Closing it restores the preceding focus when focus was still inside it. If the user already focused another window, closing the dialog preserves that focus.

`accept()` and `reject()` close the dialog and emit their semantic signals. `close()` closes without emitting accepted or rejected. Destroy a dialog when its widgets and connections are no longer needed.

## Composite controls

Focus proxies forward a composite's focus to its internal input. Use the public composite in `setTabOrder()`. Label buddies transfer focus by clicking the label or using its mnemonic. `CScrollArea` reveals controls reached by Tab.

`CTabWidget` supports Left/Right while its header is focused. `CToolBox` supports Up/Down between headers and Enter to open a page. `CSplitter` handles support axis-specific arrows.
