class Dimensions {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    isInside(posX: number, posY: number): boolean {
        return (
            posX >= this.x &&
            posX <= this.x + this.width &&
            posY >= this.y &&
            posY <= this.y + this.height
        );
    }
}

class UIElement {
    dim: Dimensions;

    constructor(dim: Dimensions) {
        this.dim = dim;
    }
}

class Button extends UIElement {
    type: 'close' | 'maximise';

    constructor(dim: Dimensions, type: 'close' | 'maximise') {
        super(dim);
        this.type = type;
    }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, isMaximised: boolean = false): void {
        this.dim.x = x;
        this.dim.y = y;
        ctx.fillStyle = this.type === 'close' ? 'red' : (isMaximised ? 'orange' : 'green');
        ctx.fillRect(x, y, this.dim.width, this.dim.height);
    }
}

class PWindow extends UIElement {
    title: string;
    isMinimized: boolean;
    isMaximised: boolean;
    isClosed: boolean;
    prevDimensions?: Dimensions;
    closeButton: Button;
    maximiseButton: Button;

    constructor(dim: Dimensions, title: string) {
        super(dim);
        this.title = title;
        this.isMinimized = false;
        this.isClosed = false;
        this.prevDimensions = undefined;
        this.isMaximised = false;

        const inset = 10;
        this.closeButton = new Button(new Dimensions(this.dim.x + this.dim.width - 20 - inset, this.dim.y + inset, 20, 20), 'close');
        this.maximiseButton = new Button(new Dimensions(this.dim.x + this.dim.width - 40 - inset, this.dim.y + inset, 20, 20), 'maximise');
    }

    close(): void {
        this.isClosed = true;
    }

    maximise(canvasWidth: number, canvasHeight: number): void {
        if (!this.isMaximised) {
            this.prevDimensions = new Dimensions(this.dim.x, this.dim.y, this.dim.width, this.dim.height);
            this.dim.x = 0;
            this.dim.y = 0;
            this.dim.width = canvasWidth;
            this.dim.height = canvasHeight;
            this.isMaximised = true;
        } else {
            this.dim = new Dimensions(this.prevDimensions!.x, this.prevDimensions!.y, this.prevDimensions!.width, this.prevDimensions!.height) || new Dimensions(0, 0, canvasWidth / 2, canvasHeight / 2);
            this.isMaximised = false;
            this.prevDimensions = undefined;
        }
    }

    restore(): void {
        this.isMinimized = false;
    }

    resize(width: number, height: number): void {
        this.dim.width = width;
        this.dim.height = height;
    }

    isCloseButtonInside(posX: number, posY: number) {
        return this.closeButton.dim.isInside(posX, posY);
    }

    isMaximiseButtonInside(posX: number, posY: number) {
        return this.maximiseButton.dim.isInside(posX, posY);
    }

    isEdge(posX: number, posY: number, edgeSize: number = 10) {
        const edges = {
            left: posX >= this.dim.x && posX <= this.dim.x + edgeSize,
            top: posY >= this.dim.y && posY <= this.dim.y + edgeSize,
            right: posX >= this.dim.x + this.dim.width - edgeSize && posX <= this.dim.x + this.dim.width,
            bottom: posY >= this.dim.y + this.dim.height - edgeSize && posY <= this.dim.y + this.dim.height
        };
        return Object.keys(edges).some(edge => edges[edge]) ? edges : undefined;
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Fill background
        ctx.fillStyle = 'white';
        ctx.fillRect(this.dim.x, this.dim.y, this.dim.width, this.dim.height);

        // Draw border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.dim.x, this.dim.y, this.dim.width, this.dim.height);

        // Draw title
        ctx.fillStyle = 'black';
        ctx.fillText(this.title, this.dim.x + 10, this.dim.y + 20);

        const inset = 10;
        this.closeButton.draw(ctx, this.dim.x + this.dim.width - 20 - inset, this.dim.y + inset);
        this.maximiseButton.draw(ctx, this.dim.x + this.dim.width - 40 - inset, this.dim.y + inset, this.isMaximised);
    }
}

