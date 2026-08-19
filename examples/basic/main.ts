import {CApplication, CWidget, CPainter, CRect, CMouseEvent, CMouseButton, CPushButton, CLabel, CAlignment,
    CCheckBox, CLineEdit, CSlider, CProgressBar, CGroupBox, CSpinBox, CScrollBar, COrientation, CPixmap,
    CRadioButton, CButtonGroup, CHBoxLayout, CScrollArea
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

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (canvas === null)
    throw new Error("Canvas element not found.");

const app = new CApplication(canvas);

const parent = new RedWidget();
parent.setGeometry(200, 0, 640, 480);

const but = new CPushButton(parent);
but.setGeometry(50, 50, 100, 30);
but.setText("Click me");

const lab = new CLabel(parent);
lab.setGeometry(250, 50, 130, 40);
lab.setText("Jaz sem CLabel");
lab.setAlignment(CAlignment.Right | CAlignment.Top);

const lab2 = new CLabel(parent);
lab2.setGeometry(250, 100, 60, 60);
lab2.setPixmap(await CPixmap.fromUrl("https://lh3.googleusercontent.com/a/ACg8ocLmgw58KyM8NCkoYwv98Z1rhTAHr5doS1DcOM8s60xFXhZIN3Qb=s96-c"));

const child = new BlueWidget(parent);
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

app.startUpdates();

setInterval(() => {
    if (parent.x() <= 250)
        parent.move(parent.x() + 1, parent.y() + 1);
        pb.setValue(Math.round(parent.x() / 2.5));
}, 10);