# Calibre Library Pagination Implementation

## Overview
This implementation adds proper server-side pagination to the Calibre library manager, allowing it to handle libraries with more than 100 books efficiently.

## Key Changes

### Backend Changes

#### 1. **Enhanced Calibre API (`backend/config/calibreAPI.js`)**
- Modified `searchBooks()` function to accept pagination options:
  - `offset`: Starting position for results
  - `limit`: Number of results to return (default: 100)
  - `sort`: Field to sort by (title, author, timestamp/added)
  - `sortOrder`: Sort direction (asc/desc)
  - `useCache`: Enable/disable caching (default: true)
- Returns an object with:
  - `books`: Array of books for the current page
  - `total`: Total number of books in the library
- Added support for both CLI and Web API pagination
- Implements proper offset/limit for Calibre Web API using `num` and `offset` parameters

#### 2. **Cache System (`backend/utils/calibreCache.js`)**
- Implements a file-based cache system with 5-minute TTL
- Cache key generation based on query parameters
- Functions:
  - `getCache()`: Retrieve cached results if not expired
  - `setCache()`: Save results to cache
  - `clearCache()`: Clear all cache files
  - `clearExpiredCache()`: Remove expired cache entries
- Cache files stored in `backend/cache/calibre/`

#### 3. **Updated Controller (`backend/controllers/calibreManagerController.js`)**
- `getAllBooks()` now uses server-side pagination
- Calculates offset based on page and limit
- Returns enhanced pagination info:
  - `total`: Total books in library
  - `page`: Current page number
  - `limit`: Items per page
  - `pages`: Total number of pages
  - `hasMore`: Boolean indicating more pages available
  - `showing`: Object with `from` and `to` indices
- Added `clearCache()` method to manually clear cache

#### 4. **Scheduled Jobs (`backend/utils/scheduler.js`)**
- Optional scheduled task to clear expired cache every 30 minutes
- Uses `node-cron` if available
- Gracefully handles missing dependency

#### 5. **Routes (`backend/routes/calibreManager.js`)**
- Added `/cache/clear` endpoint for manual cache clearing

### Frontend Changes

#### **Updated Calibre Manager (`frontend/src/pages/CalibreManager.js`)**
- Added "Refresh" button to clear cache and reload data
- Shows total number of books in library
- Displays current page range (e.g., "Showing 1-20 of 250 books")
- Added "Per Page" dropdown to adjust page size (10, 20, 50, 100)
- Improved pagination display with first/last buttons
- Better responsive layout for controls

## Installation

1. Install the required dependency (optional, for scheduled cache cleanup):
```bash
cd backend
npm install node-cron
```

2. The cache directory will be created automatically at `backend/cache/calibre/`

## Usage

### API Endpoints

#### Get Books with Pagination
```
GET /api/calibre-manager/books?page=1&limit=20&sortBy=added&sortOrder=desc&query=
```

Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sortBy`: Sort field - title, author, added (default: added)
- `sortOrder`: Sort direction - asc, desc (default: desc)
- `query`: Search query (optional)

Response:
```json
{
  "books": [...],
  "pagination": {
    "total": 250,
    "page": 1,
    "limit": 20,
    "pages": 13,
    "hasMore": true,
    "showing": {
      "from": 1,
      "to": 20
    }
  }
}
```

#### Clear Cache
```
POST /api/calibre-manager/cache/clear
```

## Performance Considerations

1. **Caching**: Results are cached for 5 minutes to reduce load on Calibre server
2. **Lazy Loading**: Only fetches book details for the current page
3. **Efficient Sorting**: Sorting is done at the API level when possible
4. **Scheduled Cleanup**: Expired cache files are automatically removed

## Configuration

### Environment Variables
The existing Calibre configuration environment variables are used:
- `CALIBRE_SERVER_URL`: Calibre server URL
- `CALIBRE_USERNAME`: Optional authentication username
- `CALIBRE_PASSWORD`: Optional authentication password
- `CALIBRE_LIBRARY_PATH`: Path to Calibre library (for CLI mode)
- `CALIBRE_USE_CLI_ONLY`: Use CLI mode instead of web API

### Cache Settings
In `backend/utils/calibreCache.js`:
- `CACHE_TTL`: Cache time-to-live in milliseconds (default: 5 minutes)

## Troubleshooting

### Books not updating after changes in Calibre
- Click the "Refresh" button in the UI to clear cache
- Or call the cache clear endpoint: `POST /api/calibre-manager/cache/clear`

### Performance issues with large libraries
- Increase the cache TTL if data doesn't change frequently
- Consider reducing the page size for faster loading
- Ensure Calibre server has sufficient resources

### Cache directory permissions
- Ensure the backend process has write permissions to `backend/cache/`
- The directory will be created automatically if it doesn't exist

## Future Enhancements

1. **Infinite Scrolling**: Replace pagination with infinite scroll for better UX
2. **Advanced Filtering**: Add filters for formats, tags, publishers, etc.
3. **Bulk Operations**: Select multiple books across pages for bulk tag updates
4. **Export**: Export filtered/searched results to CSV or JSON
5. **Real-time Updates**: WebSocket integration for live updates when books are added/modified
6. **Distributed Cache**: Use Redis for cache in production environments
7. **Search Optimization**: Implement full-text search with Elasticsearch or similar

## Notes

- The implementation follows KISS (Keep It Simple, Stupid) principle with straightforward pagination
- YAGNI (You Aren't Gonna Need It) - only essential features implemented
- SOLID principles applied with separation of concerns between cache, API, and controller layers
- Backward compatibility maintained with legacy `searchBooksLegacy()` function
