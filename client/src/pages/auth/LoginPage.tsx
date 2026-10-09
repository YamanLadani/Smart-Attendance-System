import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  KeyRound,
  MailCheck,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // OTP Login States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  // 1. Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);
      await login(trimmedEmail, password);
      toast.success('Signed in successfully! 🎉');

      setTimeout(() => {
        const storedRole = localStorage.getItem('userRole');
        const role = storedRole || 'student';
        navigate(`/${role}/dashboard`, { replace: true });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Send Login OTP
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Please enter your registered college email');
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await authApi.sendOtp({ email: trimmedEmail, purpose: 'login' });
      toast.success(res.data.message || 'Login OTP sent to your email! ✉️');
      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP to email';
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 3. Verify Login OTP & Sign In
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`login-otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`login-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const otpCode = otp.join('');

    if (!trimmedEmail) {
      toast.error('Email is required');
      return;
    }

    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
      await loginWithOtp(trimmedEmail, otpCode);
      toast.success('Signed in successfully via OTP! 🎉');

      setTimeout(() => {
        const storedRole = localStorage.getItem('userRole');
        const role = storedRole || 'student';
        navigate(`/${role}/dashboard`, { replace: true });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        toast.info('Google Sign-In requires GOOGLE_CLIENT_ID to be set in .env.');
        return;
      }
      toast.info('Initiating Google Sign-In...');
    } catch {
      toast.error('Google Sign-In failed. Please use email and password.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-0 shadow-2xl">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">Welcome Back</CardTitle>
            <CardDescription className="text-xs">Sign in to your Smart Attendance account</CardDescription>

            {/* Segmented Mode Selector: Password vs Email OTP */}
            <div className="flex bg-secondary/80 p-1 rounded-xl mt-3 border border-border">
              <button
                type="button"
                onClick={() => setAuthMode('password')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'password'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-primary" /> Password
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('otp')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'otp'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MailCheck className="w-3.5 h-3.5 text-emerald-500" /> Email OTP
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {/* ─── TAB 1: PASSWORD LOGIN ─── */}
              {authMode === 'password' && (
                <motion.form
                  key="password-mode"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handlePasswordSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">College Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-10 text-xs"
                        disabled={isLoading || isGoogleLoading}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-10 text-xs"
                        disabled={isLoading || isGoogleLoading}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Link to="/register" className="text-primary hover:underline font-medium">
                      Create account
                    </Link>
                    <Link to="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 h-10 font-semibold"
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </motion.form>
              )}

              {/* ─── TAB 2: EMAIL OTP LOGIN ─── */}
              {authMode === 'otp' && (
                <motion.div
                  key="otp-mode"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="otp-email" className="text-xs font-medium">Registered College Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="otp-email"
                        type="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-10 text-xs"
                        disabled={isSendingOtp || isLoading}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <Button
                      type="button"
                      onClick={() => handleSendLoginOtp()}
                      disabled={isSendingOtp || !email.trim()}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 h-10 font-semibold mt-2"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Email OTP...
                        </>
                      ) : (
                        <>
                          <MailCheck className="mr-2 h-4 w-4" /> Send Login OTP
                        </>
                      )}
                    </Button>
                  ) : (
                    <form onSubmit={handleOtpSubmit} className="space-y-4 pt-1">
                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-center">
                        <p className="text-xs text-foreground font-semibold flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> OTP Sent to Your Email
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Enter the 6-digit code sent to <strong className="text-foreground">{email}</strong>
                        </p>
                      </div>

                      {/* 6 Digit Inputs */}
                      <div className="flex justify-center gap-2 pt-1">
                        {otp.map((digit, i) => (
                          <Input
                            key={i}
                            id={`login-otp-input-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className="w-11 h-12 text-center font-bold text-lg rounded-xl"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); }}
                          className="hover:underline text-muted-foreground"
                        >
                          Change Email
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendLoginOtp()}
                          disabled={countdown > 0 || isSendingOtp}
                          className="text-primary font-semibold hover:underline disabled:opacity-50 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || otp.join('').length !== 6}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 h-10 font-semibold"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying OTP...
                          </>
                        ) : (
                          'Sign In with OTP'
                        )}
                      </Button>
                    </form>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Link to="/register" className="text-primary hover:underline font-medium">
                      Create account
                    </Link>
                    <Link to="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground text-[10px]">or continue with</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 h-10 text-xs"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
