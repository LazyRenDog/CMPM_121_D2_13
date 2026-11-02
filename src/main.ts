const app = document.querySelector<HTMLElement>("#app")!;
app.style.textAlign = "center";
app.style.fontFamily = "sans-serif";
document.body.style.background = "#edf9ff";

interface ComicStripTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  rows: number;
  cols: number;
}

interface PenPreset {
  id: string;
  label: string;
  width: number;
}

interface StickerTool {
  id: string;
  label: string;
  sticker: string;
}

interface ColorSwatch {
  name: string;
  hex: string;
}

interface ExportTypeOption {
  ext: string;
  mime: string;
  label: string;
}

interface ExportResolutionOption {
  scale: number;
  label: string;
}

interface WritableFileStreamLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileHandleLike {
  name: string;
  createWritable(): Promise<WritableFileStreamLike>;
}

interface SavePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileHandleLike>;
}

const comicStripTemplates: ComicStripTemplate[] = [
  {
    id: "single-500",
    name: "Single Frame (500×500)",
    width: 500,
    height: 500,
    rows: 1,
    cols: 1,
  },
  {
    id: "strip-3",
    name: "3-Panel Strip (750×280)",
    width: 750,
    height: 280,
    rows: 1,
    cols: 3,
  },
  {
    id: "grid-4",
    name: "4-Panel Grid (520×520)",
    width: 520,
    height: 520,
    rows: 2,
    cols: 2,
  },
  {
    id: "vertical-3",
    name: "Vertical Strip (360×680)",
    width: 360,
    height: 680,
    rows: 3,
    cols: 1,
  },
  {
    id: "wide-2",
    name: "Dual Widescreen (800×340)",
    width: 800,
    height: 340,
    rows: 1,
    cols: 2,
  },
];

const penPresets: PenPreset[] = [
  { id: "thin", label: "Thin Pen (3px)", width: 3 },
  { id: "thick", label: "Thick Pen (10px)", width: 10 },
];

const stickerTools: StickerTool[] = [
  { id: "laugh", label: "😂", sticker: "😂" },
  { id: "cry", label: "😭", sticker: "😭" },
  { id: "basketball", label: "🏀", sticker: "🏀" },
];

const colorPalette: ColorSwatch[] = [
  { name: "Ink Black", hex: "#111111" },
  { name: "Hero Red", hex: "#e63946" },
  { name: "Comic Blue", hex: "#1d3557" },
  { name: "Action Gold", hex: "#ffb703" },
  { name: "Emerald Green", hex: "#2a9d8f" },
];

const exportTypes: ExportTypeOption[] = [
  { ext: "png", mime: "image/png", label: "PNG Image (.png)" },
  { ext: "jpg", mime: "image/jpeg", label: "JPEG Image (.jpg)" },
  { ext: "webp", mime: "image/webp", label: "WebP Image (.webp)" },
];

const exportResolutions: ExportResolutionOption[] = [
  { scale: 1, label: "1x Standard" },
  { scale: 2, label: "2x High-Res (Recommended)" },
  { scale: 3, label: "3x Ultra HD" },
  { scale: 4, label: "4x Print Quality" },
];

let customStripCounter = 1;
let customStickerCounter = 1;
let penSize = penPresets[0].width;
let selectedColor = colorPalette[0].hex;
let currentTool: "pen" | "sticker" = "pen";
let selectedSticker = stickerTools[0].sticker;

const title = document.createElement("h1");
title.textContent = "Comic Strip Generator";

const message = document.createElement("p");
message.textContent = "Draw or drag stickers onto the comic canvas";

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";

const clearButton = document.createElement("button");
clearButton.textContent = "Clear Comic";

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
  color: string;

  constructor(startPoint: Point, width: number, color: string) {
    this.points = [startPoint];
    this.penWidth = width;
    this.color = color;
  }

  addPoint(pt: Point): void {
    this.points.push(pt);
  }

  display(targetCtx: CanvasRenderingContext2D): void {
    if (this.points.length === 0) return;
    targetCtx.save();
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
    targetCtx.strokeStyle = this.color;
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

  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
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
  strip: ComicStripTemplate;
  commands: DrawableCommand[];
  redoCommands: DrawableCommand[];
}

const drawingState: DrawingState = {
  strip: comicStripTemplates[0],
  commands: [],
  redoCommands: [],
};

