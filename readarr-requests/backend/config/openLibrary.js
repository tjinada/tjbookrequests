// backend/config/openLibrary.js
const axios = require('axios');

// Create axios instance for OpenLibrary
const openLibraryAPI = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 10000,
});

module.exports = {
  /**
   * Get trending books from OpenLibrary
   */
  getTrendingBooks: async () => {
    try {
      // Get trending books from OpenLibrary
      const response = await openLibraryAPI.get('/trending/daily.json');

      // Map the response to a consistent format
      const books = await Promise.all(
        response.data.works.slice(0, 20).map(async (work) => {
          // Get cover if available
          let coverUrl = null;
          if (work.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${work.cover_i}-L.jpg`;
          }

          // Format author names
          const authorNames = work.author_name ? work.author_name.join(', ') : 'Unknown Author';

          return {
            id: work.key.replace('/works/', ''),
            title: work.title,
            author: authorNames,
            overview: work.excerpt || work.description || '',
            cover: coverUrl,
            releaseDate: work.first_publish_year ? `${work.first_publish_year}-01-01` : null,
            olid: work.key,
            isbn: work.isbn ? work.isbn[0] : null
          };
        })
      );

      return books;
    } catch (error) {
      console.error('Error fetching trending books from OpenLibrary:', error);
      throw error;
    }
  },

  /**
   * Search books in OpenLibrary
   */
  searchBooks: async (query) => {
    try {
      const response = await openLibraryAPI.get(`/search.json?q=${encodeURIComponent(query)}`);

      // Map the response to a consistent format
      const books = response.data.docs.slice(0, 30).map(book => {
        // Get cover if available
        let coverUrl = null;
        if (book.cover_i) {
          coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        }

        // Format author names
        const authorNames = book.author_name ? book.author_name.join(', ') : 'Unknown Author';

        return {
          id: book.key.replace('/works/', ''),
          title: book.title,
          author: authorNames,
          overview: book.excerpt || book.description || '',
          cover: coverUrl,
          releaseDate: book.first_publish_year ? `${book.first_publish_year}-01-01` : null,
          olid: book.key,
          isbn: book.isbn ? book.isbn[0] : null
        };
      });

      return books;
    } catch (error) {
      console.error('Error searching books from OpenLibrary:', error);
      throw error;
    }
  },

  /**
   * Get book details from OpenLibrary by ID
   */
  getBookDetails: async (bookId) => {
    try {
      // Get work details
      const workResponse = await openLibraryAPI.get(`/works/${bookId}.json`);

      // Get editions if available to get more information
      let editionData = null;
      let isbn = null;

      if (workResponse.data.editions && workResponse.data.editions.length > 0) {
        try {
          const editionResponse = await openLibraryAPI.get(`${workResponse.data.editions[0]}.json`);
          editionData = editionResponse.data;
          isbn = editionData.isbn_13 ? editionData.isbn_13[0] : (editionData.isbn_10 ? editionData.isbn_10[0] : null);
        } catch (err) {
          console.log('Error fetching edition data:', err);
        }
      }

      // Get cover if available
      let coverUrl = null;
      if (workResponse.data.covers && workResponse.data.covers.length > 0) {
        coverUrl = `https://covers.openlibrary.org/b/id/${workResponse.data.covers[0]}-L.jpg`;
      }

      // Get author information
      let authorName = 'Unknown Author';
      if (workResponse.data.authors && workResponse.data.authors.length > 0) {
        try {
          const authorResponse = await openLibraryAPI.get(`${workResponse.data.authors[0].author.key}.json`);
          authorName = authorResponse.data.name;
        } catch (err) {
          console.log('Error fetching author data:', err);
        }
      }

      // Extract subjects as genres
      const genres = workResponse.data.subjects 
        ? workResponse.data.subjects.slice(0, 5) 
        : [];

      return {
        id: bookId,
        title: workResponse.data.title,
        author: authorName,
        overview: workResponse.data.description 
          ? (typeof workResponse.data.description === 'object' 
            ? workResponse.data.description.value 
            : workResponse.data.description)
          : '',
        cover: coverUrl,
        releaseDate: workResponse.data.first_publish_date 
          ? `${workResponse.data.first_publish_date}-01-01` 
          : null,
        genres: genres,
        isbn: isbn,
        olid: workResponse.data.key
      };
    } catch (error) {
      console.error('Error fetching book details from OpenLibrary:', error);
      throw error;
    }
  }
};