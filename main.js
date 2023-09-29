import './style.css';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.js?url'
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
