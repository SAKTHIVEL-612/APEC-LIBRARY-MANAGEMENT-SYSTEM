import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { useAuth } from '../contexts/AuthContext';
import { User as UserType } from '../types';
import { toast } from 'sonner';
import { 
  Users as UsersIcon, 
  Search, 
  Shield, 
  UserCheck, 
  UserX, 
  MoreVertical,
  Trash2,
  Mail,
  Calendar,
  Loader2,
  Plus,
  X,
  UserPlus
} from 'lucide-react';

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    id: '',
    name: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
    password: ''
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserType));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Users onSnapshot error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      // 1. Create secondary app to create user without logging out admin
      const secondaryApp = getApps().find(app => app.name === "SecondaryApp") || initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      const internalEmail = `${newUserData.id}@college.edu`;
      
      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, internalEmail, newUserData.password);
      const newUserUid = userCredential.user.uid;

      // 3. Create user document in Firestore
      const newUser: UserType = {
        uid: newUserUid,
        id: newUserData.id,
        name: newUserData.name,
        email: internalEmail,
        role: newUserData.role,
        isBlocked: false,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', newUserUid), newUser);

      // 4. Cleanup secondary app
      await signOut(secondaryAuth);
      // Note: Firebase doesn't have a direct "deleteApp" that's easy to use here, 
      // but creating it multiple times might cause issues. 
      // In a real app, you'd manage this better, but for this context it works.

      toast.success('User created successfully!');
      setShowAddModal(false);
      setNewUserData({ id: '', name: '', role: 'student', password: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleBlock = async (user: UserType) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBlocked: !user.isBlocked
      });
      toast.success(`User ${user.isBlocked ? 'unblocked' : 'blocked'} successfully!`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleUpdateRole = async (user: UserType, newRole: 'admin' | 'student' | 'teacher') => {
    if (user.uid === currentUser?.uid) {
      toast.error('You cannot change your own role');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole
      });
      toast.success(`User role updated to ${newRole}!`);
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">Manage student, teacher, and admin accounts</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>Add User</span>
          </button>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <UsersIcon size={20} className="text-orange-500" />
            <span className="font-bold text-slate-900">{users.length}</span>
            <span className="text-slate-400 text-sm font-medium">Total Users</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, ID or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading users...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID / Register No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {u.id || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u, e.target.value as any)}
                        disabled={u.uid === currentUser?.uid}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none transition-all ${
                          u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {u.isBlocked ? <UserX size={14} /> : <UserCheck size={14} />}
                        <span>{u.isBlocked ? 'Blocked' : 'Active'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleBlock(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isBlocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                          title={u.isBlocked ? 'Unblock User' : 'Block User'}
                        >
                          {u.isBlocked ? <UserCheck size={18} /> : <UserX size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <UserPlus className="text-orange-500" size={24} />
                <h2 className="text-xl font-bold text-slate-900">Add New User</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Register No / ID</label>
                <input
                  type="text"
                  required
                  value={newUserData.id}
                  onChange={(e) => setNewUserData({...newUserData, id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. STU123 or TEA456"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value as any})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-orange-200"
                >
                  {adding ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <UserPlus size={20} />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
