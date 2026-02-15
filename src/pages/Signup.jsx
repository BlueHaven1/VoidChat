import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await signup(email, password, username);
      navigate('/'); // Redirect to dashboard after signup
    } catch (err) {
      let errorMessage = 'Failed to create an account.';
      if (err.message.includes('email-already-in-use')) { 
        errorMessage = 'Email already in use.'; 
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-void-bg">
      <div className="w-full max-w-lg p-8 rounded shadow-2xl bg-void-panel">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
             <MessageSquare className="w-12 h-12 text-void-accent" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Create an account</h1>
        </div>

        {error && (
          <div className="flex items-center p-3 mb-4 text-sm text-red-500 rounded bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-xs font-bold uppercase text-void-text-muted" htmlFor="email">
              Email
            </label>
            <input
              className="w-full p-3 transition duration-200 rounded bg-void-element text-void-text focus:outline-none focus:ring-2 focus:ring-void-accent"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-xs font-bold uppercase text-void-text-muted" htmlFor="username">
              Username
            </label>
            <input
              className="w-full p-3 transition duration-200 rounded bg-void-element text-void-text focus:outline-none focus:ring-2 focus:ring-void-accent"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-8">
            <label className="block mb-2 text-xs font-bold uppercase text-void-text-muted" htmlFor="password">
              Password
            </label>
            <input
              className="w-full p-3 transition duration-200 rounded bg-void-element text-void-text focus:outline-none focus:ring-2 focus:ring-void-accent"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="w-full py-3 mb-4 font-bold text-white transition duration-200 rounded bg-void-accent hover:bg-void-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            type="submit"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </button>

          <div className="text-sm text-void-text-muted">
            <Link to="/login" className="text-void-accent hover:underline">
              Already have an account?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};


export default Signup;
