import {CApplication, CWidget, CPainter, CRect, CMouseEvent, CMouseButton, CPushButton, CLabel, CAlignment,
    CCheckBox, CLineEdit, CSlider, CProgressBar, CGroupBox, CSpinBox, CScrollBar, COrientation, CPixmap,
    CRadioButton, CButtonGroup, CHBoxLayout, CScrollArea, CMenu, CAction, CMenuBar, CDialog,
	CDialogButtonBox, CStandardButton, CSelectionMode, CListWidget, CListWidgetItem, CStackedWidget,
	CTabWidget, CFrame, CFrameShadow, CFrameShape, CComboBox, CFormLayout, CToolButton, CToolButtonStyle,
	CToolBar, CToolBarArea, CStatusBar, CMainWindow, CMessageBox, CInputDialog, CFileDialog, CProgressDialog, CColor, 
	CColorDialog, CSplitter, CSizeGrip, CToolBox, CCalendarWidget, CDateEdit, CTimeEdit, CDateTimeEdit,
	CTextEdit, CKeySequenceEdit, CListView, CModelIndex, CAbstractListModel, CTableView, CAbstractTableModel,
	CTreeView, CAbstractItemModel, CTreeWidgetItem, CTreeWidget, CTableWidgetItem, CTableWidget, 
	CContextMenuEvent, CDragEnterEvent, CDragMoveEvent, CDragLeaveEvent, CDropEvent,
	CDrag, CMimeData, CDropAction, CIcon, CDockWidget, CDockWidgetArea,
	CCursorShape, CDial, CTextBrowser
} from "../../src/index.js";

class RedWidget extends CWidget {
	#m_color: string = "#ffa0a0";
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle(this.#m_color);
        painter.fillRect(
            new CRect(0, 0, this.width(), this.height())
        );
    }

	setColor(color: string): void {
		if (color !== this.#m_color) {
			this.#m_color = color;
			this.update();
		}
	}

	color(): string {
		return this.#m_color;
	}
}

class GreenWidget extends CWidget {
	#m_color: string = "#00a000";
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle(this.#m_color);
        painter.fillRect(
            new CRect(0, 0, this.width(), this.height())
        );
    }

	setColor(color: string): void {
		if (color !== this.#m_color) {
			this.#m_color = color;
			this.update();
		}
	}

	color(): string {
		return this.#m_color;
	}
}


class BlueWidget extends CWidget {
	#m_color = "blue";

	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle(this.#m_color);
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_color = this.#m_color === "blue" ? "green" : "blue";

		event.accept();
		this.update();
	}
}

class ScrollContentWidget extends CWidget {
	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle("#ffffff");
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));

		painter.setStrokeStyle("#d0d0d0");
		painter.setFillStyle("#202020");
		painter.setFont("14px sans-serif");

		for (let x = 0; x <= this.width(); x += 100) {
			painter.drawLine(x, 0, x, this.height());
			painter.drawText(`${x}`, x + 4, 18);
		}

		for (let y = 0; y <= this.height(); y += 100) {
			painter.drawLine(0, y, this.width(), y);
			painter.drawText(`${y}`, 4, y + 18);
		}

		painter.setFillStyle("#f0f0f0");
		painter.fillRect(new CRect(120, 100, 220, 120));

		painter.setFillStyle("#202020");
		painter.drawText("Top-left area", 140, 140);

		painter.setFillStyle("#f0f0f0");
		painter.fillRect(new CRect(700, 500, 220, 120));

		painter.setFillStyle("#202020");
		painter.drawText("Bottom-right area", 720, 540);
	}
}

class CStringListModel extends CAbstractListModel {
	#m_items: string[];

	constructor(items: string[]) {
		super();
		this.#m_items = items;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_items.length;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_items[index.row()] ?? null;
	}
}

