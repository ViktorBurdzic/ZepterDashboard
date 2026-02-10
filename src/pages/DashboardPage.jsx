import { useAuth } from '../hooks/useAuth';
import { Container, Box, Typography, Button, Paper, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to Zepter Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Hello, {user?.name || user?.email}!
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>Role:</strong> {user?.role}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>User ID:</strong> {user?.id}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>Email:</strong> {user?.email}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleLogout}
              sx={{ mr: 2 }}
            >
              Logout
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => navigate('/profile')}
            >
              View Profile
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
