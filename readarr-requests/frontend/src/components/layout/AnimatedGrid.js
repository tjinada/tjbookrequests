// src/components/layout/AnimatedGrid.js
import React from 'react';
import Grid from '@mui/material/Grid';
import { motion } from 'framer-motion';

const MotionGrid = motion(Grid);

const AnimatedGrid = ({ children, spacing, sx, itemProps = {}, ...props }) => {
  return (
    <Grid container spacing={spacing} sx={sx} {...props}>
      {React.Children.map(children, (child, i) => {
        // Combine default values with passed-in itemProps
        const gridItemProps = {
          item: true,
          xs: itemProps.xs || 6,
          sm: itemProps.sm || 4,
          md: itemProps.md || 3,
          lg: itemProps.lg || 3,
          key: i,
          sx: itemProps.sx || {},
          ...itemProps
        };
        
        return (
          <MotionGrid
            {...gridItemProps}
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
        );
      })}
    </Grid>
  );
};

export default AnimatedGrid;