class DemoTableModel extends CAbstractTableModel {
	#m_rows: string[][] = [
		["Alice", "Slovenia", "30", "Ljubljana", "Developer"],
		["Bob", "Austria", "42", "Vienna", "Designer"],
		["Carol", "Italy", "35", "Milan", "Manager"],
		["David", "Germany", "51", "Munich", "Engineer"],
		["Emma", "France", "28", "Paris", "Developer"],
		["Frank", "Croatia", "44", "Zagreb", "Architect"],
		["Grace", "Hungary", "37", "Budapest", "Analyst"],
		["Henry", "Czechia", "48", "Prague", "Manager"],
		["Isabella", "Spain", "32", "Madrid", "Designer"],
		["Jack", "Portugal", "39", "Lisbon", "Developer"],
		["Klara", "Slovenia", "27", "Maribor", "Engineer"],
		["Lukas", "Austria", "46", "Graz", "Manager"],
		["Maria", "Italy", "41", "Rome", "Architect"],
		["Nina", "Germany", "34", "Berlin", "Developer"],
		["Oliver", "France", "53", "Lyon", "Analyst"],
		["Peter", "Croatia", "38", "Split", "Engineer"],
		["Sara", "Hungary", "29", "Szeged", "Designer"],
		["Thomas", "Czechia", "45", "Brno", "Manager"],
		["Eva", "Spain", "36", "Barcelona", "Developer"],
		["William", "Portugal", "50", "Porto", "Architect"]
	];

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_rows.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_rows[0]?.length ?? 0;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_rows[index.row()]?.[index.column()] ?? null;
	}

	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		if (orientation === COrientation.Horizontal) {
			return [
				"Name",
				"Country",
				"Age",
				"City",
				"Occupation"
			][section] ?? null;
		}

		return section + 1;
	}
}

class ContextMenuWidget extends CWidget {
	#m_menu = new CMenu();

	constructor() {
		super();

		const action1 = new CAction("Copy");
		const action2 = new CAction("Paste");
		const action3 = new CAction("Delete");

		action1.triggered.connect(() => {
			console.log("Copy");
		});

		action2.triggered.connect(() => {
			console.log("Paste");
		});

		action3.triggered.connect(() => {
			console.log("Delete");
		});

		this.#m_menu.addAction(action1);
		this.#m_menu.addAction(action2);
		this.#m_menu.addSeparator();
		this.#m_menu.addAction(action3);
	}

	protected override contextMenuEvent(
		event: CContextMenuEvent): void {
		this.#m_menu.exec(event.globalPos());
		event.accept();
	}

	protected override paintEvent(painter: CPainter): void {
		painter.drawText("Right click me", 10, 25);
	}
}

type TreeNode = {
	values: string[];
	parent: TreeNode | null;
	children: TreeNode[];
};

function node(values: string[], children: TreeNode[] = []): TreeNode {
	const result: TreeNode = {
		values,
		parent: null,
		children
	};

	for (const child of children)
		child.parent = result;

	return result;
}

class DemoTreeModel extends CAbstractItemModel {
	#m_root: TreeNode;

	constructor(root: TreeNode) {
		super();

		this.#m_root = root;
		this.#setParents(this.#m_root, null);
	}

	override rowCount(parent = new CModelIndex()): number {
		return this.#nodeForParent(parent).children.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return 3;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		const treeNode = index.data() as TreeNode;

		return treeNode.values[index.column()] ?? null;
	}

	override index(row: number, column: number,
		parent = new CModelIndex()): CModelIndex {
		if (row < 0 || column < 0 || column >= this.columnCount(parent))
			return new CModelIndex();

		const parentNode = this.#nodeForParent(parent);
		const child = parentNode.children[row];

		if (child === undefined)
			return new CModelIndex();

		return this.createIndex(row, column, child);
	}

	override parentIndex(index: CModelIndex): CModelIndex {
		if (!index.isValid())
			return new CModelIndex();

		const treeNode = index.data() as TreeNode;
		const parent = treeNode.parent;

		if (parent === null || parent === this.#m_root)
			return new CModelIndex();

		const grandParent = parent.parent;

		if (grandParent === null)
			return new CModelIndex();

		const row = grandParent.children.indexOf(parent);

		if (row < 0)
			return new CModelIndex();

		return this.createIndex(row, 0, parent);
	}

	override headerData(section: number,
		orientation: COrientation): string | number | null {
		if (orientation === COrientation.Horizontal)
			return ["Name", "Type", "Size"][section] ?? null;

		return section + 1;
	}

	#nodeForParent(index: CModelIndex): TreeNode {
		if (!index.isValid())
			return this.#m_root;

		return index.data() as TreeNode;
	}

	#setParents(treeNode: TreeNode, parent: TreeNode | null): void {
		treeNode.parent = parent;

		for (const child of treeNode.children)
			this.#setParents(child, treeNode);
	}
}

class DragSourceWidget extends CWidget {
	#m_dragging = false;
	#m_inProgress = false;