const cursorState: CursorState = {
  x: 0,
  y: 0,
  isDown: false,
};

const canvas = document.createElement("canvas");
canvas.width = drawingState.strip.width;
canvas.height = drawingState.strip.height;
canvas.style.border = "2px solid black";
canvas.style.background = "#ffffff";
canvas.style.cursor = "crosshair";

const ctx = canvas.getContext("2d")!;

const leftStripSidebar = document.createElement("div");
leftStripSidebar.style.display = "flex";
leftStripSidebar.style.flexDirection = "column";
leftStripSidebar.style.gap = "10px";
leftStripSidebar.style.padding = "12px";
leftStripSidebar.style.width = "230px";
leftStripSidebar.style.background = "#ffffff";
leftStripSidebar.style.border = "2px solid #1d3557";
leftStripSidebar.style.borderRadius = "8px";
leftStripSidebar.style.textAlign = "left";

const sidebarHeader = document.createElement("h3");
sidebarHeader.textContent = "Comic Strip Sizes";
sidebarHeader.style.margin = "0";
sidebarHeader.style.fontSize = "16px";

const stripListContainer = document.createElement("div");
stripListContainer.style.display = "flex";
stripListContainer.style.flexDirection = "column";
stripListContainer.style.gap = "6px";

const customStripSection = document.createElement("div");
customStripSection.style.display = "flex";
customStripSection.style.flexDirection = "column";
customStripSection.style.gap = "6px";
customStripSection.style.borderTop = "1px solid #cccccc";
customStripSection.style.paddingTop = "10px";

const customStripTitle = document.createElement("strong");
customStripTitle.textContent = "Custom Comic Strip";
customStripTitle.style.fontSize = "14px";

const customNameInput = document.createElement("input");
customNameInput.type = "text";
customNameInput.placeholder = "Strip Name (e.g. Manga Page)";
customNameInput.style.padding = "4px";

const sizeRow = document.createElement("div");
sizeRow.style.display = "flex";
sizeRow.style.gap = "6px";

const customWidthInput = document.createElement("input");
customWidthInput.type = "number";
customWidthInput.min = "200";
customWidthInput.max = "1200";
customWidthInput.value = "600";
customWidthInput.title = "Width (px)";
customWidthInput.style.width = "50%";
customWidthInput.style.padding = "4px";

const customHeightInput = document.createElement("input");
customHeightInput.type = "number";
customHeightInput.min = "200";
customHeightInput.max = "1200";
customHeightInput.value = "400";
customHeightInput.title = "Height (px)";
customHeightInput.style.width = "50%";
customHeightInput.style.padding = "4px";

sizeRow.append(customWidthInput, customHeightInput);

const gridRow = document.createElement("div");
gridRow.style.display = "flex";
gridRow.style.gap = "6px";

const customRowsInput = document.createElement("input");
customRowsInput.type = "number";
customRowsInput.min = "1";
customRowsInput.max = "6";
customRowsInput.value = "2";
customRowsInput.title = "Panel Rows";
customRowsInput.style.width = "50%";
customRowsInput.style.padding = "4px";

const customColsInput = document.createElement("input");
customColsInput.type = "number";
customColsInput.min = "1";
customColsInput.max = "6";
customColsInput.value = "3";
customColsInput.title = "Panel Columns";
customColsInput.style.width = "50%";
customColsInput.style.padding = "4px";

gridRow.append(customRowsInput, customColsInput);

const createCustomStripButton = document.createElement("button");
createCustomStripButton.textContent = "+ Add Custom Strip";
createCustomStripButton.style.padding = "6px";
createCustomStripButton.style.cursor = "pointer";
createCustomStripButton.style.fontWeight = "bold";

customStripSection.append(
  customStripTitle,
  customNameInput,
  sizeRow,
  gridRow,
  createCustomStripButton,
);

leftStripSidebar.append(sidebarHeader, stripListContainer, customStripSection);

// Export Dropdown Wrapper & Menu
const exportDropdownWrapper = document.createElement("div");
exportDropdownWrapper.style.position = "relative";
exportDropdownWrapper.style.display = "inline-block";

const exportMenuToggleButton = document.createElement("button");
exportMenuToggleButton.textContent = "Export Comic ▾";
exportMenuToggleButton.style.fontWeight = "bold";
exportMenuToggleButton.style.padding = "6px 12px";
exportMenuToggleButton.style.cursor = "pointer";

