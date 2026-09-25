import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Shirt, User, Mail, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth, db, appId, ADMIN_ACCESS_CODE } from '../config/firebase';
import { ToastContainer } from './ui/UIComponents';
import { getFriendlyErrorMessage } from '../utils/helpers';

function Input({ icon: Icon, type = 'text', placeholder, value, onChange, right }) {
  return (
    <div className="relative flex items-center">
      {Icon && <Icon size={17} className="absolute left-3.5 pointer-events-none text-fg-subtle" />}
      <input
        type={type}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
        className={`ui-input ${Icon ? 'pl-10' : ''} ${right ? 'pr-12' : ''}`}
      />
      {right && <div className="absolute right-3.5 flex">{right}</div>}
    </div>
  );
}

export default function Auth() {
  const [isLoginView, setIsLoginView]   = useState(true);
  const [authName, setAuthName]         = useState('');
  const [authEmail, setAuthEmail]       = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCode, setAuthCode]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts]             = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleAuth = async (e) => {
    e.preventDefault();
    const email = authEmail.trim();
    if (!isLoginView && !authName.trim()) { showToast('Name is required', 'error'); return; }
    if (!email || !authPassword) { showToast('Email and password are required', 'error'); return; }
    if (!isLoginView && authCode !== ADMIN_ACCESS_CODE) { showToast('Invalid Admin Access Code', 'error'); return; }

    setIsSubmitting(true);
    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, authPassword);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, authPassword);
        await setDoc(doc(db, `artifacts/${appId}/users/${cred.user.uid}/account/info`), {
          name: authName.trim(), email, joinedAt: serverTimestamp()
        });
      }
    } catch (err) {
      showToast(getFriendlyErrorMessage(err.code), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-viewport flex flex-col items-center overlay-safe bg-base">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="ui-card my-auto w-full max-w-md p-6 sm:p-8 rounded-modal">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4 bg-accent/15 text-accent">
            <Shirt size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">Sales Master</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mt-1 text-fg-subtle">Retail Management System</p>
        </div>

        {/* Toggle tabs */}
        <div className="flex mb-6 rounded-lg p-1 bg-base border border-line">
          {['Login', 'Sign Up'].map((label, i) => {
            const active = isLoginView === (i === 0);
            return (
              <button
                key={label}
                onClick={() => setIsLoginView(i === 0)}
                aria-pressed={active}
                className={`flex-1 min-h-[2.5rem] rounded-md text-sm font-semibold transition-colors duration-150 ${active ? 'bg-elevated text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          {!isLoginView && (
            <Input icon={User} placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} />
          )}
          <Input icon={Mail} type="email" placeholder="Email address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          <Input
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
            right={
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="p-2 -m-2 rounded-md text-fg-subtle hover:text-fg">
                {showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
              </button>
            }
          />
          {!isLoginView && (
            <Input icon={ShieldCheck} placeholder="Admin Access Code" value={authCode} onChange={e => setAuthCode(e.target.value)} />
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn-primary w-full min-h-[2.75rem] mt-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={18}/> : (isLoginView ? 'Login' : 'Create Account')}
          </button>
        </form>

        <button
          onClick={() => setIsLoginView(!isLoginView)}
          className="w-full text-center mt-4 py-2 text-sm font-semibold text-accent hover:underline underline-offset-4"
        >
          {isLoginView ? 'Create a new account →' : '← Back to login'}
        </button>
      </div>
    </div>
  );
}