	override cursor(): CCursorShape {
		return this.#m_inProgress === true? CCursorShape.Grabbing : 
			CCursorShape.Grab;
	}

	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle("#4080e0");
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));

		painter.setFillStyle("#ffffff");
		painter.drawText("Drag me", 20, 35);
	}

	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_inProgress = false;
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_dragging = true;
		this.#m_inProgress = true;
		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;

		const mimeData = new CMimeData();
		mimeData.setText("Hello from CDrag!");

		const drag = new CDrag(this);
		drag.setMimeData(mimeData);
		drag.exec(CDropAction.CopyAction);

		CApplication.instance().startDrag(drag);

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		this.#m_dragging = false;
		this.#m_inProgress = false;
		event.accept();
	}
}

class DropTargetWidget extends CWidget {
	#m_dragOver = false;
	#m_text = "Drop here";

	constructor(parent: CWidget) {
		super(parent);
		this.setAcceptDrops(true);
	}

	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle(this.#m_dragOver ? "#80d080" : "#50a050");
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));

		painter.setFillStyle("#ffffff");
		painter.drawText(this.#m_text, 15, 35);
	}

	protected override dragEnterEvent(event: CDragEnterEvent): void {
		if (!event.mimeData().hasText()) {
			event.ignore();
			return;
		}

		this.#m_dragOver = true;
		this.update();
		event.acceptProposedAction();
	}

	protected override dragMoveEvent(event: CDragMoveEvent): void {
		event.acceptProposedAction();
	}

	protected override dragLeaveEvent(event: CDragLeaveEvent): void {
		this.#m_dragOver = false;
		this.update();
		event.accept();
	}

	protected override dropEvent(event: CDropEvent): void {
		this.#m_dragOver = false;
		this.#m_text = event.mimeData().text();
		this.update();

		event.acceptProposedAction();
	}
}

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (canvas === null)
    throw new Error("Canvas element not found.");

const app = new CApplication(canvas);

const mainWindow = new CMainWindow();

mainWindow.setGeometry(0, 0, canvas.width, canvas.height);

const parent = new RedWidget();
mainWindow.setCentralWidget(parent);

const but = new CPushButton(parent);
but.setGeometry(50, 50, 100, 30);
but.setText("Click me");

but.clicked.connect(async () => {
		const dlg = new CDialog(parent);
		dlg.setGeometry(150, 150, 600, 550);
		dlg.setWindowTitle("Settings");

		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel, dlg );

		buttonBox.setGeometry(10, 500, 580, 30);

		buttonBox.accepted.connect(() => {
			dlg.accept();
		});

		buttonBox.rejected.connect(() => {
			dlg.reject();
		});

		dlg.accepted.connect(() =>
		{
			console.log("Dlg accepted");
		});

		dlg.rejected.connect(() =>
		{
			console.log("Dialog rejected");
		});

		const toolBar = new CToolBar(dlg);
		toolBar.setGeometry(0, 0, 500, 36);

		const newAction = new CAction("New");
		const openAction = new CAction("Open");
		const saveAction = new CAction();
		const pixmap = await CPixmap.fromUrl("/icons/save.png");
		const icon = new CIcon(pixmap);
		saveAction.setIcon(icon);
		toolBar.addAction(newAction);

		toolBar.addAction(openAction);
		toolBar.addSeparator();
		toolBar.addAction(saveAction);

		const list = new CListWidget(dlg);
		list.setGeometry(20, 50, 180, 160);
		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");
		list.addItem("Italy");
		list.addItem("France");
		list.addItem("Spain");
		list.addItem("Portugal");
		list.addItem("Croatia");
		const disabledItem = new CListWidgetItem("Disabled");
		disabledItem.setEnabled(false);
		list.addItem(disabledItem);
		list.addItem("Hungary");
		list.addItem("Poland");
		list.setMidLineWidth(4);

		list.currentRowChanged.connect(row =>
		{
			console.log("current row:", row);
		});

		list.itemClicked.connect(item =>
		{
			console.log("clicked:", item.text());
		});
		list.setSelectionMode(CSelectionMode.MultiSelection);

		const sw = new CStackedWidget(dlg);
		sw.setGeometry(250, 50, 200, 100);

		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		const button1 = new CPushButton(page1);
		button1.setGeometry(20, 20, 120, 30);
		button1.setText("Page 1");

		const button2 = new CPushButton(page2);
		button2.setGeometry(20, 20, 120, 30);
		button2.setText("Page 2");

		const button3 = new CPushButton(page3);
		button3.setGeometry(20, 20, 120, 30);
		button3.setText("Page 3");

		sw.addWidget(page1);
		sw.addWidget(page2);
		sw.addWidget(page3);

		const previous = new CPushButton(dlg);
		previous.setGeometry(450, 60, 100, 30);
		previous.setText("Previous");

		const next = new CPushButton(dlg);
		next.setGeometry(450, 90, 100, 30);
		next.setText("Next");

		previous.clicked.connect(() =>
		{
			if (sw.currentIndex() > 0)
				sw.setCurrentIndex(sw.currentIndex() - 1);
		});

		next.clicked.connect(() =>
		{
			if (sw.currentIndex() < sw.count() - 1)
				sw.setCurrentIndex(sw.currentIndex() + 1);
		});

		sw.currentChanged.connect(index =>
		{
			console.log("Current page:", index);
		});

		const tw = new CTabWidget(dlg);
		tw.setGeometry(10, 300, 300, 150);
		const rw = new RedWidget(tw);
		const bw = new BlueWidget(tw);
		tw.addTab(rw, "Red");
		tw.addTab(bw, "Blue");

		const fr = new CFrame(rw);
		fr.setGeometry(20, 20, 150, 60);
		fr.setFrameShape(CFrameShape.Box);
		fr.setFrameShadow(CFrameShadow.Sunken);
		fr.setLineWidth(1);
		fr.setMidLineWidth(1);

		var lyt = new CHBoxLayout;
		lyt.setContentsMargins(0, 0, 0, 0);
		var pb2 = new CPushButton();
		pb2.setText("Pushbutton at 0,0");
		lyt.addWidget(pb2);
		fr.setLayout(lyt);

		const cb = new CComboBox(dlg);
		cb.setGeometry(300, 200, 200, 30);
		cb.addItem("Bosnia and Herzegovina");
		cb.addItem("Croatia");
		cb.addItem("Montenegro");
		cb.addItem("North Macedonia");
		cb.addItem("Serbia");
		cb.addItem("Slovenia");
		cb.setEditable(true);

		const tb = new CToolButton(dlg)
		tb.setGeometry(350, 260, 60, 60);
		tb.setText("TB");
		const grip = new CSizeGrip(dlg);
		grip.setGeometry(dlg.width() - 16, dlg.height() - 16, 16, 16);
		dlg.exec();
	});

