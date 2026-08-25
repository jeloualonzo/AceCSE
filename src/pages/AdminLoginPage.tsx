import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { authErrorMessage } from '@/lib/authErrors';

const inputClasses =
  'w-full min-h-[46px] px-3.5 rounded-lg border border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-colors';

const labelClasses = 'block text-xs font-semibold text-slate-300 mb-1.5 text-left';

/**
 * Admin sign-in — its own page, deliberately narrow.
 *
 * Email and password only. There is no Google button and no sign-up form: admin
 * accounts are created out-of-band with `npm run admin:create`, and the account
 * only becomes an admin when the `admin` custom claim is minted server-side. A
 * form here could never grant that, so offering one would be theatre.
 *
 * Nothing on this page is a security boundary. Anyone may load it and sign in
 * with any AceCSE account; what they reach afterward is decided by `RequireAdmin`
 * reading the claim off the signed token, and by `firestore.rules` checking the
 * same claim on every read and write.
 */
export const AdminLoginPage: React.FC = () => {
  useDocumentTitle('Admin Sign In');
  const { signInWithEmail, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmail(email.trim(), password);
      // No navigate() here: `RedirectWhenAuthed` guards this page and sends the
      // signed-in user to the admin app (or their captured deep link) as soon as
      // the claim resolves. One redirect decision, in one place.
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    const address = email.trim();
    if (!address) {
      setError('Enter the admin email address first.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resetPassword(address);
      // Deliberately not "we sent an email": Firebase does not reveal whether an
      // account exists, so claiming delivery would be a guess.
      setNotice(`If ${address} has an AceCSE account, a password reset link is on its way.`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3">
          <BrandMark className="h-10 w-10" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Ace<span className="text-emerald-400">CSE</span>
          </span>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg sm:p-8">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Admin</span>
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-white">Sign in to the admin app</h1>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className={labelClasses} htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClasses}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className={labelClasses} htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClasses}
                placeholder="Your admin password"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-xs font-semibold text-red-300"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5 text-xs font-semibold text-emerald-300"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] cursor-pointer rounded-lg bg-emerald-600 text-sm font-bold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={sendReset}
              disabled={busy}
              className="min-h-11 w-full cursor-pointer rounded-lg text-xs font-semibold text-slate-400 transition-colors hover:text-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Forgot the admin password?
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-xs leading-relaxed text-slate-400">
              Admin accounts are not created here. An existing admin runs{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-[11px] text-slate-200">
                npm run admin:create
              </code>{' '}
              and the account gains access only once the <span className="font-semibold">admin</span>{' '}
              claim is minted on it. See docs/admin/ADMIN_ACCESS.md.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Studying for the exam?{' '}
          <Link
            to="/auth"
            className="rounded font-semibold text-emerald-400 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Sign in to the learner app
          </Link>
        </p>
      </div>
    </main>
  );
};

export default AdminLoginPage;
