import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../hooks/useAuth';
import { parseApiError } from '../../utils/formatters';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await register(form);
      setMessage('Registration successful. Please log in.');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-sky-100 p-4">
      <form className="card w-full max-w-md" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Patient Registration</h1>
        <p className="mt-1 text-sm text-slate-500">Create your account to book appointments online.</p>
        <div className="mt-6 space-y-4">
          <ErrorMessage message={error} />
          {message && <div className="alert-success">{message}</div>}
          {['first_name', 'last_name', 'email', 'password', 'password_confirm'].map((field) => (
            <label key={field} className="label">
              {field.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              <input
                className="input"
                name={field}
                type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={handleChange}
                required
              />
            </label>
          ))}
          <button type="submit" className="btn-primary w-full">Register</button>
          <p className="text-center text-sm">
            Already have an account? <Link to="/" className="text-sky-600">Patient login</Link>
          </p>
          <p className="text-center text-sm">
            <Link to="/" className="text-slate-500">← Back to portal selection</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
