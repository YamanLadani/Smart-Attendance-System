import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GraduationCap,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  ArrowRight,
  User,
  BookOpen,
  Shield,
  MailCheck,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserRole } from '@/types';

const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { value: 'student', label: 'Student', icon: User, desc: 'Mark attendance & track progress', color: 'from-blue-500 to-cyan-400' },
  { value: 'teacher', label: 'Teacher', icon: BookOpen, desc: 'Generate QR & manage classes', color: 'from-emerald-500 to-teal-400' },
  { value: 'admin', label: 'Admin', icon: Shield, desc: 'Manage users & settings', color: 'from-amber-500 to-orange-400' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [division, setDivision] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { registerDirect } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !displayName.trim() || !password) {
      toast.error('Please complete your name, email, and password.');
      return;
    }
    try {
      setIsSendingOtp(true);
      const res = await authApi.sendOtp({ email: email.trim(), purpose: 'verification' });
      toast.success(res.data.message || 'OTP sent to your email! ✉️');
      setCountdown(60);
      setStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP to email';
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setIsVerifyingOtp(true);

      // 1. Verify the OTP
      await authApi.verifyOtp({ email: email.trim(), otp: otpCode, purpose: 'verification' });
      toast.success('Email verified successfully! ✅');

      // 2. Complete direct registration with verified email
      await registerDirect({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role: role as UserRole,
        department: department?.trim() || undefined,
        semester: semester ? parseInt(semester, 10) : undefined,
        division: division || undefined,
        rollNumber: rollNumber?.trim() || undefined,
        enrollmentNumber: enrollmentNumber?.trim() || undefined,
        branch: branch?.trim() || undefined,
        employeeId: employeeId?.trim() || undefined,
        designation: designation || undefined,
      });

      toast.success('Registration successful! 🎉');
      navigate(`/${role}/dashboard`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OTP verification or registration failed';
      toast.error(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="glass-card border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">Create Account</CardTitle>
            <CardDescription>
              {step === 1 && 'Step 1 of 4 — Choose your role'}
              {step === 2 && 'Step 2 of 4 — Basic account info'}
              {step === 3 && 'Step 3 of 4 — Academic details'}
              {step === 4 && 'Step 4 of 4 — Verify your email with OTP'}
            </CardDescription>
            {/* Progress */}
            <div className="flex gap-2 pt-3">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-smooth ${
                    s <= step ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {/* Step 1: Role Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  {roles.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => { setRole(r.value); setStep(2); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-smooth text-left ${
                          role === r.value
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:bg-accent'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{r.label}</p>
                          <p className="text-sm text-muted-foreground">{r.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* Step 2: Basic Info */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name *</Label>
                    <Input id="displayName" placeholder="e.g. John Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">College / University Email *</Label>
                    <Input id="reg-email" type="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <p className="text-[11px] text-muted-foreground">A 6-digit OTP will be sent to this email for verification.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical'].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Role-specific fields */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {role === 'student' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Enrollment No.</Label>
                          <Input placeholder="EN123456" value={enrollmentNumber} onChange={(e) => setEnrollmentNumber(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Branch</Label>
                          <Input placeholder="CSE" value={branch} onChange={(e) => setBranch(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Semester *</Label>
                          <Select value={semester} onValueChange={setSemester}>
                            <SelectTrigger><SelectValue placeholder="Sem" /></SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Division</Label>
                          <Select value={division} onValueChange={setDivision}>
                            <SelectTrigger><SelectValue placeholder="Div" /></SelectTrigger>
                            <SelectContent>
                              {['A', 'B', 'C', 'D'].map((d) => (
                                <SelectItem key={d} value={d}>Div {d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Roll No.</Label>
                          <Input placeholder="01" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}

                  {role === 'teacher' && (
                    <>
                      <div className="space-y-2">
                        <Label>Employee ID</Label>
                        <Input placeholder="EMP001" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Designation</Label>
                        <Select value={designation} onValueChange={setDesignation}>
                          <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                          <SelectContent>
                            {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'HOD'].map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {role === 'admin' && (
                    <div className="space-y-4 py-2">
                      <div className="text-center">
                        <Shield className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                        <h3 className="font-semibold text-foreground">Department Administrator</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Administrators manage department rosters, subjects, and analytics. (1 active Admin allowed per department)
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 4: OTP Verification */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5 text-center py-2"
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center text-primary">
                    <MailCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Check Your Email</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      We sent a 6-digit verification code to <strong className="text-foreground">{email}</strong>
                    </p>
                  </div>

                  {/* 6 Digit Inputs */}
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, i) => (
                      <Input
                        key={i}
                        id={`otp-input-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center font-bold text-lg rounded-xl"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>Didn&apos;t receive the code?</span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={countdown > 0 || isSendingOtp}
                      className="text-primary font-semibold hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && step < 4 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}

              {step === 2 && (
                <Button
                  type="button"
                  onClick={() => {
                    if (!displayName || !email || !password || !department) {
                      toast.error('Please fill in all required fields');
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {step === 3 && (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                >
                  {isSendingOtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Email OTP...</>
                  ) : (
                    <>Send Email OTP <MailCheck className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              )}

              {step === 4 && (
                <Button
                  type="button"
                  onClick={handleCompleteRegistration}
                  disabled={isVerifyingOtp || otp.join('').length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 py-5 font-semibold"
                >
                  {isVerifyingOtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying & Registering...</>
                  ) : (
                    'Verify Code & Finish Registration 🎉'
                  )}
                </Button>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
