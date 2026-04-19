import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Book, BookRequest, Transaction } from '../types';
import { 
  BookOpen, 
  Users, 
  GitPullRequest, 
  History, 
  AlertCircle,
  Clock
} from 'lucide-react';

const DashboardCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string; 
  subtitle?: string 
}> = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
      {subtitle && <p className="text-slate-400 text-xs mt-2">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    issuedBooks: 0,
    pendingRequests: 0,
    overdueBooks: 0,
  });
  const [recentRequests, setRecentRequests] = useState<BookRequest[]>([]);
  const [myBorrowedBooks, setMyBorrowedBooks] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (isAdmin) {
        const booksSnap = await getDocs(collection(db, 'books'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const issuedSnap = await getDocs(query(collection(db, 'transactions'), where('status', '==', 'issued')));
        const requestsSnap = await getDocs(query(collection(db, 'requests'), where('status', '==', 'pending')));
        
        setStats({
          totalBooks: booksSnap.size,
          totalUsers: usersSnap.size,
          issuedBooks: issuedSnap.size,
          pendingRequests: requestsSnap.size,
          overdueBooks: issuedSnap.docs.filter(doc => doc.data().dueDate.toDate() < new Date()).length,
        });

        const recentReqsSnap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(5)));
        setRecentRequests(recentReqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookRequest)));
      } else {
        const myIssuedSnap = await getDocs(query(
          collection(db, 'transactions'), 
          where('userUid', '==', user?.uid), 
          where('status', '==', 'issued')
        ));
        setMyBorrowedBooks(myIssuedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));

        const myReqsSnap = await getDocs(query(
          collection(db, 'requests'), 
          where('userUid', '==', user?.uid), 
          orderBy('createdAt', 'desc'), 
          limit(5)
        ));
        setRecentRequests(myReqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookRequest)));
      }
    };

    fetchStats();
  }, [isAdmin, user]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-100">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard title="Total Books" value={stats.totalBooks} icon={BookOpen} color="bg-blue-500" />
          <DashboardCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-purple-500" />
          <DashboardCard title="Issued Books" value={stats.issuedBooks} icon={History} color="bg-orange-500" />
          <DashboardCard title="Pending Requests" value={stats.pendingRequests} icon={GitPullRequest} color="bg-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard title="Borrowed Books" value={myBorrowedBooks.length} icon={BookOpen} color="bg-blue-500" />
          <DashboardCard title="Pending Requests" value={recentRequests.filter(r => r.status === 'pending').length} icon={GitPullRequest} color="bg-amber-500" />
          <DashboardCard title="Due Soon" value={myBorrowedBooks.filter(b => b.dueDate.toDate() < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length} icon={Clock} color="bg-red-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Requests</h2>
            <button className="text-orange-500 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentRequests.length > 0 ? (
              recentRequests.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      req.status === 'approved' ? 'bg-green-100 text-green-600' : 
                      req.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                      'bg-amber-100 text-amber-600'
                    }`}>
                      <GitPullRequest size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{req.bookTitle}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          req.type === 'borrow' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {req.type || 'request'}
                        </span>
                        <p className="text-slate-500 text-xs">{isAdmin ? `By ${req.userName}` : `Status: ${req.status}`}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs">{new Date(req.createdAt.toDate()).toLocaleDateString()}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No recent requests found</div>
            )}
          </div>
        </div>

        {/* Borrowed Books / Overdue */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{isAdmin ? 'Overdue Books' : 'My Borrowed Books'}</h2>
            <button className="text-orange-500 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {!isAdmin ? (
              myBorrowedBooks.length > 0 ? (
                myBorrowedBooks.map((book) => (
                  <div key={book.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{book.bookTitle}</p>
                        <p className="text-slate-500 text-xs">Due: {new Date(book.dueDate.toDate()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {book.dueDate.toDate() < new Date() && (
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center space-x-1">
                        <AlertCircle size={10} />
                        <span>OVERDUE</span>
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">You have no borrowed books</div>
              )
            ) : (
              <div className="p-8 text-center text-slate-400">No overdue books found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