const exportDropdownMenu = document.createElement("div");
exportDropdownMenu.style.display = "none";
exportDropdownMenu.style.position = "absolute";
exportDropdownMenu.style.bottom = "110%";
exportDropdownMenu.style.left = "0";
exportDropdownMenu.style.minWidth = "275px";
exportDropdownMenu.style.padding = "12px";
exportDropdownMenu.style.background = "#ffffff";
exportDropdownMenu.style.border = "2px solid #1d3557";
exportDropdownMenu.style.borderRadius = "8px";
exportDropdownMenu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
exportDropdownMenu.style.textAlign = "left";
exportDropdownMenu.style.zIndex = "10";

const exportTypeLabel = document.createElement("label");
exportTypeLabel.textContent = "1. Export Type:";
exportTypeLabel.style.display = "block";
exportTypeLabel.style.fontSize = "13px";
exportTypeLabel.style.fontWeight = "bold";
exportTypeLabel.style.marginBottom = "4px";

const exportTypeSelect = document.createElement("select");
exportTypeSelect.style.width = "100%";
exportTypeSelect.style.padding = "4px";
exportTypeSelect.style.marginBottom = "10px";
for (const fmt of exportTypes) {
  const opt = document.createElement("option");
  opt.value = fmt.ext;
  opt.textContent = fmt.label;
  exportTypeSelect.appendChild(opt);
}

const exportResolutionLabel = document.createElement("label");
exportResolutionLabel.textContent = "2. Resolution:";
exportResolutionLabel.style.display = "block";
exportResolutionLabel.style.fontSize = "13px";
exportResolutionLabel.style.fontWeight = "bold";
exportResolutionLabel.style.marginBottom = "4px";

const exportResolutionSelect = document.createElement("select");
exportResolutionSelect.style.width = "100%";
exportResolutionSelect.style.padding = "4px";
exportResolutionSelect.style.marginBottom = "10px";

function updateResolutionOptions(): void {
  const currentVal = exportResolutionSelect.value || "2";
  exportResolutionSelect.replaceChildren();
  for (const res of exportResolutions) {
    const opt = document.createElement("option");
    opt.value = String(res.scale);
    const outW = drawingState.strip.width * res.scale;
    const outH = drawingState.strip.height * res.scale;
    opt.textContent = `${res.label} (${outW}×${outH} px)`;
    exportResolutionSelect.appendChild(opt);
  }
  exportResolutionSelect.value = currentVal;
}

const exportLocationLabel = document.createElement("label");
exportLocationLabel.textContent = "3. Location on PC:";
exportLocationLabel.style.display = "block";
exportLocationLabel.style.fontSize = "13px";
exportLocationLabel.style.fontWeight = "bold";
exportLocationLabel.style.marginBottom = "4px";

const exportLocationSelect = document.createElement("select");
exportLocationSelect.style.width = "100%";
exportLocationSelect.style.padding = "4px";
exportLocationSelect.style.marginBottom = "8px";

const pickerModeOption = document.createElement("option");
pickerModeOption.value = "picker";
pickerModeOption.textContent = "Browse PC Folder (Save As Dialog)";

const downloadsModeOption = document.createElement("option");
downloadsModeOption.value = "downloads";
downloadsModeOption.textContent = "Default PC Downloads Folder";

exportLocationSelect.append(pickerModeOption, downloadsModeOption);

const exportFileNameInput = document.createElement("input");
exportFileNameInput.type = "text";
exportFileNameInput.value = "my-comic-strip";
exportFileNameInput.placeholder = "File name";
exportFileNameInput.style.width = "100%";
exportFileNameInput.style.boxSizing = "border-box";
exportFileNameInput.style.padding = "4px";
exportFileNameInput.style.marginBottom = "10px";

const saveToPcButton = document.createElement("button");
saveToPcButton.textContent = "Export & Save to PC";
saveToPcButton.style.width = "100%";
saveToPcButton.style.padding = "8px";
saveToPcButton.style.cursor = "pointer";
saveToPcButton.style.fontWeight = "bold";
saveToPcButton.style.background = "#1d3557";
saveToPcButton.style.color = "#ffffff";
saveToPcButton.style.border = "none";
saveToPcButton.style.borderRadius = "4px";