const but2 = new CPushButton(parent);
but2.setGeometry(500, 50, 100, 30);
but2.setText("Open dialog");
but2.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 500, 400);

	const bb = new CDialogButtonBox(CStandardButton.Ok | CStandardButton.Cancel, dlg);
	bb.setGeometry(0, 360, 490, 30);

	bb.accepted.connect(() => {
			dlg.accept();
		});

	bb.rejected.connect(() => {
			dlg.reject();
		});

	const gb = new CGroupBox("Settings", dlg);
	gb.setGeometry(6, 6, 488, 330);
	const fl = new CFormLayout();
	gb.setLayout(fl);
	const leName = new CLineEdit();
	leName.setEnabled(false);
	fl.addRow("Name", leName);
	const leSurname = new CLineEdit();
	fl.addRow("Last Name", leSurname);

	const cw = new CCalendarWidget(gb);
	cw.setGeometry(240, 120, 240, 200);
	dlg.exec();
});

const but3 = new CPushButton(parent);
but3.setGeometry(620, 50, 100, 30);
but3.setText("CTableView");
but3.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("Employees");

	const tv = new CTableView(dlg);
	tv.setGeometry(50, 20, 500, 330);
	const model = new DemoTableModel();
	tv.setModel(model);

	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
});

const but4 = new CPushButton(parent);
but4.setGeometry(740, 50, 100, 30);
but4.setText("CTreeView");
but4.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("Something");

	const root = node(["Root", "", ""], [
	node(["src", "Folder", ""], [
		node(["core", "Folder", ""], [
			node(["CApplication.ts", "TypeScript", "18 KB"]),
			node(["CObject.ts", "TypeScript", "7 KB"]),
			node(["CSignal.ts", "TypeScript", "3 KB"])
		]),
		node(["events", "Folder", ""], [
			node(["CEvent.ts", "TypeScript", "4 KB"]),
			node(["CKeyEvent.ts", "TypeScript", "3 KB"]),
			node(["CMouseEvent.ts", "TypeScript", "5 KB"])
		]),
		node(["geometry", "Folder", ""], [
			node(["CPoint.ts", "TypeScript", "2 KB"]),
			node(["CRect.ts", "TypeScript", "5 KB"]),
			node(["CSize.ts", "TypeScript", "2 KB"])
		]),
		node(["models", "Folder", ""], [
			node(["CAbstractItemModel.ts", "TypeScript", "5 KB"]),
			node(["CItemSelectionModel.ts", "TypeScript", "6 KB"]),
			node(["CModelIndex.ts", "TypeScript", "3 KB"])
		]),
		node(["widgets", "Folder", ""], [
			node(["CButton.ts", "TypeScript", "6 KB"]),
			node(["CLineEdit.ts", "TypeScript", "15 KB"]),
			node(["CListView.ts", "TypeScript", "11 KB"]),
			node(["CTableView.ts", "TypeScript", "16 KB"]),
			node(["CTreeView.ts", "TypeScript", "18 KB"]),
			node(["CWidget.ts", "TypeScript", "25 KB"])
		])
	]),
	node(["tests", "Folder", ""], [
		node(["core", "Folder", ""], [
			node(["CApplication.test.ts", "Test", "32 KB"]),
			node(["CObject.test.ts", "Test", "14 KB"])
		]),
		node(["models", "Folder", ""], [
			node(["CModelIndex.test.ts", "Test", "9 KB"]),
			node(["CItemSelectionModel.test.ts", "Test", "18 KB"])
		]),
		node(["widgets", "Folder", ""], [
			node(["CListView.test.ts", "Test", "17 KB"]),
			node(["CTableView.test.ts", "Test", "24 KB"]),
			node(["CTreeView.test.ts", "Test", "28 KB"])
		])
	]),
	node(["examples", "Folder", ""], [
		node(["main.ts", "TypeScript", "8 KB"]),
		node(["index.html", "HTML", "2 KB"])
	]),
	node(["package.json", "JSON", "1 KB"]),
	node(["tsconfig.json", "JSON", "1 KB"]),
	node(["README.md", "Markdown", "6 KB"])
	]);

	const model = new DemoTreeModel(root);
	const tree = new CTreeView(dlg);
	tree.setModel(model);

	tree.expanded.connect(index => {
		console.log("expanded:", model.data(index));
	});

	tree.collapsed.connect(index => {
		console.log("collapsed:", model.data(index));
	});

	tree.selectionModel()?.currentChanged.connect((current, previous) => {
		console.log("current:", model.data(current), "previous:", model.data(previous));
	});
	tree.setGeometry(50, 20, 500, 330);
	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
	
});

