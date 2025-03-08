// src/components/library/DeviceSelector.js
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Stack,
  Chip
} from '@mui/material';

// Device icons
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';

const devices = [
  {
    id: 'kindle',
    name: 'Kindle',
    icon: <TabletAndroidIcon fontSize="large" />,
    description: 'Send to any Amazon Kindle device',
    formats: ['MOBI', 'AZW3', 'PDF']
  },
  {
    id: 'kobo',
    name: 'Kobo',
    icon: <DevicesOtherIcon fontSize="large" />,
    description: 'Send to Kobo e-reader devices',
    formats: ['EPUB', 'PDF']
  },
  {
    id: 'ios',
    name: 'iOS',
    icon: <PhoneIphoneIcon fontSize="large" />,
    description: 'Send to iPhone or iPad with reading apps',
    formats: ['EPUB', 'PDF']
  },
  {
    id: 'android',
    name: 'Android',
    icon: <TabletAndroidIcon fontSize="large" />,
    description: 'Send to Android devices with reading apps',
    formats: ['EPUB', 'PDF', 'MOBI']
  }
];

const DeviceSelector = ({ onSelect }) => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  const handleDeviceSelect = (deviceId) => {
    setSelectedDevice(deviceId);
    if (onSelect) {
      onSelect(deviceId);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {devices.map((device) => (
          <Grid item xs={12} sm={6} key={device.id}>
            <Card 
              sx={{ 
                height: '100%',
                borderColor: selectedDevice === device.id ? 'primary.main' : 'transparent',
                borderWidth: 2,
                borderStyle: 'solid',
                transition: 'border-color 0.2s ease'
              }}
            >
              <CardActionArea 
                sx={{ height: '100%' }}
                onClick={() => handleDeviceSelect(device.id)}
              >
                <CardContent>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: 2,
                    color: selectedDevice === device.id ? 'primary.main' : 'text.primary'
                  }}>
                    {device.icon}
                    <Typography variant="h6" component="div" sx={{ ml: 2 }}>
                      {device.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {device.description}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Supported formats:
                    </Typography>
                    {device.formats.map(format => (
                      <Chip 
                        key={format} 
                        label={format} 
                        size="small" 
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DeviceSelector;