// src/components/library/PdfReader.js
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, CircularProgress, Typography, IconButton, Pagination } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

// Set up worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfReader = ({ url, initialScale = 1.0 }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(initialScale);
  const [pdfError, setPdfError] = useState(null);
  const [pageWidth, setPageWidth] = useState(null);
  
  useEffect(() => {
    // Get container width
    const updatePageWidth = () => {
      const container = document.getElementById('pdf-container');
      if (container) {
        setPageWidth(container.offsetWidth);
      }
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    
    return () => {
      window.removeEventListener('resize', updatePageWidth);
    };
  }, []);
  
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };
  
  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF document');
    setLoading(false);
  };
  
  const handlePageChange = (event, value) => {
    setPageNumber(value);
  };
  
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };
  
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <IconButton onClick={zoomOut} size="small">
          <ZoomOutIcon />
        </IconButton>
        <Typography variant="body2" sx={{ mx: 1 }}>
          {Math.round(scale * 100)}%
        </Typography>
        <IconButton onClick={zoomIn} size="small">
          <ZoomInIcon />
        </IconButton>
        
        {numPages && (
          <Box sx={{ ml: 2 }}>
            <Pagination 
              count={numPages} 
              page={pageNumber} 
              onChange={handlePageChange} 
              size="small" 
              color="primary" 
            />
          </Box>
        )}
      </Box>
      
      {/* PDF Document */}
      <Box 
        id="pdf-container"
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 2
        }}
      >
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            width: '100%'
          }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading PDF...
            </Typography>
          </Box>
        )}
        
        {pdfError && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            width: '100%'
          }}>
            <Typography color="error">
              {pdfError}
            </Typography>
          </Box>
        )}
        
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<></>} // We have our own loading indicator
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            width={pageWidth ? pageWidth * 0.9 : undefined}
            loading={<></>} // We have our own loading indicator
            renderTextLayer={false} // For better performance
            renderAnnotationLayer={false} // For better performance
          />
        </Document>
      </Box>
    </Box>
  );
};

export default PdfReader;