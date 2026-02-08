'use client';

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Header from '../components/Header';
import { UserPlus, AlertCircle, Loader } from 'lucide-react';

// ============ SIGNUP PAGE ============
// User registration with name, email, password, and role selection

function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'foreman'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { signup } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate inputs
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error('Please fill in all fields');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Please enter a valid email');
      }

      // Attempt signup
      await signup(
        formData.name,
        formData.email,
        formData.password,
        formData.role
      );

      // Redirect to dashboard on success
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Signup failed');
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
                <UserPlus className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-text">Create Account</h1>
              <p className="text-textSecondary mt-2">
                Set up your mining operation dashboard
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
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-surfaceAlt border border-border rounded-lg text-text placeholder-textSecondary focus:outline-none focus:border-accent transition-colors"
                  placeholder="John Foreman"
                  disabled={isLoading}
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-surfaceAlt border border-border rounded-lg text-text placeholder-textSecondary focus:outline-none focus:border-accent transition-colors"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              {/* Role Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-surfaceAlt border border-border rounded-lg text-text focus:outline-none focus:border-accent transition-colors"
                  disabled={isLoading}
                >
                  <option value="foreman">Pit Foreman</option>
                  <option value="maintenance">Maintenance Technician</option>
                  <option value="road">Road Manager</option>
                </select>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-surfaceAlt border border-border rounded-lg text-text placeholder-textSecondary focus:outline-none focus:border-accent transition-colors"
                  placeholder="••••••"
                  disabled={isLoading}
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-textSecondary text-sm">OR</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Login Link */}
            <p className="text-center text-textSecondary">
              Already have an account?
              <Link
                to="/login"
                className="ml-2 text-accent hover:underline font-semibold"
              >
                Login
              </Link>
            </p>
          </div>

          {/* Security Info */}
          <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
            <p className="text-xs text-textSecondary">
              <strong>Security:</strong> Your password is securely hashed and never
              stored in plain text. All data is encrypted in transit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