exportDropdownMenu.append(
  exportTypeLabel,
  exportTypeSelect,
  exportResolutionLabel,
  exportResolutionSelect,
  exportLocationLabel,
  exportLocationSelect,
  exportFileNameInput,
  saveToPcButton,
);

exportDropdownWrapper.append(exportMenuToggleButton, exportDropdownMenu);

exportMenuToggleButton.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = exportDropdownMenu.style.display === "block";
  if (!isOpen) {
    updateResolutionOptions();
  }
  exportDropdownMenu.style.display = isOpen ? "none" : "block";
});

exportDropdownMenu.addEventListener("click", (e) => {
  e.stopPropagation();
});

document.addEventListener("click", () => {
  exportDropdownMenu.style.display = "none";
});

const toolContainer = document.createElement("div");
toolContainer.style.display = "flex";
toolContainer.style.flexDirection = "row";
toolContainer.style.flexWrap = "wrap";
toolContainer.style.gap = "10px";
toolContainer.style.marginBottom = "16px";
toolContainer.style.justifyContent = "center";
toolContainer.style.alignItems = "center";

let activeCommand: StrokeCommand | StickerCommand | null = null;

function renderToolButtons(): void {
  toolContainer.replaceChildren();

  for (const pen of penPresets) {
    const btn = document.createElement("button");
    const isActive = currentTool === "pen" && penSize === pen.width;
    btn.textContent = pen.label;
    btn.style.fontWeight = isActive ? "bold" : "normal";
    btn.style.outline = isActive ? "2px solid #1d3557" : "none";
    btn.addEventListener("click", () => {
      currentTool = "pen";
      penSize = pen.width;
      renderToolButtons();
      message.textContent = `Selected tool: ${pen.label}`;
    });
    toolContainer.appendChild(btn);
  }

  for (const swatch of colorPalette) {
    const swatchBtn = document.createElement("button");
    swatchBtn.title = swatch.name;
    swatchBtn.style.width = "26px";
    swatchBtn.style.height = "26px";
    swatchBtn.style.borderRadius = "50%";
    swatchBtn.style.background = swatch.hex;
    swatchBtn.style.cursor = "pointer";
    swatchBtn.style.border = selectedColor === swatch.hex
      ? "3px solid #000000"
      : "1px solid #888888";
    swatchBtn.addEventListener("click", () => {
      selectedColor = swatch.hex;
      currentTool = "pen";
      renderToolButtons();
      message.textContent = `Selected ink color: ${swatch.name}`;
    });
    toolContainer.appendChild(swatchBtn);
  }

  for (const item of stickerTools) {
    const btn = document.createElement("button");
    const isActive = currentTool === "sticker" &&
      selectedSticker === item.sticker;
    btn.textContent = item.label;
    btn.style.fontWeight = isActive ? "bold" : "normal";
    btn.style.outline = isActive ? "2px solid #e63946" : "none";
    btn.addEventListener("click", () => {
      currentTool = "sticker";
      selectedSticker = item.sticker;
      renderToolButtons();
      message.textContent = `Selected sticker: ${item.label}`;
    });
    toolContainer.appendChild(btn);
  }

  const addCustomStickerBtn = document.createElement("button");
  addCustomStickerBtn.textContent = "+ Custom Sticker";
  addCustomStickerBtn.addEventListener("click", () => {
    const input = prompt("Enter an emoji or text for your custom sticker:");
    if (input === null) return;
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      message.textContent = "Empty sticker ignored.";
      return;
    }
    const newSticker: StickerTool = {
      id: `custom-sticker-${customStickerCounter++}`,
      label: trimmed,
      sticker: trimmed,
    };
    stickerTools.push(newSticker);
    currentTool = "sticker";
    selectedSticker = newSticker.sticker;
    renderToolButtons();
    message.textContent = `Created custom sticker: ${newSticker.label}`;
  });
  toolContainer.appendChild(addCustomStickerBtn);
}