const but5 = new CPushButton(parent);
but5.setText("CTreeWidget");
but5.setGeometry(30, 700, 100, 30);
but5.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("CTreeWidget");

	const tree = new CTreeWidget(dlg);
	tree.setGeometry(20, 20, 600, 350);
	tree.setHeaderLabels(["Name", "Type", "Size"]);

	const documents = new CTreeWidgetItem(["Documents", "Folder", ""]);
	const projects = new CTreeWidgetItem(["Projects", "Folder", ""]);
	const canvasToolkit = new CTreeWidgetItem(["Canvas Toolkit", "Project", ""]);
	const src = new CTreeWidgetItem(["src", "Folder", ""]);
	const widgets = new CTreeWidgetItem(["widgets", "Folder", ""]);
	widgets.addChild(new CTreeWidgetItem(["CTreeWidget.ts", "TypeScript", "8 KB"]));
	widgets.addChild(new CTreeWidgetItem(["CTreeWidgetItem.ts", "TypeScript", "3 KB"]));
	widgets.addChild(new CTreeWidgetItem(["CTableView.ts", "TypeScript", "14 KB"]));
	src.addChild(widgets);
	src.addChild(new CTreeWidgetItem(["main.ts", "TypeScript", "2 KB"]));
	canvasToolkit.addChild(src);

	canvasToolkit.addChild(new CTreeWidgetItem(["package.json", "JSON", "1 KB"]));
	canvasToolkit.addChild(new CTreeWidgetItem(["tsconfig.json", "JSON", "1 KB"]));
	projects.addChild(canvasToolkit);
	projects.addChild(new CTreeWidgetItem(["ChessCoach", "Project", ""]));

	documents.addChild(projects);
	documents.addChild(new CTreeWidgetItem(["notes.txt", "Text file", "12 KB"]));
	const downloads = new CTreeWidgetItem(["Downloads", "Folder", ""]);
	downloads.addChild(new CTreeWidgetItem(["canvas-toolkit.zip", "ZIP archive", "184 KB" ]));
	downloads.addChild(new CTreeWidgetItem(["typescript.pdf", "PDF document", "3.2 MB"]));
	const pictures = new CTreeWidgetItem(["Pictures", "Folder", ""]);
	pictures.addChild(new CTreeWidgetItem(["holiday.jpg", "JPEG image", "4.8 MB"]));

	pictures.addChild(new CTreeWidgetItem(["screenshot.png", "PNG image", "820 KB"]));

	tree.addTopLevelItem(documents);
	tree.addTopLevelItem(downloads);
	tree.addTopLevelItem(pictures);

	tree.currentItemChanged.connect((current, previous) => {
		console.log("current:", current?.text(0) ?? null, "previous:", previous?.text(0) ?? null);
	});
	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
});

