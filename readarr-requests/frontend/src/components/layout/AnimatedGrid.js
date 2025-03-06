// src/components/layout/AnimatedGrid.js
import React from 'react';
import Grid from '@mui/material/Grid';
import { motion } from 'framer-motion';

const MotionGrid = motion(Grid);

const AnimatedGrid = ({ children, spacing = 2, itemProps = {}, sx, ...props }) => {
  // Default grid item props
  const defaultItemProps = {
    xs: 6,
    sm: 4,
    md: 3,
    lg: 3
  };

  // Merge default props with any passed in props
  const gridItemProps = { ...defaultItemProps, ...itemProps };

  return (
    <Grid 
      container 
      spacing={spacing} 
      sx={{ 
        width: '100%', 
        mx: 0,
        ...sx 
      }}
      {...props}
    >
      {React.Children.map(children, (child, i) => (
        <MotionGrid
          item
          {...gridItemProps}
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.4,
            delay: i * 0.05, // Stagger the animations
            ease: "easeOut"
          }}
        >
          {child}
        </MotionGrid>
      ))}
    </Grid>
  );
};

export default AnimatedGrid;