function drawComicStripFrames(
  targetCtx: CanvasRenderingContext2D,
  strip: ComicStripTemplate,
): void {
  targetCtx.save();
  targetCtx.fillStyle = "#ffffff";
  targetCtx.fillRect(0, 0, strip.width, strip.height);

  const gutter = 12;
  const totalGutterW = gutter * (strip.cols + 1);
  const totalGutterH = gutter * (strip.rows + 1);
  const panelW = (strip.width - totalGutterW) / strip.cols;
  const panelH = (strip.height - totalGutterH) / strip.rows;

  for (let r = 0; r < strip.rows; r++) {
    for (let c = 0; c < strip.cols; c++) {
      const px = gutter + c * (panelW + gutter);
      const py = gutter + r * (panelH + gutter);

      targetCtx.fillStyle = "#f8fdff";
      targetCtx.fillRect(px, py, panelW, panelH);

      targetCtx.lineWidth = 3;
      targetCtx.strokeStyle = "#111111";
      targetCtx.strokeRect(px, py, panelW, panelH);
    }
  }
  targetCtx.restore();
}

function renderCommittedDocument(targetCtx: CanvasRenderingContext2D): void {
  drawComicStripFrames(targetCtx, drawingState.strip);
  for (const cmd of drawingState.commands) {
    cmd.display(targetCtx);
  }
}

function renderCommittedComicToBlob(
  scaleFactor: number,
  mimeType: string,
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = drawingState.strip.width * scaleFactor;
    offscreen.height = drawingState.strip.height * scaleFactor;

    const exportCtx = offscreen.getContext("2d")!;
    exportCtx.save();
    exportCtx.scale(scaleFactor, scaleFactor);
    renderCommittedDocument(exportCtx);
    exportCtx.restore();

    offscreen.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate image blob"));
        return;
      }
      resolve({
        blob,
        width: offscreen.width,
        height: offscreen.height,
      });
    }, mimeType);
  });
}

