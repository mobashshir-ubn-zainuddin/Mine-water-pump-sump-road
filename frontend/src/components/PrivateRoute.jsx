import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// ============ PRIVATE ROUTE COMPONENT ============
// Protects routes that require authentication
// Redirects to login if user is not authenticated

function PrivateRoute({ children }) {
  const { user, checkAuth } = useAuthStore();
  const isAuthenticated = checkAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
