// src/hooks/useReaderSettings.js
import { useState, useEffect } from 'react';

/**
 * Custom hook for managing e-reader settings
 * @returns {Object} - Reader settings state and setters
 */
const useReaderSettings = () => {
  // Initialize state with default values or values from localStorage
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('reader_fontSize');
    return saved ? parseInt(saved, 10) : 100;
  });
  
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('reader_theme');
    return saved || 'dark'; // default theme: light, options: light, sepia, dark
  });
  
  const [fontFamily, setFontFamily] = useState(() => {
    const saved = localStorage.getItem('reader_fontFamily');
    return saved || 'serif'; // default font: serif, options: serif, sans-serif
  });
  
  const [lineSpacing, setLineSpacing] = useState(() => {
    const saved = localStorage.getItem('reader_lineSpacing');
    return saved ? parseFloat(saved) : 1.5;
  });
  
  const [paginated, setPaginated] = useState(() => {
    const saved = localStorage.getItem('reader_paginated');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [margin, setMargin] = useState(() => {
    const saved = localStorage.getItem('reader_margin');
    return saved ? parseInt(saved, 10) : 20;
  });

  // Wrapper for setFontSize that also saves to localStorage
  const updateFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('reader_fontSize', size.toString());
  };

  // Wrapper for setTheme that also saves to localStorage
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('reader_theme', newTheme);
    
    // Apply theme to the document body to sync the UI
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('sepia-theme');
    } else if (newTheme === 'sepia') {
      document.body.classList.add('sepia-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.remove('dark-theme', 'sepia-theme');
    }
  };

  // Wrapper for setFontFamily that also saves to localStorage
  const updateFontFamily = (family) => {
    setFontFamily(family);
    localStorage.setItem('reader_fontFamily', family);
  };

  // Wrapper for setLineSpacing that also saves to localStorage
  const updateLineSpacing = (spacing) => {
    setLineSpacing(spacing);
    localStorage.setItem('reader_lineSpacing', spacing.toString());
  };

  // Wrapper for setPaginated that also saves to localStorage
  const updatePaginated = (isPaginated) => {
    setPaginated(isPaginated);
    localStorage.setItem('reader_paginated', isPaginated.toString());
  };

  // Wrapper for setMargin that also saves to localStorage
  const updateMargin = (newMargin) => {
    setMargin(newMargin);
    localStorage.setItem('reader_margin', newMargin.toString());
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

  // Apply theme to document on initial load
  useEffect(() => {
    // Apply the current theme to sync the UI
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('sepia-theme');
    } else if (theme === 'sepia') {
      document.body.classList.add('sepia-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.remove('dark-theme', 'sepia-theme');
    }
    
    // Cleanup function to remove classes when component unmounts
    return () => {
      document.body.classList.remove('dark-theme', 'sepia-theme');
    };
  }, [theme]);

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