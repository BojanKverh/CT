import {CApplication, CWidget, CPainter, CRect, CMouseEvent, CMouseButton, CPushButton, CLabel, CAlignment,
    CCheckBox, CLineEdit, CSlider, CProgressBar, CGroupBox, CSpinBox, CScrollBar, COrientation, CPixmap,
    CRadioButton, CButtonGroup, CHBoxLayout, CScrollArea, CMenu, CAction, CMenuBar, CDialog,
	CDialogButtonBox, CStandardButton, CSelectionMode, CListWidget, CListWidgetItem, CStackedWidget,
	CTabWidget, CFrame, CFrameShape, CFrameShadow, CComboBox, CFormLayout, CToolButton, CToolButtonStyle,
	CToolBar, CStatusBar, CMainWindow, CFont
} from "../../src/index.js";

class RedWidget extends CWidget {
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle("red");
        painter.fillRect(
            new CRect(0, 0, this.width(), this.height())
        );
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
		painter.setFont(new CFont("sans-serif", 14));

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

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (canvas === null)
    throw new Error("Canvas element not found.");

const app = new CApplication(canvas);

const parent = new RedWidget();
parent.setGeometry(200, 0, 640, 480);

const but = new CPushButton(parent);
but.setGeometry(50, 50, 100, 30);
but.setText("Click me");

but.clicked.connect(async () => {
		const dlg = new CDialog;
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
		const icon = await CPixmap.fromUrl("/icons/save.png");
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
		dlg.exec();
	});

const but2 = new CPushButton(parent);
but2.setGeometry(500, 50, 100, 30);
but2.setText("Open dialog");
but2.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 500, 300);

	const bb = new CDialogButtonBox(CStandardButton.Ok | CStandardButton.Cancel, dlg);
	bb.setGeometry(0, 260, 490, 30);

	bb.accepted.connect(() => {
			dlg.accept();
		});

	bb.rejected.connect(() => {
			dlg.reject();
		});

	const gb = new CGroupBox("Settings", dlg);
	gb.setGeometry(6, 6, 488, 230);
	const fl = new CFormLayout();
	gb.setLayout(fl);
	const leName = new CLineEdit();
	fl.addRow("Name", leName);
	const leSurname = new CLineEdit();
	fl.addRow("Last Name", leSurname);
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
const pb2 = new CPushButton(w);
pb2.setText("Cancel");
const layout = new CHBoxLayout();
layout.setContentsMargins(3, 3, 3, 3);
layout.setSpacing(6);
layout.addStretch(2);
layout.addWidget(pb1, 0);
layout.addWidget(pb2, 0);
w.setLayout(layout);

const scrollArea = new CScrollArea();
scrollArea.setGeometry(20, 530, 420, 260);

const scrollContent = new ScrollContentWidget();
scrollContent.resize(1000, 700);

scrollArea.setWidget(scrollContent);

const menuBar = new CMenuBar();
menuBar.setGeometry(0, 0, canvas.width, 28);

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

const left = new CLabel(null);
left.setText("Ready");
const permanent = new CLabel(null);
permanent.setText("INS");

statusBar.addWidget(left);
statusBar.addPermanentWidget(permanent);

statusBar.showMessage("File saved", 3000);
statusBar.setGeometry(700, 776, 300, 24);

app.startUpdates();

setInterval(() => {
    if (parent.x() <= 250)
        parent.move(parent.x() + 1, parent.y() + 1);
        pb.setValue(Math.round(parent.x() / 2.5));
}, 10);