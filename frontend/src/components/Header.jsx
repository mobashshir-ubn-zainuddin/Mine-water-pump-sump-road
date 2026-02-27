'use client';

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

// ============ HEADER COMPONENT ============
// Navigation header with login/signup buttons and user menu

function Header() {
  const { user, checkAuth, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = checkAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-surface/95 backdrop-blur-sm border-b border-border z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-background font-bold text-lg">MMS</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-text">MineOps</h1>
            <p className="text-xs text-textSecondary">Monitoring System</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-textSecondary hover:text-accent transition-colors font-medium"
              >
                Dashboard
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 text-text hover:text-accent transition-colors">
                  <User className="w-5 h-5" />
                  <span>{user?.name || 'User'}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-textSecondary hover:text-accent flex items-center gap-2 hover:bg-surfaceAlt transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <X className="w-6 h-6 text-accent" />
          ) : (
            <Menu className="w-6 h-6 text-text" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="px-4 py-4 space-y-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left text-text hover:text-accent transition-colors font-medium"
                >
                  Dashboard
                </button>
                <div className="text-textSecondary text-sm">
                  {user?.name}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 btn-danger"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate('/login');
                    setMenuOpen(false);
                  }}
                  className="w-full btn-secondary"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    navigate('/signup');
                    setMenuOpen(false);
                  }}
                  className="w-full btn-primary"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