const but6 = new CPushButton(parent);
but6.setText("CTableWidget");
but6.setGeometry(150, 700, 100, 30);
but6.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("CTableWidget");

	const table = new CTableWidget(dlg);

	table.setGeometry(20, 20, 650, 350);
	table.setRowCount(15);
	table.setColumnCount(4);

	table.setHorizontalHeaderLabels(["Name", "Occupation", "Age", "City"]);

	//table.setVerticalHeaderLabels(["1", "2", "3", "4", "5", "6", "7", "8"]);

	const data = [
		["Bojan", "Programmer", "52", "Maribor"],
		["Peter", "Engineer", "48", "Ljubljana"],
		["Ana", "Designer", "35", "Celje"],
		["Marko", "Architect", "41", "Koper"],
		["Maja", "Accountant", "39", "Ptuj"],
		["Luka", "Developer", "29", "Kranj"],
		["Nina", "Project Manager", "44", "Nova Gorica"],
		["Tomaž", "System Administrator", "37", "Velenje"],
		["Žana", "Designer", "35", "Celje"],
		["Darko", "Architect", "41", "Koper"],
		["Kaja", "Accountant", "39", "Ptuj"],
		["Ines", "Developer", "29", "Kranj"],
		["Nika", "Project Manager", "44", "Nova Gorica"],
		["Frančeškin", "System Administrator", "37", "Velenje"],
		["Domagoj", "System Administrator", "37", "Velenje"]
	];

	for (let row = 0; row < data.length; row++) {
		for (let column = 0; column < data[row]!.length; column++) {
			table.setItem(row, column,
				new CTableWidgetItem(data[row]![column]!));
		}
	}

	table.currentItemChanged.connect((current, previous) => {
		console.log("current:", current?.text() ?? null, "previous:",
			previous?.text() ?? null);
	});
	
	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
});

const lab = new CLabel(parent);
lab.setGeometry(250, 50, 130, 40);
lab.setText("Jaz sem CLabel");
lab.setToolTip("This is CLabel, you won't believe that...");
lab.setAlignment(CAlignment.Right | CAlignment.Top);
lab.setFrameShape(CFrameShape.VLine);
lab.setFrameShadow(CFrameShadow.Raised);

const lab2 = new CLabel(parent);
lab2.setGeometry(250, 100, 60, 60);
//lab2.setPixmap(await CPixmap.fromUrl("https://lh3.googleusercontent.com/a/ACg8ocLmgw58KyM8NCkoYwv98Z1rhTAHr5doS1DcOM8s60xFXhZIN3Qb=s96-c"));
lab2.setText("Bojan");

const kse = new CKeySequenceEdit(parent);
kse.setGeometry(800, 20, 100, 30);

const child = new BlueWidget(parent);
child.setToolTip("Blue widget");
child.setGeometry(250, 250, 150, 100);

const cbox = new CCheckBox(child);
cbox.setText("Check me?");
cbox.setGeometry(10, 10, 100, 30);

const cbox2 = new CCheckBox(parent);
cbox2.setText("Check me again");
cbox2.setGeometry(10, 10, 150, 30);

const rb1 = new CRadioButton("Radio buttons", parent);
rb1.setGeometry(360, 100, 120, 20);
const rb2 = new CRadioButton("Check boxes", parent);
rb2.setGeometry(360, 120, 120, 20);
const rb3 = new CRadioButton("PushButtons", parent);
rb3.setGeometry(360, 140, 120, 20);
const cb = new CButtonGroup(parent);
cb.addButton(rb1);
cb.addButton(rb2);
cb.addButton(rb3);

const le = new CLineEdit(parent);
le.setGeometry(10, 100, 150, 20);
le.setText("Edited text");

const gb = new CGroupBox("Sliders & bars", parent);
gb.setGeometry(5, 135, 210, 160);

const sl = new CSlider(gb)
sl.setGeometry(5, 15, 200, 16);

const pb = new CProgressBar(gb);
pb.setGeometry(5, 45, 200, 16);
pb.setValue(0);

const sbox = new CSpinBox(gb);
sbox.setGeometry(5, 75, 80, 28);
sbox.setValue(30);
sbox.valueChanged.connect(value => {
	console.log("spin value:", value);
});

