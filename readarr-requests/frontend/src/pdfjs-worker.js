import { pdfjs } from 'react-pdf';

// Initialize PDF.js worker
// This file needs to be imported once in your application
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;