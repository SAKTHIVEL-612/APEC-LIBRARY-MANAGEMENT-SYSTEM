import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { toast } from 'sonner';
import { LogIn, User, Lock, ShieldCheck, Settings } from 'lucide-react';

const Login: React.FC = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedId = id.trim();
      const trimmedPassword = password.trim();
      const email = trimmedId.includes('@') ? trimmedId : `${trimmedId}@college.edu`;
      console.log(`Attempting login for: ${email}`);
      await signInWithEmailAndPassword(auth, email, trimmedPassword);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Failed to login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = 'Invalid ID or password. Please check your credentials or click "Setup Default Accounts" if you haven\'t initialized the system yet.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Invalid password. Please try again.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).';
      } else {
        message = `Login failed: ${error.message}`;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const initializeSystem = async () => {
    setInitializing(true);
    console.log('Starting system initialization...');
    toast.info('Starting setup... Please wait.');
    
    try {
      // Ensure we are signed out before starting
      await auth.signOut();
      
      const usersToCreate = [
        { id: 'admin', name: 'System Admin', role: 'admin', password: 'admin123' },
        { id: 'student101', name: 'John Student', role: 'student', password: 'student123' },
        { id: 'teacher202', name: 'Prof. Teacher', role: 'teacher', password: 'teacher123' }
      ];

      for (const u of usersToCreate) {
        try {
          const email = `${u.id}@college.edu`;
          console.log(`Attempting to create/verify user: ${email}`);
          
          let uid = '';
          try {
            // Try to create in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, u.password);
            uid = userCredential.user.uid;
            console.log(`User created in Auth with UID: ${uid}`);
          } catch (authErr: any) {
            if (authErr.code === 'auth/email-already-in-use') {
              console.log(`${u.id} already exists in Auth, signing in to get UID...`);
              const userCredential = await signInWithEmailAndPassword(auth, email, u.password);
              uid = userCredential.user.uid;
            } else {
              throw authErr;
            }
          }
          
          // Create/Update in Firestore
          await setDoc(doc(db, 'users', uid), {
            uid,
            id: u.id,
            name: u.name,
            email,
            role: u.role,
            isBlocked: false,
            createdAt: new Date()
          }, { merge: true });
          
          console.log(`Firestore document verified for ${u.id}`);
          
          // Sign out to allow next creation
          await auth.signOut();
          console.log(`Signed out after processing ${u.id}`);
          toast.info(`Verified ${u.role}: ${u.id}`);
        } catch (err: any) {
          console.error(`Error during processing of ${u.id}:`, err);
          toast.error(`Failed to setup ${u.id}: ${err.message}`);
        }
      }
      
      console.log('Initialization complete!');
      toast.success('System initialized! You can now login.');
    } catch (error: any) {
      console.error('Initialization error:', error);
      let message = 'Initialization failed: ' + error.message;
      if (error.code === 'auth/operation-not-allowed') {
        message = 'CRITICAL: Email/Password login is DISABLED in Firebase. You MUST enable it in the Firebase Console (Authentication > Sign-in method) for this to work.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      toast.error(message, { duration: 10000 });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <ShieldCheck className="text-orange-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">APEC Library</h1>
          <p className="text-slate-500 mt-2">Sign in to access your library dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Register Number / ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Enter your Register No or ID"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn size={20} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
          <p className="text-xs text-slate-400">
            Contact your librarian if you've forgotten your credentials.
          </p>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-medium">First time here?</p>
            <button
              onClick={initializeSystem}
              disabled={initializing}
              className="w-full py-2 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Settings size={14} />
              <span>{initializing ? 'Setting up...' : 'Setup Default Accounts'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
