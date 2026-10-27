const app = document.querySelector<HTMLElement>("#app")!;
app.style.textAlign = "center";
document.body.style.background = "#edf9ff";

const title = document.createElement("h1");
title.textContent = "Comic Strip Generator";

const message = document.createElement("p");
message.textContent = "Your project starts here.";

let canvasWidth = 500;
let canvasHeight = 500;

const canvas = document.createElement("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style = "border: 2px solid black";

app.append(title);

const container = document.createElement("div");
container.style.display = "flex";
container.style.flexDirection = "row";
container.style.gap = "16px";
container.appendChild(canvas);
app.append(container);
