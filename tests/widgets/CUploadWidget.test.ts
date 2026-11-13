import { afterEach, expect, test, vi } from "vitest";
import { CApplication, CPushButton, CUploadWidget, CWidget } from "../../src/index.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

afterEach(() => CApplication.instance().destroy());

test("routes native file drops, filters types, and leaves files available for a separate action", () => {
    const canvas = createTestCanvas();
    new CApplication(canvas);
    const parent = new CWidget();
    parent.resize(400, 300);
    const upload = new CUploadWidget(parent);
    upload.resize(400, 300);
    upload.setAccept("image/*,.pdf");
    const changed = vi.fn();
    upload.filesChanged.connect(changed);
    const image = new File(["a"], "photo.png", { type: "image/png" });
    const duplicate = new File(["a"], image.name, { type: image.type, lastModified: image.lastModified });
    const pdf = new File(["b"], "doc.PDF");
    const text = new File(["c"], "note.txt", { type: "text/plain" });
    const preventDefault = vi.fn();
    const drop = () => canvas.dispatchEvent({
        type: "drop", clientX: 30, clientY: 160, preventDefault,
        dataTransfer: { types: ["Files"], files: [image, duplicate, pdf, text] }
    } as unknown as DragEvent);

    parent.setEnabled(false);
    drop();
    expect(upload.files()).toEqual([]);
    parent.setEnabled(true);
    drop();
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(upload.files()).toEqual([image, pdf]);
    expect(changed).toHaveBeenCalledOnce();
    drop();
    expect(upload.files()).toEqual([image, pdf]);
    expect(changed).toHaveBeenCalledOnce();
    function removeButtons(widget: CWidget): CPushButton[] {
        return widget.children().flatMap(child => child instanceof CWidget
            ? child instanceof CPushButton && child.text() === "×" ? [child] : removeButtons(child)
            : []);
    }
    const buttons = removeButtons(upload);
    expect(buttons).toHaveLength(2);
    const point = buttons[0]!.mapToCanvas(12, 12);
    for (const type of ["pointerdown", "pointerup"]) {
        canvas.dispatchEvent({
            type, clientX: point.x(), clientY: point.y(), button: 0, pointerId: 1
        } as PointerEvent);
    }
    expect(upload.files()).toEqual([pdf]);
    drop();
    expect(upload.files()).toEqual([pdf, image]);
    upload.clear();
    expect(upload.files()).toEqual([]);
});

test("limits additions across batches and reuses freed slots", () => {
    new CApplication(createTestCanvas());
    const upload = new CUploadWidget();
    const a = new File([], "a.pdf");
    const b = new File([], "b.pdf");
    const c = new File([], "c.pdf");

    upload.setMaxFileCount(2);
    upload.dropExternalFiles([a, a, b, c]);
    expect(upload.files()).toEqual([a, b]);
    upload.setMaxFileCount(1);
    upload.dropExternalFiles([c]);
    expect(upload.files()).toEqual([a, b]);
    upload.clear();
    upload.dropExternalFiles([c, b]);
    expect(upload.files()).toEqual([c]);
    upload.setMaxFileCount(Infinity);
    upload.dropExternalFiles([b]);
    expect(upload.files()).toEqual([c, b]);
});
