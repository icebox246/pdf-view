import * as pdfjs from 'pdfjs-dist';

export class Viewer {
    /** @type{(canvas: HTMLCanvasElement)} */
    constructor(canvas) {
        this.canvases = [];
        this.drawingContexts = [];

        this.canvases.push(canvas);
        this.canvases.push(document.createElement('canvas'));

        for (const c of this.canvases) {
            this.drawingContexts.push(c.getContext('2d'));
            c.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            c.addEventListener('pointerup', (e) => this.onPointerUp(e));
            c.addEventListener('pointermove', (e) => this.onPointerMove(e));
            c.classList.add('pdf-view')
        }
        /** @type{Map<number, PointerEvent>} */
        this.lastPointerEvents = new Map();
        this.lastPinchDistance = null;
        this.userScale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    /** @type{(url: string)} */
    async init(url) {
        const res = await fetchCors(url);
        console.log(res);
        const data = await res.arrayBuffer();
        this.pdf = await pdfjs.getDocument({ data }).promise;
        this.page = await this.pdf.getPage(1);

        this.rerender = true;
        await this.tick();
    }

    resizeCanvas() {
        const targetWidth = window.innerWidth;
        const targetHeight = window.innerHeight;
        for (const c of this.canvases) {
            if (c.width != targetWidth)
                c.width = targetWidth;
            if (c.height != targetHeight)
                c.height = targetHeight;
        }
    }

    async renderPage() {
        const originalViewport = this.page.getViewport({ scale: 1 });
        const scale = this.canvases[1].width / originalViewport.width;
        const scaledViewport = this.page.getViewport({
            scale: scale * this.userScale,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
        });
        await this.page.render({
            canvasContext: this.drawingContexts[1],
            viewport: scaledViewport,
        }).promise;
        this.swapBuffers();
    }

    swapBuffers() {
        this.drawingContexts[0].drawImage(this.canvases[1], 0, 0);
    }


    /** @type{(e: PointerEvent)} */
    onPointerDown(e) {
        this.lastPointerEvents.set(e.pointerId, e);
    }

    /** @type{(e: PointerEvent)} */
    onPointerUp(e) {
        if (this.lastPointerEvents.size == 2)
            this.lastPinchDistance = null;
        this.lastPointerEvents.delete(e.pointerId);
    }

    /** @type{(e: PointerEvent)} */
    onPointerMove(e) {
        if (this.lastPointerEvents.has(e.pointerId)) {
            if (this.lastPointerEvents.size == 2) {
                let [a, b] = this.lastPointerEvents.values();
                if (e.pointerId == b.pointerId) {
                    [a, b] = [b, a];
                }
                const dx = b.screenX - a.screenX;
                const dy = b.screenY - a.screenY;
                const cx = (a.screenX + b.screenX) / 2;
                const cy = (a.screenY + b.screenY) / 2;
                const currentPinchDistance = Math.sqrt(dx ** 2 + dy ** 2);
                if (this.lastPinchDistance !== null) {
                    const delta = currentPinchDistance - this.lastPinchDistance;
                    if (Math.abs(delta) > 1) {
                        const s = 1 + (delta * 0.005);
                        this.offsetX += (this.offsetX - cx) * s - (this.offsetX - cx);
                        this.offsetY += (this.offsetY - cy) * s - (this.offsetY - cy);
                        this.userScale *= s;
                        this.rerender = true;
                        this.lastPinchDistance = currentPinchDistance;
                    }
                } else {
                    this.lastPinchDistance = currentPinchDistance;
                }
            } else {
                const last = this.lastPointerEvents.get(e.pointerId);
                const dx = e.screenX - last.screenX;
                const dy = e.screenY - last.screenY;

                this.offsetX += dx;
                this.offsetY += dy;

                this.velocityX += dx;
                this.velocityY += dy;

                this.rerender = true;
            }
            this.lastPointerEvents.set(e.pointerId, e);
        }
    }

    slide() {
        this.velocityX = lerp(this.velocityX, 0, 0.2);
        this.velocityY = lerp(this.velocityX, 0, 0.2);
        if ((Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1)) {
            if (this.lastPointerEvents.size == 0) {
                this.offsetX += this.velocityX * 0.1;
                this.offsetY += this.velocityY * 0.1;
            }
            this.rerender = true;
        }
    }

    async tick() {
        this.slide();
        if (this.rerender) {
            this.rerender = false;
            this.resizeCanvas();
            await this.renderPage();
        }
        window.requestAnimationFrame(() => this.tick());
    }
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

/** @type{(resource: URL, options?: RequestInit)} */
async function fetchCors(resource, options) {
    const url = 'https://corsproxy.io/?' + encodeURIComponent(resource);
    return await fetch(url, options);
}
