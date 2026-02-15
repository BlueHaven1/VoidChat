import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Show a loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void-bg text-void-accent">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the children (the protected page)
  return children;
};

export default PrivateRoute;
