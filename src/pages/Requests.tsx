import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { BookRequest } from '../types';
import { toast } from 'sonner';
import { 
  GitPullRequest, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const Requests: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { socket } = useNotifications();
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ bookTitle: '', customDescription: '' });

  useEffect(() => {
    const q = isAdmin 
      ? query(collection(db, 'requests'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'requests'), where('userUid', '==', user?.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookRequest));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error("Requests onSnapshot error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [isAdmin, user]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const reqData = {
        userUid: user?.uid,
        userName: user?.name,
        bookTitle: newRequest.bookTitle,
        customDescription: newRequest.customDescription,
        type: 'request',
        status: 'pending',
        createdAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, 'requests'), reqData);
      
      // Emit socket event for real-time notification to admin
      if (socket) {
        socket.emit('new-request', {
          id: docRef.id,
          ...reqData
        });
      }

      // Create notification in Firestore for admins
      await addDoc(collection(db, 'notifications'), {
        userUid: 'admin',
        message: `New book request: "${newRequest.bookTitle}" from ${user?.name}`,
        type: 'request',
        isRead: false,
        createdAt: new Date(),
      });

      toast.success('Request submitted successfully!');
      setShowAddModal(false);
      setNewRequest({ bookTitle: '', customDescription: '' });
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected' | 'fulfilled', request: BookRequest) => {
    try {
      await updateDoc(doc(db, 'requests', requestId), { status });
      
      // Emit socket event for real-time notification to user
      if (socket) {
        socket.emit('request-status-update', {
          userUid: request.userUid,
          bookTitle: request.bookTitle,
          status: status
        });
      }

      // Create notification in Firestore for the user
      await addDoc(collection(db, 'notifications'), {
        userUid: request.userUid,
        message: `Your request for "${request.bookTitle}" has been ${status}`,
        type: 'status_update',
        isRead: false,
        createdAt: new Date(),
      });

      toast.success(`Request ${status} successfully!`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-600 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-600 border-red-200';
      case 'fulfilled': return 'bg-blue-100 text-blue-600 border-blue-200';
      default: return 'bg-amber-100 text-amber-600 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={14} />;
      case 'rejected': return <XCircle size={14} />;
      case 'fulfilled': return <Check size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Book Requests</h1>
          <p className="text-slate-500 text-sm">
            {isAdmin ? 'Manage student and teacher book requests' : 'View and track your book requests'}
          </p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>New Request</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading requests...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Book Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested By</th>}
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.length > 0 ? (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{req.bookTitle}</span>
                          {req.customDescription && (
                            <span className="text-xs text-slate-400 line-clamp-1">{req.customDescription}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          req.type === 'borrow' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {req.type || 'request'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <span className="text-slate-600 font-medium">{req.userName}</span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-slate-500 text-sm">{new Date(req.createdAt.toDate()).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                          {getStatusIcon(req.status)}
                          <span className="capitalize">{req.status}</span>
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          {req.status === 'pending' && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'approved', req)}
                                className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'rejected', req)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                          {req.status === 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'fulfilled', req)}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Mark Fulfilled
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 3} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <GitPullRequest className="text-slate-200 mb-4" size={64} />
                        <p className="text-slate-400 font-medium">No book requests found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Request a Book</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Book Title</label>
                <input
                  type="text"
                  required
                  value={newRequest.bookTitle}
                  onChange={(e) => setNewRequest({ ...newRequest, bookTitle: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter book name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Additional Details (Optional)</label>
                <textarea
                  rows={3}
                  value={newRequest.customDescription}
                  onChange={(e) => setNewRequest({ ...newRequest, customDescription: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Author, edition, or why you need it..."
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
