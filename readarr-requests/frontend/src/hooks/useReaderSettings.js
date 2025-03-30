// src/hooks/useReaderSettings.js
import { useState, useEffect } from 'react';

/**
 * Custom hook for managing e-reader settings
 * @returns {Object} - Reader settings state and setters
 */
const useReaderSettings = () => {
  // Initialize state with default values
  const [fontSize, setFontSize] = useState(100);
  const [theme, setTheme] = useState('light'); // light, sepia, dark
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [paginated, setPaginated] = useState(true);
  const [margin, setMargin] = useState(20);

  // Load settings from localStorage on first render
  useEffect(() => {
    const loadSettings = () => {
      // Font size
      const savedFontSize = localStorage.getItem('reader_fontSize');
      if (savedFontSize) {
        setFontSize(parseInt(savedFontSize, 10));
      }
      
      // Theme
      const savedTheme = localStorage.getItem('reader_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
      
      // Font family
      const savedFontFamily = localStorage.getItem('reader_fontFamily');
      if (savedFontFamily) {
        setFontFamily(savedFontFamily);
      }
      
      // Line spacing
      const savedLineSpacing = localStorage.getItem('reader_lineSpacing');
      if (savedLineSpacing) {
        setLineSpacing(parseFloat(savedLineSpacing));
      }
      
      // Pagination
      const savedPaginated = localStorage.getItem('reader_paginated');
      if (savedPaginated !== null) {
        setPaginated(savedPaginated === 'true');
      }
      
      // Margin
      const savedMargin = localStorage.getItem('reader_margin');
      if (savedMargin) {
        setMargin(parseInt(savedMargin, 10));
      }
    };
    
    loadSettings();
  }, []);

  // Wrapper for setFontSize that also saves to localStorage
  const updateFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('reader_fontSize', size);
  };

  // Wrapper for setTheme that also saves to localStorage
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('reader_theme', newTheme);
  };

  // Wrapper for setFontFamily that also saves to localStorage
  const updateFontFamily = (family) => {
    setFontFamily(family);
    localStorage.setItem('reader_fontFamily', family);
  };

  // Wrapper for setLineSpacing that also saves to localStorage
  const updateLineSpacing = (spacing) => {
    setLineSpacing(spacing);
    localStorage.setItem('reader_lineSpacing', spacing);
  };

  // Wrapper for setPaginated that also saves to localStorage
  const updatePaginated = (isPaginated) => {
    setPaginated(isPaginated);
    localStorage.setItem('reader_paginated', isPaginated);
  };

  // Wrapper for setMargin that also saves to localStorage
  const updateMargin = (newMargin) => {
    setMargin(newMargin);
    localStorage.setItem('reader_margin', newMargin);
  };

  // Reset settings to defaults
  const resetSettings = () => {
    updateFontSize(100);
    updateTheme('light');
    updateFontFamily('serif');
    updateLineSpacing(1.5);
    updatePaginated(true);
    updateMargin(20);
  };

  return {
    // Current settings
    fontSize,
    theme,
    fontFamily,
    lineSpacing,
    paginated,
    margin,
    
    // Setters that also save to localStorage
    setFontSize: updateFontSize,
    setTheme: updateTheme,
    setFontFamily: updateFontFamily,
    setLineSpacing: updateLineSpacing,
    setPaginated: updatePaginated,
    setMargin: updateMargin,
    
    // Utility function
    resetSettings
  };
};

export default useReaderSettings;