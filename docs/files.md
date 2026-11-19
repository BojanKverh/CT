# Files

`CUploadWidget` collects browser `File` objects. Users can choose several files or drop them from their file manager onto the widget, including over its file list. Every row has a removal button. The application reads all retained files through `files()`.

```ts
const files = new CUploadWidget(parent);
files.setAccept("image/*,.pdf");
files.setMaxFileCount(5);
const upload = new CPushButton(parent);
upload.setText("Upload all files");
upload.setEnabled(false);
files.filesChanged.connect(() => upload.setEnabled(files.files().length > 0));
```

The accept filter supports MIME types, MIME wildcards and extensions. Empty accepts all types. Count is unlimited by default. Lowering the limit retains existing files and prevents further additions until slots are available. With a limit of one, the picker selects one file and the empty prompt uses the singular form.

Files with the same name, size and last-modified time are considered duplicates. This metadata comparison avoids adding a selected file twice. Removing it frees its slot.

Selection only changes the collection. Trigger server interaction from an application button.

```ts
upload.clicked.connect(async () => {
    const selected = files.files();
    if (selected.length === 0) return;
    const data = new FormData();
    for (const file of selected) data.append("files", file);
    upload.setEnabled(false);
    try {
        const response = await fetch("/api/upload", { method: "POST", body: data });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    } catch (error) {
        console.error(error);
    } finally {
        upload.setEnabled(files.files().length > 0);
    }
});
```

The browser sets the multipart boundary automatically. The server implements `/api/upload` and validates incoming files. The widget's accept and count settings describe client-side selection behavior.
