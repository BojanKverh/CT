import { CRect } from "../geometry/CRect.js";
import { CSignal } from "../core/CSignal.js";
import { CFileDialog } from "../dialogs/CFileDialog.js";
import { CHBoxLayout } from "../layouts/CHBoxLayout.js";
import { CVBoxLayout } from "../layouts/CVBoxLayout.js";
import { CLabel } from "./CLabel.js";
import { CScrollArea } from "./CScrollArea.js";
import { CPushButton } from "./CPushButton.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CStackedWidget } from "./CStackedWidget.js";
import { CWidget } from "./CWidget.js";

class EmptyFileList extends CWidget {
    dragActive = false;
    singleFile = false;

    protected override paintEvent(painter: CPainter): void {
        const x = this.width() / 2;
        const y = this.height() / 2;
        const role = this.dragActive ? CPaletteColorRole.Highlight : CPaletteColorRole.WindowText;
        const color = this.palette().color(role).toCss();

        painter.setPen(color);
        painter.setLineWidth(2);
        painter.drawLine(x, y - 27, x, y - 4);
        painter.drawLine(x - 9, y - 18, x, y - 27);
        painter.drawLine(x, y - 27, x + 9, y - 18);
        painter.drawLine(x - 16, y - 7, x - 16, y + 4);
        painter.drawLine(x - 16, y + 4, x + 16, y + 4);
        painter.drawLine(x + 16, y + 4, x + 16, y - 7);

        painter.setFont(this.font());
        painter.setTextAlign("center");
        painter.setTextBaseline("middle");
        painter.drawText(this.singleFile ? "Drop file here" : "Drop files here", x, y + 23);
    }
}

class FileRow extends CWidget {
    readonly #remove = new CPushButton(this);

    readonly #sizeText: string;

