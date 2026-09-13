import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../../store/useEventStore';
import type { UserProfile } from '../../types';

export function AuthPage() {
  const navigate = useNavigate();
  const login = useEventStore(s => s.login);
  const logout = useEventStore(s => s.logout);
  const currentUser = useEventStore(s => s.currentUser);

  // Active tab: 'login' or 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('alex@event.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Organizer Security Verification Modal state
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [organizerPin, setOrganizerPin] = useState('OPS-ADMIN-2026');
  const [pendingOrganizerUser, setPendingOrganizerUser] = useState<UserProfile | null>(null);

  // Signup Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<'attendee' | 'organizer' | 'mentor'>('attendee');
  const [signupInterests, setSignupInterests] = useState<string[]>(['ai', 'hackathon']);
  const [signupError, setSignupError] = useState<string | null>(null);

  const INTEREST_OPTIONS = [
    { id: 'ai', label: 'AI & Machine Learning' },
    { id: 'hackathon', label: 'Hackathon Track' },
    { id: 'developers', label: 'Developer APIs' },
    { id: 'startups', label: 'Startups & Demos' },
    { id: 'hardware', label: 'Hardware Lab' },
    { id: 'networking', label: 'Networking Lounge' },
  ];

  function toggleInterest(id: string) {
    setSignupInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  // Pre-fill credentials helper
  function fillCredentials(role: 'attendee' | 'organizer') {
    if (role === 'attendee') {
      setLoginEmail('alex@event.com');
      setLoginPassword('password123');
    } else {
      setLoginEmail('sarah@event.com');
      setLoginPassword('password123');
    }
  }

  // Handle Login Submit
  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);

    const emailLower = loginEmail.toLowerCase().trim();

    // If organizer email, trigger verification modal
    if (emailLower.includes('sarah') || emailLower.includes('organizer') || emailLower.includes('admin')) {
      const user: UserProfile = {
        id: 'user-sarah',
        name: 'Sarah',
        email: loginEmail,
        role: 'organizer',
        interests: ['operations', 'safety', 'schedule'],
      };
      setPendingOrganizerUser(user);
      setShowOrganizerModal(true);
      return;
    }

    // Otherwise standard Attendee login
    const nameFromEmail = emailLower.includes('alex')
      ? 'Alex'
      : emailLower.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Attendee';

    const user: UserProfile = {
      id: `user-${Date.now()}`,
      name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
      email: loginEmail,
      role: 'attendee',
      interests: ['ai', 'agents', 'hackathon'],
    };
    login(user);
    navigate('/attendee');
  }

  // Confirm Organizer Access
  function handleConfirmOrganizerAccess() {
    if (!organizerPin.trim()) return;
    const user = pendingOrganizerUser || {
      id: 'user-sarah',
      name: 'Sarah',
      email: loginEmail,
      role: 'organizer',
      interests: ['operations', 'safety', 'schedule'],
    };
    login(user);
    setShowOrganizerModal(false);
    navigate('/organizer');
  }

  // Handle Signup Submit
  function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match. Please verify.');
      return;
    }

    const finalName = signupName.trim() || 'New Participant';
    const user: UserProfile = {
      id: `user-${Date.now()}`,
      name: finalName,
      email: signupEmail,
      role: signupRole,
      interests: signupInterests.length > 0 ? signupInterests : ['ai'],
    };

    if (signupRole === 'organizer') {
      setPendingOrganizerUser(user);
      setShowOrganizerModal(true);
      return;
    }

    login(user);
    navigate('/attendee');
  }

  function handleLogoutNow() {
    logout();
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-36 -left-36 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md flex flex-col items-center gap-5 relative z-10 animate-fadeIn">
        {/* Animated Brand Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 group">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500 animate-pulse" />
            <div className="relative w-20 h-20 bg-paper rounded-2xl border border-hairline shadow-card flex items-center justify-center p-2.5 transform transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="MILO Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
          </div>

          <span className="text-[10px] font-extrabold uppercase tracking-widest text-midGray">
            Smart Event Operating System
          </span>
          <h1 className="text-3xl font-black tracking-tight text-ink mt-0.5">
            MILO
          </h1>
          <p className="text-xs text-midGray max-w-xs mt-1">
            Real-Time Autonomous Schedule Adaptation &middot; Telemetry &middot; Navigation
          </p>
        </div>

        {/* Auth Box Container */}
        <div className="w-full bg-paper rounded-card border border-hairline shadow-card p-6 flex flex-col gap-4">
          {/* Top Segmented Tabs: Log In | Sign Up */}
          <div className="flex rounded-nested bg-canvas p-1 border border-hairline text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 rounded-nested transition-all ${
                activeTab === 'login'
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-midGray hover:text-ink'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 rounded-nested transition-all ${
                activeTab === 'signup'
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-midGray hover:text-ink'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* ─── TAB 1: LOG IN ─────────────────────────────────────── */}
          {activeTab === 'login' && (
            <div className="flex flex-col gap-3">
              {/* Quick credential filler for testing/presenting */}
              <div className="flex items-center justify-between text-xs bg-canvas p-2 rounded-nested border border-hairline">
                <span className="text-midGray text-[11px] font-medium">Select Credentials:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillCredentials('attendee')}
                    className={`text-[11px] px-2.5 py-1 rounded-pill font-semibold border transition-colors ${
                      loginEmail.includes('alex')
                        ? 'bg-inkSoft text-paper border-inkSoft'
                        : 'bg-paper text-ink border-hairline hover:bg-hairline'
                    }`}
                  >
                    Alex (Attendee)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('organizer')}
                    className={`text-[11px] px-2.5 py-1 rounded-pill font-semibold border transition-colors ${
                      loginEmail.includes('sarah')
                        ? 'bg-inkSoft text-paper border-inkSoft'
                        : 'bg-paper text-ink border-hairline hover:bg-hairline'
                    }`}
                  >
                    Sarah (Organizer)
                  </button>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <label htmlFor="login-email" className="text-xs font-semibold text-ink">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="alex@event.com"
                    aria-label="Email Address"
                    className="w-full text-xs bg-canvas rounded-nested border border-hairline px-3.5 py-2.5 text-ink placeholder-midGray focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="login-password" className="text-xs font-semibold text-ink">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    aria-label="Password"
                    className="w-full text-xs bg-canvas rounded-nested border border-hairline px-3.5 py-2.5 text-ink placeholder-midGray focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-red-600">{loginError}</p>
                )}

                <button
                  type="submit"
                  className="mt-2 w-full py-2.5 rounded-pill bg-inkSoft text-paper font-semibold text-xs shadow-sm hover:bg-ink transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Sign In</span>
                  <span>&rarr;</span>
                </button>
              </form>
            </div>
          )}

          {/* ─── TAB 2: SIGN UP ────────────────────────────────────── */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="signup-name" className="text-xs font-semibold text-ink">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  aria-label="Full Name"
                  className="w-full text-xs bg-canvas rounded-nested border border-hairline px-3.5 py-2 text-ink placeholder-midGray focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="signup-email" className="text-xs font-semibold text-ink">Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder="alex@event.com"
                  aria-label="Email Address"
                  className="w-full text-xs bg-canvas rounded-nested border border-hairline px-3.5 py-2 text-ink placeholder-midGray focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="signup-password" className="text-xs font-semibold text-ink">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    aria-label="Password"
                    className="w-full text-xs bg-canvas rounded-nested border border-hairline px-3 py-2 text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="signup-confirm-password" className="text-xs font-semibold text-ink">Confirm</label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={e => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    aria-label="Confirm Password"
                    className="w-full text-xs bg-canvas rounded-nested border border-hairline px-3 py-2 text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink">Role at Event</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'attendee', label: 'Attendee' },
                    { id: 'organizer', label: 'Organizer' },
                    { id: 'mentor', label: 'Mentor' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSignupRole(r.id as typeof signupRole)}
                      className={`text-[11px] py-1.5 rounded-nested font-medium border transition-colors ${
                        signupRole === r.id
                          ? 'bg-inkSoft text-paper border-inkSoft font-semibold'
                          : 'bg-canvas text-midGray border-hairline hover:text-ink'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink">Topics &amp; Tracks</label>
                <div className="flex flex-wrap gap-1">
                  {INTEREST_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInterest(opt.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-pill border transition-colors ${
                        signupInterests.includes(opt.id)
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                          : 'bg-canvas text-midGray border-hairline hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {signupError && (
                <p className="text-xs text-red-600">{signupError}</p>
              )}

              <button
                type="submit"
                className="mt-2 w-full py-2.5 rounded-pill bg-inkSoft text-paper font-semibold text-xs shadow-sm hover:bg-ink transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Create Account &amp; Get Started</span>
                <span>&rarr;</span>
              </button>
            </form>
          )}

          {/* Active Session Status & Log Out Option */}
          {currentUser && (
            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-midGray text-[11px]">Currently logged in:</span>
                <span className="font-semibold text-ink">{currentUser.name} ({currentUser.role})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogoutNow}
                  className="px-2.5 py-1 rounded-pill bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold transition-colors"
                >
                  Log Out
                </button>
                <button
                  type="button"
                  onClick={() => navigate(currentUser.role === 'organizer' ? '/organizer' : '/attendee')}
                  className="px-2.5 py-1 rounded-pill bg-inkSoft text-paper hover:bg-ink text-xs font-semibold transition-colors"
                >
                  Resume &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. ORGANIZER VERIFICATION MODAL ───────────────────────── */}
        {showOrganizerModal && (
          <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-paper rounded-card border border-hairline shadow-card p-6 max-w-sm w-full flex flex-col gap-4 animate-scaleIn">
              <div className="flex items-center gap-2 text-amber-600">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base font-bold text-ink">Organizer Verification</h3>
              </div>

              <p className="text-xs text-midGray">
                You are accessing the <strong>Organizer Command Center</strong> as {pendingOrganizerUser?.name || 'Sarah'}. Please verify your operations passcode:
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="organizer-passcode" className="text-[11px] font-semibold text-ink">Operations Security Passcode</label>
                <input
                  id="organizer-passcode"
                  type="text"
                  value={organizerPin}
                  onChange={e => setOrganizerPin(e.target.value)}
                  placeholder="OPS-ADMIN-2026"
                  aria-label="Operations Security Passcode"
                  className="w-full text-xs font-mono tracking-wider bg-canvas rounded-nested border border-hairline px-3 py-2 text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-inkSoft"
                />
                <span className="text-[10px] text-green-700">✓ Passcode verified: OPS-ADMIN-2026</span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowOrganizerModal(false)}
                  className="flex-1 py-2 rounded-pill bg-canvas text-midGray hover:text-ink text-xs font-medium border border-hairline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOrganizerAccess}
                  className="flex-1 py-2 rounded-pill bg-inkSoft text-paper hover:bg-ink text-xs font-semibold shadow-sm"
                >
                  Enter Command Booth &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-[11px] text-midGray text-center">
          100% Deterministic &middot; Zero External API Keys &middot; Offline PWA Capable
        </p>
      </main>
    </div>
  );
}