class PWindowManager {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    windows: PWindow[];
    draggingWindow?: PWindow;
    resizingWindow?: PWindow;
    offsetX: number;
    offsetY: number;
    resizeEdge?: { left: boolean; top: boolean; right: boolean; bottom: boolean; };
    createWindowButton: { x: number; y: number; width: number; height: number; };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.windows = [];
        this.draggingWindow = undefined;
        this.resizingWindow = undefined;
        this.offsetX = 0;
        this.offsetY = 0;
        this.resizeEdge = undefined;

        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));

        this.createWindowButton = { x: 10, y: 10, width: 100, height: 30 };
    }

    createWindow(dim: Dimensions, title: string): void {
        const window = new PWindow(dim, title);
        this.windows.push(window);
        this.draw();
    }

    onMouseDown(event: { clientX: number; clientY: number; }): void {
        const mouseX = event.clientX - this.canvas.offsetLeft;
        const mouseY = event.clientY - this.canvas.offsetTop;

        // Check if the Create Window button was clicked
        if (mouseX >= this.createWindowButton.x && mouseX <= this.createWindowButton.x + this.createWindowButton.width &&
            mouseY >= this.createWindowButton.y && mouseY <= this.createWindowButton.y + this.createWindowButton.height) {
            this.createRandomWindow();
            this.draw();
            return;
        }

        for (let i = this.windows.length - 1; i >= 0; i--) {
            const win = this.windows[i];
            if (win.isCloseButtonInside(mouseX, mouseY) && !win.isMinimized && !win.isClosed) {
                win.close();
                this.draw();
                return;
            } else if (win.isMaximiseButtonInside(mouseX, mouseY) && !win.isMinimized && !win.isClosed) {
                win.maximise(this.canvas.width, this.canvas.height);
                this.draw();
                return;
            } else if (win.dim.isInside(mouseX, mouseY) && !win.isMinimized && !win.isClosed) {
                if (win.isEdge(mouseX, mouseY)) {
                    this.resizingWindow = win;
                    this.resizeEdge = this.getResizeEdge(win, mouseX, mouseY);
                } else {
                    this.draggingWindow = win;
                    this.offsetX = mouseX - win.dim.x;
                    this.offsetY = mouseY - win.dim.y;
                }

                // Bring the window to the top
                this.windows.splice(i, 1);
                this.windows.push(win);

                this.draw();
                break;
            }
        }
    }

    onMouseMove(event: { clientX: number; clientY: number; }): void {
        const mouseX = event.clientX - this.canvas.offsetLeft;
        const mouseY = event.clientY - this.canvas.offsetTop;

        if (this.draggingWindow) {
            this.draggingWindow.dim.x = mouseX - this.offsetX;
            this.draggingWindow.dim.y = mouseY - this.offsetY;
            this.draw();
        } else if (this.resizingWindow) {
            this.resizeWindow(mouseX, mouseY);
            this.draw();
        } else {
            this.updateCursor(mouseX, mouseY);
        }
    }

    onMouseUp(): void {
        this.draggingWindow = undefined;
        this.resizingWindow = undefined;
    }

    getResizeEdge(win: PWindow, mouseX: number, mouseY: number): { left: boolean; top: boolean; right: boolean; bottom: boolean; } | undefined {
        const edges = win.isEdge(mouseX, mouseY);
        return edges;
    }

    resizeWindow(mouseX: number, mouseY: number) {
        const win = this.resizingWindow!;
        const edges = this.resizeEdge!;

        if (edges.left) {
            win.dim.width += win.dim.x - mouseX;
            win.dim.x = mouseX;
        }
        if (edges.top) {
            win.dim.height += win.dim.y - mouseY;
            win.dim.y = mouseY;
        }
        if (edges.right) {
            win.dim.width = mouseX - win.dim.x;
        }
        if (edges.bottom) {
            win.dim.height = mouseY - win.dim.y;
        }
    }

    updateCursor(mouseX, mouseY) {
        const topWindow = this.windows[this.windows.length - 1];  // Get the top window
        if (!topWindow.isMinimized && !topWindow.isClosed) {
            if (topWindow.isCloseButtonInside(mouseX, mouseY)) {
                this.canvas.style.cursor = 'pointer';  // Set cursor to hand pointer when over close button
                return;  // Exit early if a hand pointer cursor was set
            }
            const edges = topWindow.isEdge(mouseX, mouseY);
            if (edges) {
                if (edges.left && edges.top || edges.right && edges.bottom) {
                    this.canvas.style.cursor = 'nwse-resize';
                } else if (edges.right && edges.top || edges.left && edges.bottom) {
                    this.canvas.style.cursor = 'nesw-resize';
                } else if (edges.left || edges.right) {
                    this.canvas.style.cursor = 'ew-resize';
                } else if (edges.top || edges.bottom) {
                    this.canvas.style.cursor = 'ns-resize';
                }
                return;  // Exit early if a resize cursor was set
            }
        }
        this.canvas.style.cursor = 'default';  // Reset cursor to default
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'orange';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (const win of this.windows) {
            if (!win.isClosed && !win.isMinimized) {
                win.draw(this.ctx);  // Delegate drawing to the Window class
            }
        }
        this.drawCreateWindowButton();
    }

    drawCreateWindowButton() {
        this.ctx.fillStyle = 'blue';
        this.ctx.fillRect(this.createWindowButton.x, this.createWindowButton.y, this.createWindowButton.width, this.createWindowButton.height);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('New Window', this.createWindowButton.x + 10, this.createWindowButton.y + 20);
    }

    createRandomWindow() {
        const minWidth = 200, minHeight = 200;
        const maxWidth = this.canvas.width / 2, maxHeight = this.canvas.height / 2;
        const randomWidth = Math.random() * (maxWidth - minWidth) + minWidth;
        const randomHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        const randomX = Math.random() * (this.canvas.width - randomWidth);
        const randomY = Math.random() * (this.canvas.height - randomHeight);
        const newWindow = new PWindow(new Dimensions(randomX, randomY, randomWidth, randomHeight), 'Random Window');
        this.windows.push(newWindow);
    }
}

// Set up the canvas to fill the entire screen
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create a new window manager
const windowManager = new PWindowManager(canvas);

// Create some windows
windowManager.createWindow(new Dimensions(100, 100, 200, 200), "Window 1");
windowManager.createWindow(new Dimensions(400, 100, 200, 200), "Window 2");
