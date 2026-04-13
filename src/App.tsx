import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Live from './pages/Live';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Monetize from './pages/Monetize';
import Notifications from './pages/Notifications';
import Auth from './pages/Auth';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  return user ? children : <Navigate to="/auth" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/live" element={<Live />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/monetize" element={<Monetize />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/profile/:uid" element={<Profile />} />
                    </Routes>
                  </ErrorBoundary>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
