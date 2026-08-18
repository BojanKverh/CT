import {CApplication, CWidget, CPainter, CRect, CMouseEvent, CMouseButton, CPushButton, CLabel, CAlignment,
    CCheckBox, CLineEdit, CSlider, CProgressBar, CGroupBox, CSpinBox, CScrollBar, COrientation, CPixmap
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

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (canvas === null)
    throw new Error("Canvas element not found.");

const app = new CApplication(canvas);

const parent = new RedWidget();
parent.setGeometry(0, 0, 500, 350);

const but = new CPushButton(parent);
but.setGeometry(50, 50, 100, 30);
but.setText("Click me");

const lab = new CLabel(parent);
lab.setGeometry(250, 50, 130, 40);
lab.setText("Jaz sem CLabel");
lab.setAlignment(CAlignment.Right | CAlignment.Top);

const lab2 = new CLabel(parent);
lab2.setGeometry(250, 100, 120, 120);
lab2.setPixmap(await CPixmap.fromUrl("https://lh3.googleusercontent.com/a/ACg8ocLmgw58KyM8NCkoYwv98Z1rhTAHr5doS1DcOM8s60xFXhZIN3Qb=s96-c"));

const child = new BlueWidget(parent);
child.setGeometry(250, 250, 150, 100);

const cbox = new CCheckBox(child);
cbox.setText("Check me?");
cbox.setGeometry(10, 10, 100, 30);

const cbox2 = new CCheckBox(parent);
cbox2.setText("Check me again");
cbox2.setGeometry(10, 10, 150, 30);

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

app.startUpdates();

setInterval(() => {
    if (parent.x() <= 250)
        parent.move(parent.x() + 1, parent.y() + 1);
        pb.setValue(Math.round(parent.x() / 2.5));
}, 10);