const app = document.querySelector<HTMLElement>("#app")!;
app.style.textAlign = "center";
document.body.style.background = "#edf9ff";

const title = document.createElement("h1");
title.textContent = "Comic Strip Generator";

const message = document.createElement("p");
message.textContent = "Your project starts here.";

const undoButton = document.createElement("button");
undoButton.textContent = "undo";

const redoButton = document.createElement("button");
redoButton.textContent = "redo";

let canvasWidth = 500;
let canvasHeight = 500;

const canvas = document.createElement("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style = "border: 2px solid black";

app.append(title);

const canvasContainer = document.createElement("div");
canvasContainer.style.display = "flex";
canvasContainer.style.flexDirection = "row";
canvasContainer.style.gap = "16px";
canvasContainer.style.justifyContent = "center";
canvasContainer.style.alignItems = "center";
canvasContainer.appendChild(canvas);

const buttonContainer = document.createElement("div");
buttonContainer.style.display = "flex";
buttonContainer.style.flexDirection = "row";
buttonContainer.style.gap = "50px";
buttonContainer.style.marginTop = "16px";
buttonContainer.style.justifyContent = "center";
buttonContainer.style.alignItems = "center";
buttonContainer.appendChild(undoButton);
buttonContainer.appendChild(redoButton);

app.append(canvasContainer, buttonContainer);
