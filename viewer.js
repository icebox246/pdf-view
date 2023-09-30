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
        this.ticking = false;
    }

    /** @type{(url: string)} */
    async init(url) {
        let data;
        if (!this.pdf && localStorage.lastUrl == url && localStorage.cachedPdf) {
            data = atob(localStorage.cachedPdf)
        } else {
            console.log('loading new pdf', url);
            const res = await fetchCors(url);
            if(res.status != 200) {
                throw `Failed to fetch ${url}`;
            }
            data = await res.arrayBuffer();
            console.log(data);
            localStorage.cachedPdf = btoa(convertUInt8ArrayToBinaryString(new Uint8Array(data)));
        }

        if (this.pdf) this.pdf.destroy()

        this.pdf = await pdfjs.getDocument({ data }).promise;
        this.page = await this.pdf.getPage(1);

        this.rerender = true;
        if (!this.ticking) {
            this.ticking = true;
            this.tick();
        }
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
        this.drawingContexts[1].clearRect(0, 0, this.canvases[1].width, this.canvases[1].height);
        await this.page.render({
            canvasContext: this.drawingContexts[1],
            viewport: scaledViewport,
            background: 'transparent',
        }).promise;
        this.swapBuffers();
    }

    swapBuffers() {
        this.drawingContexts[0].clearRect(0, 0, this.canvases[0].width, this.canvases[0].height);
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
        this.velocityX = lerp(this.velocityX, 0, 0.5);
        this.velocityY = lerp(this.velocityX, 0, 0.5);
        if ((Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1)) {
            if (this.lastPointerEvents.size == 0) {
                this.offsetX += this.velocityX;
                this.offsetY += this.velocityY;
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
    return await fetch(url, { ...options, mode: 'cors' });
}

/** @type{(arr: Uint8Array)} */
function convertUInt8ArrayToBinaryString(arr) {
    let out = '';
    for (let i = 0; i < arr.length; i++)
        out += String.fromCharCode(arr[i]);
    return out;
}
