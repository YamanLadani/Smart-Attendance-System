import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/services/firebase';
import { authApi } from '@/api/endpoints';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithOtp: (email: string, otp: string) => Promise<void>;
  register: (email: string, password: string, data: Record<string, unknown>) => Promise<void>;
  registerDirect: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Map Firebase error codes to user-friendly messages.
 */
function mapFirebaseError(error: unknown): string {
  const err = error as { code?: string; message?: string };
  switch (err.code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Please register first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';
    default:
      return err.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Extract error message from API response.
 */
function mapApiError(error: unknown): string {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || err.message || 'Request failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    // Check for stored app token first (backend JWT is always primary)
    const appToken = localStorage.getItem('appToken') || localStorage.getItem('firebaseToken');
    if (appToken) {
      setToken(appToken);
      authApi.getProfile()
        .then((response) => {
          if (response.data.data?.user) {
            setUser(response.data.data.user);
            localStorage.setItem('userRole', response.data.data.user.role);
          }
        })
        .catch(() => {
          localStorage.removeItem('appToken');
          localStorage.removeItem('firebaseToken');
          localStorage.removeItem('userRole');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      // Only use Firebase session if no custom appToken is stored
      if (fbUser && !localStorage.getItem('appToken')) {
        try {
          const idToken = await fbUser.getIdToken();
          localStorage.setItem('firebaseToken', idToken);
          setToken(idToken);
          const response = await authApi.getProfile();
          if (response.data.data?.user) {
            setUser(response.data.data.user);
            localStorage.setItem('userRole', response.data.data.user.role);
          }
        } catch {
          // Ignored
        }
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Login with Firebase (email + password through Firebase).
   */
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // Try direct backend login first
      try {
        const response = await authApi.loginWithPassword({ email, password });
        if (response.data.data) {
          const appToken = response.data.data.token;
          localStorage.setItem('appToken', appToken);
          localStorage.setItem('firebaseToken', appToken); // Also set as firebaseToken for API client
          setToken(appToken);
          setUser(response.data.data.user);
          localStorage.setItem('userRole', response.data.data.user.role);
          return;
        }
      } catch (apiErr) {
        const apiError = apiErr as { response?: { status?: number; data?: { message?: string } } };
        // If user doesn't have a password hash (Firebase-only user), fall through to Firebase login
        if (apiError.response?.status !== 401 ||
            !apiError.response?.data?.message?.includes('Google or Firebase')) {
          // It's a real error (wrong password, disabled, etc.)
          throw new Error(apiError.response?.data?.message || 'Login failed');
        }
        // Fall through to Firebase login
      }

      // Fallback: Firebase login
      if (isFirebaseConfigured) {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        localStorage.setItem('firebaseToken', idToken);
        setToken(idToken);

        // Sync with backend
        const response = await authApi.login({
          firebaseUid: credential.user.uid,
          email,
        });

        if (response.data.data) {
          setUser(response.data.data.user);
          localStorage.setItem('userRole', response.data.data.user.role);
        }
      } else {
        throw new Error('Invalid email or password.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : mapFirebaseError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with direct email + password (no Firebase).
   */
  const loginWithPassword = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authApi.loginWithPassword({ email, password });

      if (response.data.data) {
        const appToken = response.data.data.token;
        localStorage.setItem('appToken', appToken);
        localStorage.setItem('firebaseToken', appToken);
        setToken(appToken);
        setUser(response.data.data.user);
        localStorage.setItem('userRole', response.data.data.user.role);
      }
    } catch (err: unknown) {
      const message = mapApiError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with Email OTP.
   */
  const loginWithOtp = async (email: string, otp: string) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authApi.loginWithOtp({ email, otp });

      if (response.data.data) {
        const appToken = response.data.data.token;
        localStorage.setItem('appToken', appToken);
        localStorage.setItem('firebaseToken', appToken);
        setToken(appToken);
        setUser(response.data.data.user);
        localStorage.setItem('userRole', response.data.data.user.role);
      }
    } catch (err: unknown) {
      const message = mapApiError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register with Firebase + backend (legacy flow).
   */
  const register = async (email: string, password: string, data: Record<string, unknown>) => {
    try {
      setError(null);
      setLoading(true);

      let firebaseUid: string;
      let idToken: string;

      if (isFirebaseConfigured) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUid = credential.user.uid;
          idToken = await credential.user.getIdToken();
          try { await sendEmailVerification(credential.user); } catch { /* ignore */ }
        } catch (fbErr: unknown) {
          const fbError = fbErr as { code?: string };
          if (fbError.code === 'auth/email-already-in-use') {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            firebaseUid = credential.user.uid;
            idToken = await credential.user.getIdToken();
          } else {
            throw new Error(mapFirebaseError(fbErr));
          }
        }
      } else {
        firebaseUid = '';
        idToken = '';
      }

      // Register in backend (creates DB user + hashes password)
      const response = await authApi.register({
        ...data,
        firebaseUid: firebaseUid || undefined,
        email,
        password, // Backend will hash it
      });

      if (response.data.data) {
        const appToken = response.data.data.token;
        localStorage.setItem('appToken', appToken);
        localStorage.setItem('firebaseToken', idToken || appToken);
        setToken(idToken || appToken);
        setUser(response.data.data.user);
        localStorage.setItem('userRole', response.data.data.user.role);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : mapApiError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register directly with backend (no Firebase, with password).
   */
  const registerDirect = async (data: Record<string, unknown>) => {
    try {
      setError(null);
      setLoading(true);

      const response = await authApi.register(data);

      if (response.data.data) {
        const appToken = response.data.data.token;
        localStorage.setItem('appToken', appToken);
        localStorage.setItem('firebaseToken', appToken);
        setToken(appToken);
        setUser(response.data.data.user);
        localStorage.setItem('userRole', response.data.data.user.role);
      }
    } catch (err: unknown) {
      const message = mapApiError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('appToken');
      localStorage.removeItem('userRole');
      setToken(null);
      setUser(null);
      setFirebaseUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      if (isFirebaseConfigured) {
        await sendPasswordResetEmail(auth, email);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : mapFirebaseError(err);
      setError(message);
      throw new Error(message);
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await authApi.getProfile();
      if (response.data.data) {
        setUser(response.data.data.user);
      }
    } catch {
      // Silently fail
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        token,
        loading,
        error,
        login,
        loginWithPassword,
        loginWithOtp,
        register,
        registerDirect,
        logout,
        resetPassword,
        clearError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