async function saveBlobWithPcLocationPicker(
  blob: Blob,
  suggestedName: string,
  chosenType: ExportTypeOption,
  useFolderPicker: boolean,
): Promise<string | null> {
  const pickerWin = globalThis as unknown as SavePickerWindow;

  if (useFolderPicker && typeof pickerWin.showSaveFilePicker === "function") {
    try {
      const handle = await pickerWin.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: chosenType.label,
            accept: { [chosenType.mime]: [`.${chosenType.ext}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle.name;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
  return suggestedName;
}

saveToPcButton.addEventListener("click", async () => {
  const chosenType = exportTypes.find((t) =>
    t.ext === exportTypeSelect.value
  ) ??
    exportTypes[0];
  const scaleFactor = Number(exportResolutionSelect.value) || 2;
  const baseName = exportFileNameInput.value.trim() || "my-comic-strip";
  const fileName = `${baseName}-${scaleFactor}x.${chosenType.ext}`;
  const useFolderPicker = exportLocationSelect.value === "picker";

  const { blob, width, height } = await renderCommittedComicToBlob(
    scaleFactor,
    chosenType.mime,
  );

  const savedName = await saveBlobWithPcLocationPicker(
    blob,
    fileName,
    chosenType,
    useFolderPicker,
  );

  exportDropdownMenu.style.display = "none";
  if (savedName === null) {
    message.textContent = "Export save dialog cancelled.";
  } else {
    message.textContent =
      `Saved ${savedName} (${width}×${height} px, ${chosenType.label})`;
  }
});

function selectComicStrip(template: ComicStripTemplate): void {
  drawingState.strip = template;
  canvas.width = template.width;
  canvas.height = template.height;
  updateResolutionOptions();
  renderStripSidebar();
  notifyChange();
  message.textContent =
    `Selected strip: ${template.name} (${template.rows}×${template.cols} panels)`;
}

function renderStripSidebar(): void {
  stripListContainer.replaceChildren();
  for (const template of comicStripTemplates) {
    const btn = document.createElement("button");
    btn.textContent = `${template.name} [${template.rows}×${template.cols}]`;
    btn.style.padding = "6px 8px";
    btn.style.textAlign = "left";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = drawingState.strip.id === template.id
      ? "bold"
      : "normal";
    btn.style.background = drawingState.strip.id === template.id
      ? "#dceefb"
      : "#f8f9fa";
    btn.style.border = drawingState.strip.id === template.id
      ? "2px solid #1d3557"
      : "1px solid #cccccc";
    btn.style.borderRadius = "4px";

    btn.addEventListener("click", () => selectComicStrip(template));
    stripListContainer.appendChild(btn);
  }
}

createCustomStripButton.addEventListener("click", () => {
  const width = Math.round(Number(customWidthInput.value));
  const height = Math.round(Number(customHeightInput.value));
  const rows = Math.round(Number(customRowsInput.value));
  const cols = Math.round(Number(customColsInput.value));

  if (
    !Number.isFinite(width) || !Number.isFinite(height) ||
    width < 200 || width > 1200 || height < 200 || height > 1200 ||
    rows < 1 || rows > 6 || cols < 1 || cols > 6
  ) {
    message.textContent =
      "Invalid custom strip size (use 200–1200px and 1–6 rows/cols).";
    return;
  }

  const rawName = customNameInput.value.trim();
  const label = rawName.length > 0
    ? `${rawName} (${width}×${height})`
    : `Custom Strip #${customStripCounter} (${width}×${height})`;

  const newTemplate: ComicStripTemplate = {
    id: `custom-strip-${customStripCounter++}`,
    name: label,
    width,
    height,
    rows,
    cols,
  };

  comicStripTemplates.push(newTemplate);
  customNameInput.value = "";
  selectComicStrip(newTemplate);
});

function renderScene(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderCommittedDocument(ctx);
  if (activeCommand) {
    activeCommand.display(ctx);
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
  cursorState.isDown = true;

  if (currentTool === "sticker") {
    activeCommand = new StickerCommand(
      cursorState.x,
      cursorState.y,
      selectedSticker,
    );
  } else {
    activeCommand = new StrokeCommand(
      { x: cursorState.x, y: cursorState.y },
      penSize,
      selectedColor,
    );
  }
  notifyChange();
});

canvas.addEventListener("mousemove", (mouse) => {
  if (!cursorState.isDown || !activeCommand) return;
  cursorState.x = mouse.offsetX;
  cursorState.y = mouse.offsetY;

  if (activeCommand instanceof StrokeCommand) {
    activeCommand.addPoint({ x: cursorState.x, y: cursorState.y });
  } else if (activeCommand instanceof StickerCommand) {
    activeCommand.moveTo(cursorState.x, cursorState.y);
  }
  notifyChange();
});

function commitGesture(): void {
  if (cursorState.isDown && activeCommand) {
    drawingState.commands.push(activeCommand);
    drawingState.redoCommands.length = 0;
    message.textContent = `Committed actions: ${drawingState.commands.length}`;
  }
  cursorState.isDown = false;
  activeCommand = null;
  notifyChange();
}

function cancelGesture(): void {
  const hadActiveGesture = cursorState.isDown && activeCommand !== null;
  cursorState.isDown = false;
  activeCommand = null;
  notifyChange();
  if (hadActiveGesture) {
    message.textContent =
      `Gesture cancelled (Redo stack preserved: ${drawingState.redoCommands.length})`;
  }
}

canvas.addEventListener("mouseup", commitGesture);
canvas.addEventListener("mouseout", cancelGesture);
globalThis.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cursorState.isDown) {
    cancelGesture();
  }
});

undoButton.addEventListener("click", () => {
  if (drawingState.commands.length === 0) return;
  const lastCommand = drawingState.commands.pop();
  if (lastCommand) {
    drawingState.redoCommands.push(lastCommand);
  }
  notifyChange();
  message.textContent = `Committed actions: ${drawingState.commands.length}`;
});

redoButton.addEventListener("click", () => {
  if (drawingState.redoCommands.length === 0) return;
  const undoneCommand = drawingState.redoCommands.pop();
  if (undoneCommand) {
    drawingState.commands.push(undoneCommand);
  }
  notifyChange();
  message.textContent = `Committed actions: ${drawingState.commands.length}`;
});

clearButton.addEventListener("click", () => {
  if (drawingState.commands.length === 0) return;
  drawingState.commands.length = 0;
  drawingState.redoCommands.length = 0;
  notifyChange();
  message.textContent = "Document cleared";
});

const canvasContainer = document.createElement("div");
canvasContainer.style.display = "flex";
canvasContainer.style.flexDirection = "row";
canvasContainer.style.gap = "20px";
canvasContainer.style.justifyContent = "center";
canvasContainer.style.alignItems = "flex-start";
canvasContainer.append(leftStripSidebar, canvas);

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
  exportDropdownWrapper,
);

app.append(title, message, toolContainer, canvasContainer, buttonContainer);
updateResolutionOptions();
renderToolButtons();
renderStripSidebar();
notifyChange();
