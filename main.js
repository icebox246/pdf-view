import './style.css';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { Viewer } from './viewer';
import { Header } from './header';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const pdfView = document.getElementById("pdf-view");
const pdfUrl = document.getElementById("pdf-url");
const pdfReload = document.getElementById("pdf-reload");
const pdfCenter = document.getElementById("pdf-center");

const viewer = new Viewer(pdfView);
const header = new Header(pdfUrl, pdfReload, pdfCenter, viewer);
header.init();

// service worker
(async () => {
    const registerServiceWorker = async () => {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/pdf-view/sw.js', { scope: '/pdf-view/' });
            } catch (error) {
                console.error('Service worker failed to register:', error);
            }
        }
    };
    await registerServiceWorker();
})();
