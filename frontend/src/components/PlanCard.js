import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  styled,
  Box
} from '@mui/material';

// Styled components for visual highlighting
const StyledCard = styled(Card)(({ theme, isCurrentPlan, planColor }) => ({
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s, box-shadow 0.3s',
  border: isCurrentPlan ? `2px solid ${theme.palette[planColor].main}` : '1px solid #e0e0e0',
  boxShadow: isCurrentPlan ? theme.shadows[5] : theme.shadows[1],
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: theme.shadows[8],
  },
  height: '100%',
}));

const PlanCard = ({ 
  title, 
  description, 
  icon: IconComponent, 
  features, 
  price,
  isCurrentPlan, 
  onUpgrade, 
  planColor = 'primary',
  chipLabel,
  actionLabel
}) => (
  <StyledCard isCurrentPlan={isCurrentPlan} planColor={planColor}>
    <CardHeader
      avatar={IconComponent && <IconComponent color={planColor} fontSize="large" />}
      title={<Typography variant="h5" align="center" fontWeight="bold">{title}</Typography>}
      subheader={<Typography variant="h6" align="center" fontWeight="bold" sx={{ mt: 1 }}>{price}</Typography>}
      action={isCurrentPlan && <Chip label="Current Plan ✅" color="success" />}
      sx={{ pb: 0, pt: 2 }}
    />
    <CardContent sx={{ flexGrow: 1, pt: 1 }}>
      {chipLabel && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip label={chipLabel} color={planColor} variant="outlined" />
        </Box>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      <List dense>
        {features.map((feature, idx) => (
          <ListItem key={idx} disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {feature.icon || <></>}
            </ListItemIcon>
            <ListItemText primary={<Typography>{feature.text}</Typography>} />
          </ListItem>
        ))}
      </List>
    </CardContent>
    <CardActions sx={{ p: 2 }}>
      <Button
        variant={isCurrentPlan ? 'outlined' : 'contained'}
        color={planColor}
        fullWidth
        onClick={onUpgrade}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan ? 'Current Plan ✅' : (actionLabel || 'Upgrade')}
      </Button>
    </CardActions>
  </StyledCard>
);

export default PlanCard;