import {
    CAction, CApplication, CGridLayout, CLabel, CLineEdit, CMainWindow,
    CMenu, CMenuBar, CPushButton, CStatusBar, CTextEdit, CWidget, type CPainter
} from "../../src/index.js";

class NotesWindow extends CMainWindow {
    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);

        const central = this.centralWidget();
        if (central !== null) {
            this.statusBar()?.showMessage(
                `Window ${this.width()} × ${this.height()}  |  Central ${central.width()} × ${central.height()} px`
            );
        }
    }
}

class SizePanel extends CWidget {
    constructor(parent: CWidget, private readonly label: string, private readonly editor?: CWidget) {
        super(parent);
    }

    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle("#eaf0f7");
        painter.fillRect(this.rect());
        painter.setStrokeStyle("#8294a8");
        painter.strokeRect(this.rect());
        painter.setFillStyle("#192a3d");
        painter.setFont(this.font());
        painter.drawText(`${this.label} · ${this.width()} × ${this.height()} px`, 10, 20);
        if (this.editor !== undefined) {
            painter.drawText(`Note · ${this.editor.width()} × ${this.editor.height()} px`, 10, 40);
        }
    }
}

const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (canvas === null) {
    throw new Error("Canvas element not found.");
}

const app = new CApplication(canvas);
const mainWindow = new NotesWindow();
const menuBar = new CMenuBar(mainWindow);
mainWindow.setMenuBar(menuBar);
mainWindow.setStatusBar(new CStatusBar(mainWindow));

const central = new CWidget();
mainWindow.setCentralWidget(central);

const titleLabel = new CLabel(central);
titleLabel.setText("Title");
const title = new CLineEdit(central);
title.setPlaceholderText("Note title");
titleLabel.setBuddy(title);

const bodyLabel = new CLabel(central);
bodyLabel.setText("Note");
const body = new CTextEdit(central);
body.setPlaceholderText("Write a note…");
bodyLabel.setBuddy(body);

const sampleButton = new CPushButton(central);
sampleButton.setText("Load sample");

const grid = new CGridLayout();
grid.setContentsMargins(12, 12, 12, 12);
grid.setSpacing(8);
grid.setColumnStretch(1, 3);
grid.setColumnStretch(3, 1);
grid.setRowStretch(2, 3);
grid.setRowStretch(3, 1);
grid.addWidget(titleLabel, 0, 0);
grid.addWidget(title, 0, 1);
grid.addWidget(sampleButton, 0, 2);
grid.addWidget(bodyLabel, 1, 0, 1, 3);
grid.addWidget(body, 2, 0, 1, 3);

const sidePanel = new SizePanel(central, "Right panel", body);
sidePanel.setMinimumSize(180, 52);
grid.addWidget(sidePanel, 2, 3);

const bottomPanel = new SizePanel(central, "Bottom panel");
bottomPanel.setMinimumSize(0, 32);
grid.addWidget(bottomPanel, 3, 0, 1, 4);
central.setLayout(grid);

const loadSample = (): void => {
    title.setText("Weekend plans");
    body.setPlainText("Buy groceries\nGo for a walk\nCall a friend");
    body.setFocus();
};
sampleButton.clicked.connect(loadSample);

const notesMenu = new CMenu();
const newNote = notesMenu.addAction(new CAction("New note"));
newNote.triggered.connect(() => {
    title.setText("");
    body.clear();
    title.setFocus();
});
notesMenu.addAction(new CAction("Load sample")).triggered.connect(loadSample);
menuBar.addMenu("Notes", notesMenu);

const editMenu = new CMenu();
editMenu.addAction(new CAction("Focus note")).triggered.connect(() => body.setFocus());
menuBar.addMenu("Edit", editMenu);

const viewport = app.paintDevice();
mainWindow.setGeometry(0, 0, viewport.width(), viewport.height());
app.run();
