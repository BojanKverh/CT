import {
    CApplication,
    CWidget,
    CPainter,
    CRect,
    CMouseEvent,
    CMouseButton,
    CPushButton,
    CLabel,
    CAlignment,
    CCheckBox,
    CLineEdit,
    CSlider,
    CProgressBar,
    CGroupBox,
    CSpinBox
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
parent.setGeometry(0, 50, 400, 300);

const but = new CPushButton(parent);
but.setGeometry(50, 50, 100, 30);
but.setText("Click me");

const lab = new CLabel(parent);
lab.setGeometry(250, 50, 130, 40);
lab.setText("Jaz sem CLabel");
lab.setAlignment(CAlignment.Right | CAlignment.Top);

const child = new BlueWidget(parent);
child.setGeometry(250, 200, 150, 100);

const cbox = new CCheckBox(child);
cbox.setText("Check me?");
cbox.setGeometry(10, 10, 100, 30);

const cbox2 = new CCheckBox(parent);
cbox2.setText("Check me again");
cbox2.setGeometry(10, 10, 150, 30);

const le = new CLineEdit(parent);
le.setGeometry(10, 150, 150, 20);
le.setText("Edited text");

const gb = new CGroupBox("Sliders & bars", parent);
gb.setGeometry(5, 185, 210, 110);

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

app.startUpdates();

setInterval(() => {
    if (parent.x() <= 250)
        parent.move(parent.x() + 1, parent.y() + 1);
        pb.setValue(Math.round(parent.x() / 2.5));
}, 10);