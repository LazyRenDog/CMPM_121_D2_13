// import { clear } from "node:console";

const app = document.querySelector<HTMLElement>("#app")!;
app.style.textAlign = "center";
app.style.fontFamily = "sans-serif";
document.body.style.background = "#edf9ff";

const canvasWidth = 500;
const canvasHeight = 500; //plan on making this change depending on if in full strip or frame mode
let penSize = 3;
let currentTool: "pen" | "sticker" = "pen";
let selectedSticker = "😂";

const title = document.createElement("h1");
title.textContent = "Comic Strip Generator";

const message = document.createElement("p");
message.textContent = "Draw on the canvas to start your comic";

const thickPenButton = document.createElement("button");
thickPenButton.textContent = "Thick Pen";

const thinPenButton = document.createElement("button");
thinPenButton.textContent = "Thin Pen";

const laughStickerButton = document.createElement("button");
laughStickerButton.textContent = "😂";

const cryStickerButton = document.createElement("button");
cryStickerButton.textContent = "😭";

const basketballStickerButton = document.createElement("button");
basketballStickerButton.textContent = "🏀";

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";

const clearButton = document.createElement("button");
clearButton.textContent = "Clear Comic";

const canvas = document.createElement("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style.border = "2px solid black";
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
  penWidth: number;

  constructor(startPoint: Point, width: number) {
    this.points = [startPoint];
    this.penWidth = width;
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
    targetCtx.lineWidth = this.penWidth;
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

class StickerCommand implements DrawableCommand {
  x: number;
  y: number;
  sticker: string;

  constructor(x: number, y: number, sticker: string) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
  }

  display(targetCtx: CanvasRenderingContext2D): void {
    targetCtx.save();
    targetCtx.font = "40px sans-serif";
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillText(this.sticker, this.x, this.y);
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

function renderScene(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of drawingState.commands) {
    cmd.display(ctx);
  }
  if (activeStroke) {
    activeStroke.display(ctx);
  }

  undoButton.disabled = drawingState.commands.length === 0;
  redoButton.disabled = drawingState.redoCommands.length === 0;
  clearButton.disabled = drawingState.commands.length === 0;
}

function notifyChange(): void {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

canvas.addEventListener("drawing-changed", renderScene);

canvas.addEventListener("mousedown", (mouse) => {
  cursorState.x = mouse.offsetX;
  cursorState.y = mouse.offsetY;

  if (currentTool === "sticker") {
    const sticker = new StickerCommand(
      cursorState.x,
      cursorState.y,
      selectedSticker,
    );

    drawingState.commands.push(sticker);
    drawingState.redoCommands.length = 0;

    message.textContent = `Commited actions: ${drawingState.commands.length}`;

    notifyChange();
    return;
  }

  cursorState.isDown = true;
  activeStroke = new StrokeCommand(
    { x: cursorState.x, y: cursorState.y },
    penSize,
  );
  notifyChange();
});

canvas.addEventListener("mousemove", (mouse) => {
  if (cursorState.isDown && activeStroke) {
    cursorState.x = mouse.offsetX;
    cursorState.y = mouse.offsetY;
    activeStroke.addPoint({
      x: cursorState.x,
      y: cursorState.y,
    });
    notifyChange();
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
  notifyChange();
}

canvas.addEventListener("mouseout", finishStroke);
canvas.addEventListener("mouseup", finishStroke);

//undo
undoButton.addEventListener("click", () => {
  if (drawingState.commands.length === 0) return;
  const lastCommand = drawingState.commands.pop();
  if (lastCommand) {
    drawingState.redoCommands.push(lastCommand);
  }
  notifyChange();
  message.textContent = `Commited actions: ${drawingState.commands.length}`;
});

//redo
redoButton.addEventListener("click", () => {
  if (drawingState.redoCommands.length === 0) return;
  const undoneCommand = drawingState.redoCommands.pop();
  if (undoneCommand) {
    drawingState.commands.push(undoneCommand);
  }

  notifyChange();
  message.textContent = `Commited actions: ${drawingState.commands.length}`;
});

clearButton.addEventListener("click", () => {
  if (drawingState.commands.length === 0) return;
  drawingState.commands.length = 0;
  drawingState.redoCommands.length = 0;
  notifyChange();
  message.textContent = "Document cleared";
});

thinPenButton.addEventListener("click", () => {
  penSize = 3;
  currentTool = "pen";
});

thickPenButton.addEventListener("click", () => {
  penSize = 10;
  currentTool = "pen";
});

laughStickerButton.addEventListener("click", () => {
  currentTool = "sticker";
  selectedSticker = "😂";
});

cryStickerButton.addEventListener("click", () => {
  currentTool = "sticker";
  selectedSticker = "😭";
});

basketballStickerButton.addEventListener("click", () => {
  currentTool = "sticker";
  selectedSticker = "🏀";
});

const toolContainer = document.createElement("div");
toolContainer.style.display = "flex";
toolContainer.style.flexDirection = "row";
toolContainer.style.gap = "16px";
toolContainer.style.marginBottom = "16px";
toolContainer.style.justifyContent = "center";
toolContainer.style.alignItems = "center";
toolContainer.append(
  thinPenButton,
  thickPenButton,
  laughStickerButton,
  cryStickerButton,
  basketballStickerButton,
);

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
buttonContainer.append(
  undoButton,
  redoButton,
  clearButton,
);

app.append(title, message, toolContainer, canvasContainer, buttonContainer);
notifyChange();