const sbar = new CScrollBar(COrientation.Horizontal, gb);
sbar.setGeometry(5, 115, 200, 16);

const vbar = new CScrollBar(COrientation.Vertical, parent);
vbar.setGeometry(220, 50, 16, 200);

const w = new CWidget(parent);
w.setGeometry(0, 440, 640, 40);
const pb1 = new CPushButton(w);
pb1.setText("OK");
pb1.clicked.connect(async () => {
	/*CMessageBox.information(null, "This is message box!", "This is a brand new message box");
	const text = await CInputDialog.getText(null, "Input dialog", "Enter text: ");
	if (text !== null)
		console.log("TEXT: " + text);

	const val = await CInputDialog.getInt(null, "Input dialog", "Enter value:", 100, 100, 200, 5);
	if (val !== null)
		console.log("INT: " + val);*/
	const files = await CFileDialog.getOpenFiles("image/*");
	if (files !== null)
	console.log(files);
});
const pb2 = new CPushButton(w);
pb2.setText("Cancel");
pb2.clicked.connect(async () => {
	/*const pd = new CProgressDialog("Copying", false, 0, 100);
	pd.setAutoClose(false);
	pd.exec();
	setInterval(() => {
		if (pd.value() < 100)
			pd.setValue(Math.min(100, pd.value() + 5));
	}, 100);*/
	const clr = new CColor();
	clr.setColor(parent.color());
	const newClr = await CColorDialog.getColor(clr);
	if (newClr !== null)
		parent.setColor(newClr?.toHex());
});
const layout = new CHBoxLayout();
layout.setContentsMargins(3, 3, 3, 3);
layout.setSpacing(6);
layout.addStretch(2);
layout.addWidget(pb1, 0);
layout.addWidget(pb2, 0);
w.setLayout(layout);

const scrollArea = new CScrollArea(parent);
scrollArea.setGeometry(20, 380, 420, 260);

const scrollContent = new ScrollContentWidget();
scrollContent.resize(1000, 700);

scrollArea.setWidget(scrollContent);

const splitter = new CSplitter(COrientation.Horizontal, parent);
splitter.setGeometry(580, 100, 400, 300);

const leftW = new CTextEdit;
leftW.setMinimumSize(150, 300);
leftW.setMaximumSize(350, 300);
const rightW = new BlueWidget(splitter);

const model = new CStringListModel(["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus",
	"Neptune", "Pluto", "Ceres", "Haumea", "Makemake", "Eris", "Ganymede", "Titan", "Callisto", "Io",
	"Moon", "Europa", "Triton" ]);

const listView = new CListView(rightW);

listView.setGeometry(10, 10, 200, 250);
listView.setModel(model);

splitter.addWidget(leftW);
splitter.addWidget(rightW);
splitter.setSizes([100, 94]);

const toolBox = new CToolBox(parent);
toolBox.setGeometry(700, 420, 280, 300);

const generalPage = new CWidget();

const nameLabel = new CLabel(generalPage);
nameLabel.setGeometry(10, 15, 80, 28);
nameLabel.setText("Name:");

const nameEdit = new CLineEdit(generalPage);
nameEdit.setGeometry(90, 15, 160, 28);
nameEdit.setText("Bojan");
nameEdit.setReadOnly();
const dateLabel = new CLabel(generalPage);
dateLabel.setGeometry(10, 45, 80, 30);
dateLabel.setText("Birthday:");
const dateEdit = new CDateEdit(generalPage);
dateEdit.setGeometry(90, 45, 120, 30);
const timeLabel = new CLabel(generalPage);
timeLabel.setGeometry(10, 75, 80, 30);
timeLabel.setText("Time:");
const timeEdit = new CTimeEdit(generalPage);
timeEdit.setDisplayFormat("hh:mm ap");
timeEdit.setGeometry(90, 75, 120, 30);

const dateTimeEdit = new CDateTimeEdit(generalPage);
dateTimeEdit.setGeometry(40, 115, 200, 30);

const networkPage = new CWidget();

const hostLabel = new CLabel(networkPage);
hostLabel.setGeometry(10, 15, 80, 28);
hostLabel.setText("Host:");

const hostEdit = new CLineEdit(networkPage);
hostEdit.setGeometry(90, 15, 160, 28);
hostEdit.setText("localhost");

const portLabel = new CLabel(networkPage);
portLabel.setGeometry(10, 55, 80, 28);
portLabel.setText("Port:");

const portEdit = new CLineEdit(networkPage);
portEdit.setGeometry(90, 55, 160, 28);
portEdit.setText("8080");

