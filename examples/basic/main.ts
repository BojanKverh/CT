import {
    CApplication,
    CWidget,
    CPainter,
    CRect
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
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle("blue");
        painter.fillRect(
            new CRect(0, 0, this.width(), this.height())
        );
    }
}

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (canvas === null)
    throw new Error("Canvas element not found.");

const app = new CApplication(canvas);

const parent = new RedWidget();
parent.setGeometry(100, 100, 400, 300);

const child = new BlueWidget(parent);
child.setGeometry(50, 50, 150, 100);

app.startUpdates();

setInterval(() => {
    if (parent.x() < 250)
        parent.move(parent.x() + 1, parent.y() + 1);
}, 10);