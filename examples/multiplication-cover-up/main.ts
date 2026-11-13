import {
    CApplication, CCursorShape, CFont, CHBoxLayout, CLabel, CMouseButton, CProgressBar, CPushButton, CRect,
    CVBoxLayout, CWidget, type CMouseEvent, type CPainter
} from "../../src/index.js";

const side = 10;
const products = Array.from({ length: side * side }, (_, i) =>
    (Math.floor(i / side) + 1) * (i % side + 1));

class CoveringGame extends CWidget {
    private tiles: Array<number | null> = [];
    private covered = new Set<number>();
    private playing = false;
    private drag: { index: number; x: number; y: number } | null = null;

    constructor(parent: CWidget, private readonly onPlace: (count: number) => void) {
        super(parent);
        this.shuffleTiles();
    }

    start(): void {
        if (this.playing) this.shuffleTiles();
        this.playing = true;
        this.covered.clear();
        this.drag = null;
        this.update();
    }

    private shuffleTiles(): void {
        this.tiles = [...products];
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j]!, this.tiles[i]!];
        }
    }

    cancelDrag(): void {
        if (this.drag === null) return;
        this.drag = null;
        this.updateTileCursor(-1, -1);
        this.update();
    }

    private tileAt(x: number, y: number): number {
        const { tray, cell } = this.geometryForGrids();
        return this.indexAt(x, y, tray, cell);
    }

    private updateTileCursor(x: number, y: number): void {
        const shape = this.playing && this.tiles[this.tileAt(x, y)] != null
            ? CCursorShape.Grab : CCursorShape.Arrow;
        this.setCursor(shape);
        CApplication.instance().canvas().style.cursor = shape === CCursorShape.Grab ? "grab" : "default";
    }

    keepDragCursor(): void {
        if (this.drag !== null) CApplication.instance().canvas().style.cursor = "grabbing";
    }

    private geometryForGrids() {
        const sideBySideCell = Math.min((this.width() - 16) / (2 * side), (this.height() - 24) / side);
        const stackedCell = Math.min(this.width() / side, (this.height() - 56) / (2 * side));
        const stacked = stackedCell > sideBySideCell;
        const cell = Math.max(0, Math.floor(stacked ? stackedCell : sideBySideCell));
        const size = side * cell;
        const left = (this.width() - (stacked ? size : 2 * size + 16)) / 2;
        return {
            cell, size,
            board: { x: left, y: 24 },
            tray: { x: stacked ? left : left + size + 16, y: stacked ? size + 56 : 24 }
        };
    }

    private indexAt(x: number, y: number, origin: { x: number; y: number }, cell: number): number {
        if (cell === 0) return -1;
        const column = Math.floor((x - origin.x) / cell);
        const row = Math.floor((y - origin.y) / cell);
        return row >= 0 && row < side && column >= 0 && column < side ? row * side + column : -1;
    }

    protected override paintEvent(painter: CPainter): void {
        const { board, tray, cell, size } = this.geometryForGrids();
        if (cell === 0) return;
        const font = new CFont();
        painter.setTextAlign("center");
        font.setPixelSize(15);
        painter.setFont(font);
        painter.setTextBaseline("middle");
        painter.setFillStyle("#172b4d");
        painter.drawText("Board", board.x + size / 2, board.y - 11);
        painter.drawText("Tiles", tray.x + size / 2, tray.y - 11);

        font.setPixelSize(Math.min(28, Math.max(5, Math.floor(cell * 0.32))));
        painter.setFont(font);

        const draw = (x: number, y: number, text: string, fill: string, color = "#172b4d") => {
            painter.setFillStyle(fill);
            painter.fillRect(new CRect(x + 1, y + 1, Math.max(0, cell - 2), Math.max(0, cell - 2)));
            painter.setFillStyle(color);
            painter.drawText(text, x + cell / 2, y + cell / 2);
        };

        products.forEach((product, index) => {
            const x = index % side * cell;
            const y = Math.floor(index / side) * cell;
            const covered = this.covered.has(index);
            draw(board.x + x, board.y + y,
                covered ? String(product) : `${Math.floor(index / side) + 1}×${index % side + 1}`,
                covered ? "#a9e2c0" : "#e8eef8");
            const tile = this.tiles[index];
            const present = tile != null && this.drag?.index !== index;
            draw(tray.x + x, tray.y + y, present ? String(tile) : "", present ? "#ffe3a2" : "#f2f4f8");
        });

        if (this.drag !== null) {
            const { index, x, y } = this.drag;
            draw(x - cell / 2, y - cell / 2, String(this.tiles[index]), "#2454a4", "#ffffff");
        }
    }

    protected override mousePressEvent(event: CMouseEvent): void {
        const index = this.tileAt(event.x(), event.y());
        if (!this.playing || event.button() !== CMouseButton.LeftButton || this.tiles[index] == null) return;
        this.drag = { index, x: event.x(), y: event.y() };
        this.setCursor(CCursorShape.Grabbing);
        this.keepDragCursor();
        this.update();
        event.accept();
    }

    protected override mouseMoveEvent(event: CMouseEvent): void {
        if (this.drag === null) {
            this.updateTileCursor(event.x(), event.y());
            return;
        }
        this.drag.x = event.x();
        this.drag.y = event.y();
        this.update();
        event.accept();
    }

    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (this.drag === null) return;
        const { index } = this.drag;
        this.drag = null;
        const { board, cell } = this.geometryForGrids();
        const field = this.indexAt(event.x(), event.y(), board, cell);
        if (field >= 0 && !this.covered.has(field) && products[field] === this.tiles[index]) {
            this.covered.add(field);
            this.tiles[index] = null;
            this.onPlace(this.covered.size);
        }
        this.updateTileCursor(event.x(), event.y());
        this.update();
        event.accept();
    }
}