const advancedPage = new CWidget();

const checkBox = new CCheckBox(advancedPage);
checkBox.setGeometry(10, 15, 200, 28);
checkBox.setText("Enable advanced mode");

toolBox.addItem(generalPage, "General");
toolBox.addItem(networkPage, "Network");
toolBox.addItem(advancedPage, "Advanced");

toolBox.currentChanged.connect(index => {
	console.log("ToolBox current:", index);
});

const ccw = new ContextMenuWidget();
ccw.setParent(parent);
ccw.setGeometry(30, 650, 100, 30);


const menuBar = new CMenuBar();
mainWindow.setMenuBar(menuBar);

const fileMenu = new CMenu();
fileMenu.addAction(new CAction("New"));
fileMenu.addAction(new CAction("Open"));
fileMenu.addAction(new CAction("Save"));
fileMenu.addSeparator();
fileMenu.addAction(new CAction("Exit"));

const editMenu = new CMenu();
editMenu.addAction(new CAction("Undo"));
editMenu.addAction(new CAction("Redo"));
editMenu.addSeparator();
editMenu.addAction(new CAction("Cut"));
editMenu.addAction(new CAction("Copy"));
editMenu.addAction(new CAction("Paste"));

const viewMenu = new CMenu();

const showGridAction = new CAction("Show grid");
showGridAction.setCheckable(true);
showGridAction.setChecked(true);

viewMenu.addAction(showGridAction);
viewMenu.addSeparator();

const panelsMenu = new CMenu();
panelsMenu.addAction(new CAction("Properties"));
panelsMenu.addAction(new CAction("Inspector"));
panelsMenu.addAction(new CAction("Console"));

viewMenu.addMenu("Panels", panelsMenu);

const toolsMenu = new CMenu();
toolsMenu.addAction(new CAction("Options"));
toolsMenu.addAction(new CAction("Customize"));

const helpMenu = new CMenu();
helpMenu.addAction(new CAction("Documentation"));
helpMenu.addSeparator();
helpMenu.addAction(new CAction("About Clara Toolkit"));

menuBar.addMenu("File", fileMenu);
menuBar.addMenu("Edit", editMenu);
menuBar.addMenu("View", viewMenu);

menuBar.addSeparator();

menuBar.addMenu("Tools", toolsMenu);
menuBar.addMenu("Help", helpMenu);

const statusBar = new CStatusBar();
mainWindow.setStatusBar(statusBar);

const left = new CLabel(null);
left.setText("Ready");
const permanent = new CLabel(null);
permanent.setText("INS");

statusBar.addWidget(left);
statusBar.addPermanentWidget(permanent);

statusBar.showMessage("File saved", 3000);
statusBar.setGeometry(700, 776, 300, 24);

const dragSource = new DragSourceWidget(parent);
dragSource.setGeometry(360, 650, 120, 60);

const dropTarget = new DropTargetWidget(parent);
dropTarget.setGeometry(500, 650, 180, 60);

const dock = new CDockWidget("Properties");
const dockContent = new CWidget();

const dockLabel = new CLabel(dockContent);
dockLabel.setText("Dock widget");
//dockLabel.setGeometry(10, 10, 80, 24);

const floatButton = new CPushButton(dockContent);
floatButton.setText("Float");
floatButton.setGeometry(10, 45, 60, 30);

dock.setWidget(dockContent);

mainWindow.addDockWidget(CDockWidgetArea.Right, dock);
const toolBar1 = new CToolBar();
//toolBar1.setGeometry(0, 0, 500, 120);
toolBar1.setExtent(45);

const newAction = new CAction("New");
toolBar1.addAction(newAction);
const openAction = new CAction("Open");
toolBar1.addAction(openAction);
mainWindow.addToolBar(CToolBarArea.Top, toolBar1);

floatButton.clicked.connect(() => {
	mainWindow.setDockWidgetFloating(dock, !dock.isFloating());

	floatButton.setText(
		dock.isFloating() ? "Dock" : "Float"
	);
});

const dial = new CDial(parent); // oziroma tvoj root widget
dial.setGeometry(420, 250, 120, 120);
dial.setRange(0, 200);
dial.setValue(50);

dial.valueChanged.connect((value) => {
	console.log("Dial value:", value);
});

const tb = new CTextBrowser(parent);
tb.setGeometry(460, 480, 200, 150);
tb.setPlainText("This is CTextBrowser...\nHell yeah!");

app.startUpdates();

setInterval(() => {
	if (pb.value() < 100)
		pb.setValue(pb.value() + 1)
}, 50);
