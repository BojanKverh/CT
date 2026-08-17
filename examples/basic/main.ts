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
    CSlider
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
parent.setGeometry(100, 100, 400, 300);

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
le.setGeometry(10, 200, 150, 20);
le.setText("Edited text");

const sl = new CSlider(parent)
sl.setGeometry(10, 250, 200, 16);

app.startUpdates();

setInterval(() => {
    if (parent.x() < 250)
        parent.move(parent.x() + 1, parent.y() + 1);
}, 10);