    constructor(parent: CWidget, private readonly file: File, remove: () => void) {
        super(parent);
        this.#sizeText = `${file.size.toLocaleString()} bytes`;
        this.setToolTip(`${file.name} · ${this.#sizeText}`);
        this.#remove.setText("×");
        this.#remove.setToolTip(`Remove ${file.name}`);
        this.#remove.clicked.connect(remove);
    }

    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        const buttonWidth = Math.min(24, width);
        this.#remove.setGeometry(0, 2, buttonWidth, 24);
    }

    protected override paintEvent(painter: CPainter): void {
        const nameX = 32;
        const sizeRight = this.width() - 6;
        const sizeLeft = Math.max(nameX, sizeRight - this.fontMetrics().textWidth(this.#sizeText));
        const middle = this.height() / 2;

        painter.setFont(this.font());
        painter.setTextBaseline("middle");
        painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());

        painter.save();
        try {
            painter.clipRect(new CRect(nameX, 0, Math.max(0, sizeLeft - nameX - 8), this.height()));
            painter.setTextAlign("left");
            painter.drawText(this.file.name, nameX, middle);
        } finally {
            painter.restore();
        }

        painter.save();
        try {
            painter.clipRect(new CRect(sizeLeft, 0, Math.max(0, sizeRight - sizeLeft), this.height()));
            painter.setTextAlign("right");
            painter.drawText(this.#sizeText, sizeRight, middle);
        } finally {
            painter.restore();
        }
    }
}

class FileList extends CScrollArea {
    readonly #content = new CWidget();
    readonly #rows: FileRow[] = [];

    constructor(parent: CWidget) {
        super(parent);
        this.setWidget(this.#content);
    }

    addFile(file: File, remove: () => void): void {
        this.#rows.push(new FileRow(this.#content, file, remove));
        this.#layoutRows();
    }

    removeFile(index: number): void {
        this.#rows.splice(index, 1)[0]!.destroy();
        this.#layoutRows();
    }

    clear(): void {
        for (const row of this.#rows.splice(0)) row.destroy();
        this.#layoutRows();
    }

    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#layoutRows();
    }

    #layoutRows(): void {
        const rowHeight = 28;
        const height = this.#rows.length * rowHeight;
        const frame = 2 * this.frameWidth();
        const scrollbar = height > this.height() - frame ? CScrollArea.ScrollBarExtent : 0;
        const width = Math.max(0, this.width() - frame - scrollbar);
        this.#content.resize(width, height);
        this.#rows.forEach((row, index) => row.setGeometry(0, index * rowHeight, width, rowHeight));
        this.updateScrollBars();
    }
}

/** Collects local files for an application to use later. */
export class CUploadWidget extends CWidget {
    readonly filesChanged = new CSignal<[]>();
    readonly #files: File[] = [];
    readonly #pages = new CStackedWidget(this);
    readonly #empty = new EmptyFileList(this.#pages);
    readonly #list = new FileList(this.#pages);
    readonly #status = new CLabel(this);
    #accept = "";
    #maxFileCount = Infinity;
    #choosing = false;
    #disposed = false;
    #dragActive = false;

    constructor(parent: CWidget | null = null) {
        super(parent);

        const choose = new CPushButton(this);
        choose.setText("Choose files");
        choose.setMaximumSize(150, 36);
        choose.clicked.connect(() => void this.#chooseFiles());
        this.#status.setWordWrap(true);
        this.#status.setMaximumSize(Number.MAX_SAFE_INTEGER, 40);

        const buttons = new CHBoxLayout();
        buttons.setContentsMargins(0, 0, 0, 0);
        buttons.addWidget(choose);
        buttons.addStretch(1);

        const layout = new CVBoxLayout();
        const controls = new CWidget(this);
        controls.setMaximumSize(Number.MAX_SAFE_INTEGER, 36);
        controls.setLayout(buttons);
        layout.addWidget(controls);
        layout.addWidget(this.#status);
        this.#pages.addWidget(this.#empty);
        this.#pages.addWidget(this.#list);
        layout.addWidget(this.#pages, 1);
        this.setLayout(layout);
    }

    /** Sets a comma-separated list of MIME types, wildcards and file extensions. */
    setAccept(accept: string): void {
        this.#accept = accept;
    }

    accept(): string {
        return this.#accept;
    }

    /**
     * Limits further additions. Existing files are kept if the limit is lowered.
     * Pass Infinity to allow any number of files.
     */
    setMaxFileCount(count: number): void {
        if (count !== Infinity && (!Number.isSafeInteger(count) || count < 0)) {
            throw new RangeError("Maximum file count must be a non-negative integer or Infinity.");
        }

        this.#maxFileCount = count;
        this.#empty.singleFile = count === 1;
        this.#empty.update();
    }

    /** Returns a snapshot of the files selected so far. */
    files(): File[] {
        return [...this.#files];
    }

    removeFile(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.#files.length) return;
        this.#files.splice(index, 1);
        this.#list.removeFile(index);
        if (this.#files.length === 0) this.#pages.setCurrentWidget(this.#empty);
        this.filesChanged.emit();
    }

    clear(): void {
        if (this.#files.length === 0) return;
        this.#files.length = 0;
        this.#list.clear();
        this.#pages.setCurrentWidget(this.#empty);
        this.filesChanged.emit();
    }

    /** @internal */
    override acceptsExternalFiles(): boolean {
        return !this.#disposed;
    }

    /** @internal */
    override externalFileDragChanged(active: boolean): void {
        this.#dragActive = active;
        this.#empty.dragActive = active;
        this.update();
        this.#status.setText(active ? "Release to add files." : "");
    }

    /** @internal */
    override dropExternalFiles(files: readonly File[]): void {
        const filters = this.#accept.toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
        const fileKey = (file: File): string => JSON.stringify([file.name, file.size, file.lastModified]);
        const existing = new Set(this.#files.map(fileKey));
        let added = 0;
        let rejected = 0;
        let duplicates = 0;
        let overLimit = 0;
        for (const file of files) {
            const name = file.name.toLowerCase();
            const type = file.type.toLowerCase();
            const matches = filters.length === 0 || filters.some(filter => {
                if (filter.startsWith(".")) return name.endsWith(filter);
                if (filter.endsWith("/*")) return type.startsWith(filter.slice(0, -1));
                return type === filter;
            });
            if (!matches) {
                rejected++;
                continue;
            }

            const key = fileKey(file);
            if (existing.has(key)) {
                duplicates++;
                continue;
            }
            if (this.#files.length >= this.#maxFileCount) {
                overLimit++;
                continue;
            }
            existing.add(key);

            this.#files.push(file);
            this.#list.addFile(file, () => this.removeFile(this.#files.indexOf(file)));
            added++;
        }
        const messages: string[] = [];
        if (rejected > 0) messages.push(`${rejected} file(s) did not match the allowed types.`);
        if (duplicates > 0) messages.push(`${duplicates} file(s) already selected.`);
        if (overLimit > 0) messages.push(`File limit reached (${this.#maxFileCount}).`);
        if (messages.length > 0) this.#status.setText(messages.join(" "));
        if (added > 0) {
            this.#pages.setCurrentWidget(this.#list);
            this.filesChanged.emit();
        }
    }

    protected override paintEvent(painter: CPainter): void {
        if (!this.#dragActive) return;
        painter.setPen(this.palette().color(CPaletteColorRole.Highlight).toCss());
        painter.setLineWidth(3);
        painter.strokeRect(this.rect());
    }

    override destroy(): void {
        this.#disposed = true;
        super.destroy();
    }

    async #chooseFiles(): Promise<void> {
        if (this.#choosing) return;
        this.#choosing = true;
        try {
            const files = this.#maxFileCount === 1
                ? [await CFileDialog.getOpenFile(this.#accept)].filter(file => file !== null)
                : await CFileDialog.getOpenFiles(this.#accept);
            if (!this.#disposed && this.isEnabled() && files.length > 0) {
                this.externalFileDragChanged(false);
                this.dropExternalFiles(files);
            }
        } catch {
            if (!this.#disposed) this.#status.setText("Could not open the file picker.");
        } finally {
            this.#choosing = false;
        }
    }
}

