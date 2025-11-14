import React, { useState } from 'react';

interface LoginScreenProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

/**
 * Lightweight login form used to authenticate against Firebase using username and password fields.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onSubmit, loading = false, error = null }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || loading) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(username.trim(), password);
    } catch (error) {
      console.error('Login fehlgeschlagen', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/70 p-8 shadow-2xl backdrop-blur"
      >
        <h1 className="text-center text-2xl font-semibold tracking-wide text-white">Steam Raiders Login</h1>
        <p className="mt-2 text-center text-sm text-gray-300">
          Melde dich mit <span className="font-semibold text-amber-400">admin</span> /{' '}
          <span className="font-semibold text-amber-400">admin</span> an.
        </p>
        <label className="mt-6 block text-sm font-medium text-gray-200" htmlFor="username">
          Benutzername
        </label>
        <input
          id="username"
          name="username"
          type="text"
          className="mt-1 w-full rounded-lg border border-white/10 bg-gray-950/70 px-4 py-2 text-white outline-none focus:border-amber-400"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
        />
        <label className="mt-4 block text-sm font-medium text-gray-200" htmlFor="password">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="mt-1 w-full rounded-lg border border-white/10 bg-gray-950/70 px-4 py-2 text-white outline-none focus:border-amber-400"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || loading}
          className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {(submitting || loading) ? 'Anmeldung läuft …' : 'Einloggen'}
        </button>
      </form>
    </div>
  );
};
