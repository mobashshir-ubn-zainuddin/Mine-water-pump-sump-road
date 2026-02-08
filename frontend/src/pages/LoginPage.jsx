'use client';

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Header from '../components/Header';
import { LogIn, AlertCircle, Loader } from 'lucide-react';

// ============ LOGIN PAGE ============
// User authentication with email and password

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email');
      }

      // Attempt login
      await login(email, password);

      // Redirect to dashboard on success
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="card border-2 border-border">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-text">Welcome Back</h1>
              <p className="text-textSecondary mt-2">
                Sign in to your mining operation dashboard
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-danger/10 border border-danger/50 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-surfaceAlt border border-border rounded-lg text-text placeholder-textSecondary focus:outline-none focus:border-accent transition-colors"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-surfaceAlt border border-border rounded-lg text-text placeholder-textSecondary focus:outline-none focus:border-accent transition-colors"
                  placeholder="••••••"
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-textSecondary text-sm">OR</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Signup Link */}
            <p className="text-center text-textSecondary">
              Don't have an account?
              <Link
                to="/signup"
                className="ml-2 text-accent hover:underline font-semibold"
              >
                Sign Up
              </Link>
            </p>
          </div>

          {/* Demo Info */}
          <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
            <p className="text-xs text-textSecondary">
              <strong>Demo Credentials:</strong><br />
              Email: demo@example.com<br />
              Password: (set during signup)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
