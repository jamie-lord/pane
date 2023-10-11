class UIElement {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    isInside(posX, posY) {
        return (
            posX >= this.x &&
            posX <= this.x + this.width &&
            posY >= this.y &&
            posY <= this.y + this.height
        );
    }
}

class Button extends UIElement {
    constructor(x, y, width, height, type) {
        super(x, y, width, height);
        this.type = type;  // type can be 'close' or 'maximise'
    }

    draw(ctx, x, y, isMaximised) {
        this.x = x;
        this.y = y;
        ctx.fillStyle = this.type === 'close' ? 'red' : (isMaximised ? 'orange' : 'green');
        ctx.fillRect(x, y, this.width, this.height);
    }
}

class Window extends UIElement {
    constructor(x, y, width, height, title) {
        super(x, y, width, height);
        this.title = title;
        this.isMinimized = false;
        this.isClosed = false;
        this.prevDimensions = null;  // Holds the previous dimensions before maximising
        this.isMaximised = false;  // Flag to check if the window is maximised

        const inset = 10;
        this.closeButton = new Button(this.x + this.width - 20 - inset, this.y + inset, 20, 20, 'close');
        this.maximiseButton = new Button(this.x + this.width - 40 - inset, this.y + inset, 20, 20, 'maximise');
    }

    close() {
        this.isClosed = true;
    }

    minimize() {
        this.isMinimized = true;
    }

    maximise(canvasWidth, canvasHeight) {
        if (!this.isMaximised) {
            this.prevDimensions = { x: this.x, y: this.y, width: this.width, height: this.height };
            this.x = 0;
            this.y = 0;
            this.width = canvasWidth;
            this.height = canvasHeight;
            this.isMaximised = true;
        } else {
            const { x, y, width, height } = this.prevDimensions || { x: 0, y: 0, width: canvasWidth / 2, height: canvasHeight / 2 };
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.isMaximised = false;
        }
    }

    restore() {
        this.isMinimized = false;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    isCloseButtonInside(posX, posY) {
        return this.closeButton.isInside(posX, posY);
    }

    isMaximiseButtonInside(posX, posY) {
        return this.maximiseButton.isInside(posX, posY);
    }

    isEdge(posX, posY) {
        const edgeSize = 10;
        const edges = {
            left: posX >= this.x && posX <= this.x + edgeSize,
            top: posY >= this.y && posY <= this.y + edgeSize,
            right: posX >= this.x + this.width - edgeSize && posX <= this.x + this.width,
            bottom: posY >= this.y + this.height - edgeSize && posY <= this.y + this.height
        };
        return Object.keys(edges).some(edge => edges[edge]) ? edges : null;
    }

    draw(ctx) {
        // Fill background
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Draw title
        ctx.fillStyle = 'black';
        ctx.fillText(this.title, this.x + 10, this.y + 20);

        const inset = 10;
        this.closeButton.draw(ctx, this.x + this.width - 20 - inset, this.y + inset);
        this.maximiseButton.draw(ctx, this.x + this.width - 40 - inset, this.y + inset, this.isMaximised);
    }
}

class WindowManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.windows = [];
        this.draggingWindow = null;
        this.resizingWindow = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.resizeEdge = null;

        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));

        this.createWindowButton = { x: 10, y: 10, width: 100, height: 30 };
    }

    createWindow(x, y, width, height, title) {
        const window = new Window(x, y, width, height, title);
        this.windows.push(window);
        this.draw();
    }

    onMouseDown(event) {
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
            } else if (win.isInside(mouseX, mouseY) && !win.isMinimized && !win.isClosed) {
                if (win.isEdge(mouseX, mouseY)) {
                    this.resizingWindow = win;
                    this.resizeEdge = this.getResizeEdge(win, mouseX, mouseY);
                } else {
                    this.draggingWindow = win;
                    this.offsetX = mouseX - win.x;
                    this.offsetY = mouseY - win.y;
                }

                // Bring the window to the top
                this.windows.splice(i, 1);
                this.windows.push(win);

                this.draw();
                break;
            }
        }
    }

    onMouseMove(event) {
        const mouseX = event.clientX - this.canvas.offsetLeft;
        const mouseY = event.clientY - this.canvas.offsetTop;

        if (this.draggingWindow) {
            this.draggingWindow.x = mouseX - this.offsetX;
            this.draggingWindow.y = mouseY - this.offsetY;
            this.draw();
        } else if (this.resizingWindow) {
            this.resizeWindow(mouseX, mouseY);
            this.draw();
        } else {
            this.updateCursor(mouseX, mouseY);
        }
    }

    onMouseUp() {
        this.draggingWindow = null;
        this.resizingWindow = null;
    }

    getResizeEdge(win, mouseX, mouseY) {
        const edges = win.isEdge(mouseX, mouseY);
        return edges;
    }

    resizeWindow(mouseX, mouseY) {
        const win = this.resizingWindow;
        const edges = this.resizeEdge;

        if (edges.left) {
            win.width += win.x - mouseX;
            win.x = mouseX;
        }
        if (edges.top) {
            win.height += win.y - mouseY;
            win.y = mouseY;
        }
        if (edges.right) {
            win.width = mouseX - win.x;
        }
        if (edges.bottom) {
            win.height = mouseY - win.y;
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
        const newWindow = new Window(randomX, randomY, randomWidth, randomHeight, 'Random Window');
        this.windows.push(newWindow);
    }
}

// Set up the canvas to fill the entire screen
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create a new window manager
const windowManager = new WindowManager(canvas);

// Create some windows
windowManager.createWindow(100, 100, 200, 200, "Window 1");
windowManager.createWindow(400, 100, 200, 200, "Window 2");
