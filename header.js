import { Viewer } from "./viewer";

export class Header {
    /** @type{(urlInput: HTMLInputElement, reloadButton: HTMLButtonElement, centerButton: HTMLButtonElement, viewer: Viewer)} */
    constructor(urlInput, reloadButton, centerButton, viewer) {
        this.urlInput = urlInput;
        this.reloadButton = reloadButton;
        this.centerButton = centerButton;
        this.viewer = viewer;

        this.reloadButton.addEventListener('click', async () => {
            const url = this.urlInput.value;
            try {
                await this.loadFromUrl(url);
                localStorage.lastUrl = url;
            } catch (e) {
                console.error(e);
                alert("File could not be loaded :(");
            }
        })

        this.centerButton.addEventListener('click', () => {
            this.viewer.offsetX = 0;
            this.viewer.offsetY = 0;
            this.viewer.userScale = 1;
            this.viewer.rerender = true;
        })
    }

    async init() {
        if (localStorage.lastUrl) {
            this.urlInput.value = localStorage.lastUrl;
            const url = localStorage.lastUrl;
            try {
                await this.loadFromUrl(url);
                localStorage.lastUrl = url;
            } catch (e) {
                console.error(e);
            }
        }
    }

    async loadFromUrl(url) {
        await this.viewer.init(url);
    }
}
