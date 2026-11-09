import { CApplication, CLabel, CLineEdit, CPushButton, CVBoxLayout, CWidget } from "canvas-toolkit";

const canvas = document.querySelector<HTMLCanvasElement>("#form");
if (canvas === null) {
    throw new Error("Canvas element not found.");
}

const app = new CApplication(canvas);
const root = new CWidget();
root.setGeometry(0, 0, app.paintDevice().width(), app.paintDevice().height());

const prompt = new CLabel(root);
prompt.setText("Tvoje ime");

const name = new CLineEdit(root);
prompt.setBuddy(name);

const greet = new CPushButton(root);
greet.setText("Pozdravi");

const greeting = new CLabel(root);
greeting.setText("Vpiši ime in klikni Pozdravi.");

greet.clicked.connect(() => {
    const enteredName = name.text().trim();
    greeting.setText(enteredName ? `Živjo, ${enteredName}!` : "Najprej vpiši ime.");
});

const layout = new CVBoxLayout();
layout.setContentsMargins(12, 12, 12, 12);
layout.setSpacing(8);
layout.addWidget(prompt);
layout.addWidget(name);
layout.addWidget(greet);
layout.addWidget(greeting);
layout.addStretch(1);
root.setLayout(layout);

app.startUpdates();