const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (canvas === null) throw new Error("Canvas element not found.");

const app = new CApplication(canvas);
const root = new CWidget();
root.resize(app.paintDevice().width(), app.paintDevice().height());
const start = new CPushButton(root);
start.setText("Start");
start.setMaximumSize(150, 40);
const clock = new CLabel(root);
const clockFont = clock.font();
clockFont.setPixelSize(30);
clock.setFont(clockFont);
clock.setText("00:00.0");

const instructions = new CLabel(root);
instructions.setMaximumSize(Number.MAX_SAFE_INTEGER, 26);
instructions.setText("Drag each tile onto a matching multiplication problem.");

const progress = new CProgressBar(root);
progress.setRange(0, products.length);
progress.setMaximumSize(Number.MAX_SAFE_INTEGER, 30);

let timer: number | undefined;
let startedAt = 0;
const updateClock = (): void => {
    const tenths = Math.floor((performance.now() - startedAt) / 100);
    const minutes = String(Math.floor(tenths / 600)).padStart(2, "0");
    const seconds = String(Math.floor(tenths / 10) % 60).padStart(2, "0");
    clock.setText(`${minutes}:${seconds}.${tenths % 10}`);
};
const game = new CoveringGame(root, placed => {
    progress.setValue(placed);
    if (placed === products.length) {
        window.clearInterval(timer);
        updateClock();
    }
});
// The dragged tile keeps its cursor even when another widget is under the pointer.
canvas.addEventListener("pointermove", () => game.keepDragCursor());
canvas.addEventListener("pointercancel", () => game.cancelDrag());
canvas.addEventListener("lostpointercapture", () => game.cancelDrag());
start.clicked.connect(() => {
    window.clearInterval(timer);
    game.start();
    progress.reset();
    startedAt = performance.now();
    start.setText("Restart");
    updateClock();
    timer = window.setInterval(updateClock, 100);
});

const layout = new CVBoxLayout();
layout.setContentsMargins(12, 8, 12, 8);
layout.setSpacing(6);
const controls = new CWidget(root);
controls.setMaximumSize(Number.MAX_SAFE_INTEGER, 44);
const toolbar = new CHBoxLayout();
toolbar.setContentsMargins(0, 0, 0, 0);
toolbar.setSpacing(12);
toolbar.addWidget(start);
toolbar.addWidget(clock);
toolbar.addStretch(1);
controls.setLayout(toolbar);
layout.addWidget(controls);
layout.addWidget(instructions);
layout.addWidget(progress);
layout.addWidget(game, 1);
root.setLayout(layout);
app.run();
