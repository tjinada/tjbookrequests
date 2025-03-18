// src/components/library/LibraryBookCard.js
import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BookIcon from '@mui/icons-material/Book';
import DownloadIcon from '@mui/icons-material/Download';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Styled components for better visual display
const BookCover = styled(CardMedia)(({ theme }) => ({
  height: 220,
  backgroundSize: 'contain',
  backgroundPosition: 'center',
  backgroundColor: theme.palette.grey[100],
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '20%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.1), transparent)',
  }
}));

const FormatBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  '&.MuiChip-root': {
    height: 24,
  },
  '& .MuiChip-label': {
    fontSize: '0.7rem',
    padding: '0 8px',
  }
}));

const BookInfo = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(1.5),
  '&:last-child': {
    paddingBottom: theme.spacing(1.5),
  }
}));

const BookTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: '1.3em',
  height: '2.6em'
}));

const BookAuthor = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

const BookMetaInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginTop: theme.spacing(1),
  justifyContent: 'space-between',
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const StatusIcon = styled(Box)(({ theme, status }) => ({
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.75rem',
  '& svg': {
    fontSize: '1rem',
    marginRight: theme.spacing(0.5),
    color: status === 'downloaded' ? theme.palette.success.main : 
           status === 'downloading' ? theme.palette.warning.main : 
           theme.palette.grey[600],
  }
}));

const LibraryBookCard = ({ book, onClick }) => {
  // Determine book status
  const getBookStatus = () => {
    if (!book.status) return 'available';
    return book.status.toLowerCase();
  };

  // Format book's added date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
    }
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined 
    });
  };

  const renderStatusIcon = () => {
    const status = getBookStatus();
    
    if (status === 'downloaded') {
      return (
        <Tooltip title="Downloaded">
          <StatusIcon status={status}>
            <CloudDoneIcon />
          </StatusIcon>
        </Tooltip>
      );
    }
    
    if (status === 'downloading') {
      return (
        <Tooltip title="Downloading">
          <StatusIcon status={status}>
            <DownloadIcon />
          </StatusIcon>
        </Tooltip>
      );
    }
    
    return null;
  };

  return (
    <Card 
      elevation={2}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Book Cover */}
        <BookCover
          image={book.coverUrl || '/assets/images/default-cover.png'}
          title={book.title}
          sx={{
            position: 'relative',
            backgroundColor: !book.coverUrl ? 'grey.200' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {!book.coverUrl && <BookIcon sx={{ fontSize: 80, color: 'grey.400' }} />}
          {book.format && (
            <FormatBadge
              label={book.format.toUpperCase()}
              size="small"
              color="default"
            />
          )}
        </BookCover>
        
        {/* Book Info */}
        <BookInfo>
          <BookTitle variant="subtitle1">
            {book.title || 'Untitled Book'}
          </BookTitle>
          
          <BookAuthor variant="body2">
            {book.author || 'Unknown Author'}
          </BookAuthor>
          
          <BookMetaInfo>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTimeIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
              {formatDate(book.added)}
            </Box>
            {renderStatusIcon()}
          </BookMetaInfo>
        </BookInfo>
      </CardActionArea>
    </Card>
  );
};

export default LibraryBookCard;