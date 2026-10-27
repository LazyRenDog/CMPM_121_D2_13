const app = document.querySelector<HTMLElement>("#app")!;
app.style.textAlign = "center";
document.body.style.background = "#edf9ff";

const canvasWidth = 500;
const canvasHeight = 500; //plan on making this change depending on if in full strip or frame mode

const title = document.createElement("h1");
title.textContent = "Comic Strip Generator";

const message = document.createElement("p");
message.textContent = "Your project starts here.";

const undoButton = document.createElement("button");
undoButton.textContent = "undo";

const redoButton = document.createElement("button");
redoButton.textContent = "redo";

const canvas = document.createElement("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style = "border: 2px solid black";

const ctx = canvas.getContext("2d")!;

interface CursorState {
  x: number;
  y: number;
  isDown: boolean;
}

interface point {
  x: number;
  y: number;
}

interface stroke {
  points: point[];
}

interface DrawingState {
  strokes: stroke[];
  redoStrokes: stroke[];
}

const drawingState: DrawingState = {
  strokes: [],
  redoStrokes: [],
};

const cursorState: CursorState = {
  x: 0,
  y: 0,
  isDown: false,
};

let activeStroke: stroke | null;

canvas.addEventListener("mousedown", (mouse) => {
  drawingState.redoStrokes.splice(0, drawingState.redoStrokes.length);
  cursorState.x = mouse.offsetX;
  cursorState.y = mouse.offsetY;
  activeStroke = {
    points: [],
  };
  drawingState.strokes.push(activeStroke);
  activeStroke.points.push({ x: cursorState.x, y: cursorState.y });
  cursorState.isDown = true;
});

canvas.addEventListener("mousemove", (mouse) => {
  if (cursorState.isDown) {
    ctx.beginPath();
    ctx.moveTo(cursorState.x, cursorState.y);
    ctx.lineTo(mouse.offsetX, mouse.offsetY);
    ctx.stroke();
    cursorState.x = mouse.offsetX;
    cursorState.y = mouse.offsetY;
    activeStroke!.points.push({
      x: cursorState.x,
      y: cursorState.y,
    });
  }
});

canvas.addEventListener("mouseout", () => {
  cursorState.isDown = false;
  activeStroke = null;
});
canvas.addEventListener("mouseup", () => {
  cursorState.isDown = false;
  activeStroke = null;
});

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

app.append(title, canvasContainer, buttonContainer);
