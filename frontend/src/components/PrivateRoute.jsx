import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// ============ PRIVATE ROUTE COMPONENT ============
// Protects routes that require authentication
// Redirects to login if user is not authenticated

function PrivateRoute({ children }) {
  const { user, checkAuth, isInitialized } = useAuthStore();
  const isAuthenticated = checkAuth();

  // Wait for auth initialization before redirecting
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
