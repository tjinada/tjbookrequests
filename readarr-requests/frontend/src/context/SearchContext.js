// src/context/SearchContext.js
import React, { createContext, useState } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [metadataSource, setMetadataSource] = useState('google');
  const [hasSearched, setHasSearched] = useState(false);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        metadataSource,
        setMetadataSource,
        hasSearched,
        setHasSearched
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;