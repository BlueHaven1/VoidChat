import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();


  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // No navigation here, useEffect handles it
    } catch (err) {
      let errorMessage = 'Failed to log in.';
      if (err.message.includes('user-not-found')) {
        errorMessage = 'User not found.';
      } else if (err.message.includes('wrong-password')) {
        errorMessage = 'Incorrect password.';
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
    <div className='flex items-center justify-center min-h-screen bg-void-bg'>
      <div className='w-full max-w-lg p-8 rounded shadow-2xl bg-void-panel'>
        <div className='mb-8 text-center'>
          <div className='flex justify-center mb-4'>
            <MessageSquare className='w-12 h-12 text-void-accent' />
          </div>
          <h1 className='mb-2 text-2xl font-bold text-white'>Welcome back!</h1>
          <p className='text-void-text-muted'>We're so excited to see you again!</p>
        </div>

        {error && (
          <div className='flex items-center p-3 mb-4 text-sm text-red-500 rounded bg-red-500/10 border border-red-500/20'>
            <AlertCircle className='w-4 h-4 mr-2' />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block mb-2 text-xs font-bold uppercase text-void-text-muted' htmlFor='email'>
              Email Address
            </label>
            <input
              className='w-full p-3 transition duration-200 rounded bg-void-element text-void-text focus:outline-none focus:ring-2 focus:ring-void-accent'
              type='email'
              id='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className='mb-8'>
            <label className='block mb-2 text-xs font-bold uppercase text-void-text-muted' htmlFor='password'>
              Password
            </label>
            <input
              className='w-full p-3 transition duration-200 rounded bg-void-element text-void-text focus:outline-none focus:ring-2 focus:ring-void-accent'
              type='password'
              id='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className='mt-2 text-sm text-void-accent hover:underline cursor-pointer'>
              Forgot your password?
            </div>
          </div>

          <button
            className='w-full py-3 mb-4 font-bold text-white transition duration-200 rounded bg-void-accent hover:bg-void-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center'
            type='submit'
            disabled={loading}
          >
             {loading ? <Loader2 className='w-5 h-5 animate-spin' /> : 'Log In'}
          </button>

          <div className='text-sm text-void-text-muted'>
            Need an account?{' '}
            <Link to='/signup' className='text-void-accent hover:underline'>
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
