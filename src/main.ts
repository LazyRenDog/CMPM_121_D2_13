const app = document.querySelector<HTMLElement>("#app")!;
app.style.textAlign = "center";
document.body.style.background = "#edf9ff";

const canvasWidth = 500;
const canvasHeight = 500; //plan on making this change depending on if in full strip or frame mode

const title = document.createElement("h1");
title.textContent = "Comic Strip Generator";

const message = document.createElement("p");
message.textContent = "Draw on the canvas to start your comic";

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";

const canvas = document.createElement("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style = "border: 2px solid black";
canvas.style.background = "#ffffff";
canvas.style.cursor = "crosshair";

const ctx = canvas.getContext("2d")!;

interface Point {
  x: number;
  y: number;
}

interface DrawableCommand {
  display(targetCtx: CanvasRenderingContext2D): void;
}

class StrokeCommand implements DrawableCommand {
  points: Point[];

  constructor(startPoint: Point) {
    this.points = [startPoint];
  }

  addPoint(pt: Point): void {
    this.points.push(pt);
  }

  display(targetCtx: CanvasRenderingContext2D): void {
    if (this.points.length === 0) return;
    targetCtx.save();
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
    targetCtx.strokeStyle = "#111111";
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      targetCtx.lineTo(this.points[i].x, this.points[i].y);
    }
    if (this.points.length === 1) {
      targetCtx.lineTo(this.points[0].x + 0.1, this.points[0].y + 0.1);
    }

    targetCtx.stroke();
    targetCtx.restore();
  }
}

interface CursorState {
  x: number;
  y: number;
  isDown: boolean;
}

interface DrawingState {
  commands: DrawableCommand[];
  redoCommands: DrawableCommand[];
}

const drawingState: DrawingState = {
  commands: [],
  redoCommands: [],
};

const cursorState: CursorState = {
  x: 0,
  y: 0,
  isDown: false,
};

let activeStroke: StrokeCommand | null = null;

canvas.addEventListener("mousedown", (mouse) => {
  cursorState.x = mouse.offsetX;
  cursorState.y = mouse.offsetY;
  cursorState.isDown = true;
  activeStroke = new StrokeCommand({
    x: cursorState.x,
    y: cursorState.y,
  });
});

canvas.addEventListener("mousemove", (mouse) => {
  if (cursorState.isDown && activeStroke) {
    ctx.beginPath();
    ctx.moveTo(cursorState.x, cursorState.y);
    ctx.lineTo(mouse.offsetX, mouse.offsetY);
    ctx.stroke();
    cursorState.x = mouse.offsetX;
    cursorState.y = mouse.offsetY;
    activeStroke.addPoint({
      x: cursorState.x,
      y: cursorState.y,
    });
  }
});

function finishStroke(): void {
  if (cursorState.isDown && activeStroke) {
    drawingState.commands.push(activeStroke);
    drawingState.redoCommands.length = 0;
    message.textContent = `Commited actions: ${drawingState.commands.length}`;
  }
  cursorState.isDown = false;
  activeStroke = null;
}

canvas.addEventListener("mouseout", finishStroke);
canvas.addEventListener("mouseup", finishStroke);

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
buttonContainer.style.gap = "16px";
buttonContainer.style.marginTop = "16px";
buttonContainer.style.justifyContent = "center";
buttonContainer.style.alignItems = "center";
buttonContainer.appendChild(undoButton);
buttonContainer.appendChild(redoButton);

app.append(title, message, canvasContainer, buttonContainer);
