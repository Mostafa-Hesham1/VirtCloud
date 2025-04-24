import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  CardMedia
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneIcon from '@mui/icons-material/Done';
import StarIcon from '@mui/icons-material/Star';

const PlanCard = ({ 
  name,
  price,
  credits,
  features,
  color,
  buttonText,
  isCurrentPlan,
  onSelect,
  disabled = false,
  image
}) => {
  const theme = useTheme();
  
  // Define color mapping
  const colorMap = {
    grey: theme.palette.grey[200],
    blue: theme.palette.primary.light,
    green: theme.palette.success.light,
    orange: theme.palette.warning.light,
  };
  
  const cardColor = colorMap[color] || theme.palette.grey[200];
  
  return (
    <Card 
      elevation={isCurrentPlan ? 8 : 3} 
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 4,
        overflow: 'hidden',
        border: isCurrentPlan ? `2px solid ${theme.palette.success.main}` : 'none',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: isCurrentPlan ? 'none' : 'translateY(-12px)',
          boxShadow: isCurrentPlan ? 8 : 10
        },
        position: 'relative',
      }}
    >
      {image && (
        <CardMedia
          component="img"
          height="140"
          image={image}
          alt={name}
          sx={{ 
            objectFit: 'cover',
          }}
        />
      )}
      
      {isCurrentPlan && (
        <Chip
          icon={<DoneIcon />}
          label="Current Plan"
          color="success"
          sx={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 2,
            fontWeight: 'bold',
            boxShadow: theme.shadows[3]
          }}
        />
      )}
      
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {name === "Unlimited Plan" && <StarIcon color="warning" />}
            <Typography variant="h5" component="div" fontWeight="bold">
              {name}
            </Typography>
          </Box>
        }
        sx={{ 
          bgcolor: `${cardColor}80`,
          pb: 1,
          borderBottom: `2px dashed ${cardColor}`
        }}
      />
      
      <CardContent sx={{ flexGrow: 1, pt: 3, px: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h3" component="div" fontWeight="bold" color={isCurrentPlan ? 'primary.main' : 'text.primary'}>
            {price}
            {price !== 'Custom' && (
              <Typography variant="body1" component="span" color="text.secondary" sx={{ ml: 1, fontWeight: 'normal' }}>
                /month
              </Typography>
            )}
          </Typography>
          
          {credits && (
            <Chip 
              label={credits} 
              color={isCurrentPlan ? "success" : "default"}
              variant={isCurrentPlan ? "filled" : "outlined"}
              sx={{ mt: 2, fontSize: '1rem', py: 2, px: 1 }} 
            />
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <List dense disablePadding sx={{ '& .MuiListItem-root': { py: 1 } }}>
          {features.map((feature, index) => (
            <ListItem key={index} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleIcon color={isCurrentPlan ? "success" : "primary"} />
              </ListItemIcon>
              <ListItemText 
                primary={feature} 
                primaryTypographyProps={{ 
                  variant: 'body2',
                  fontWeight: feature.includes('Up to') ? 'bold' : 'normal'
                }} 
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
      
      <CardActions sx={{ p: 3, pt: 1 }}>
        <Button 
          variant={isCurrentPlan ? "outlined" : "contained"}
          color={isCurrentPlan ? "success" : "primary"}
          fullWidth
          size="large"
          onClick={() => onSelect(name.toLowerCase().replace(/\s+/g, '-'))}
          disabled={disabled || isCurrentPlan}
          sx={{
            py: 1.5,
            borderRadius: 2,
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          {buttonText}
        </Button>
      </CardActions>
    </Card>
  );
};

export default PlanCard;
