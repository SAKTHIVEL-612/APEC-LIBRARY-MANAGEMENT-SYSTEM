import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, where, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Book, User } from '../types';
import { toast } from 'sonner';
import { 
  History, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const Transactions: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueData, setIssueData] = useState({ userEmail: '', bookIsbn: '', loanDays: 14 });
  const [settings, setSettings] = useState({ finePerDay: 10 });

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsSnap = await getDoc(doc(db, 'settings', 'config'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as any);
      }
    };
    fetchSettings();

    const q = isAdmin 
      ? query(collection(db, 'transactions'), orderBy('issueDate', 'desc'))
      : query(collection(db, 'transactions'), where('userUid', '==', user?.uid), orderBy('issueDate', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(transData);
      setLoading(false);
    }, (error) => {
      console.error("Transactions onSnapshot error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [isAdmin, user]);

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Find user by email
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', issueData.userEmail)));
      if (usersSnap.empty) {
        toast.error('User not found');
        return;
      }
      const targetUser = { ...usersSnap.docs[0].data() } as User;
      if (targetUser.isBlocked) {
        toast.error('User is blocked from borrowing');
        return;
      }

      // Check borrowing limit
      const currentIssuedSnap = await getDocs(query(
        collection(db, 'transactions'), 
        where('userUid', '==', targetUser.uid), 
        where('status', '==', 'issued')
      ));
      
      if (currentIssuedSnap.size >= settings.maxBooksPerUser) {
        toast.error(`Borrowing limit reached! User can borrow max ${settings.maxBooksPerUser} books.`);
        return;
      }

      // 2. Find book by ISBN
      const booksSnap = await getDocs(query(collection(db, 'books'), where('isbn', '==', issueData.bookIsbn)));
      if (booksSnap.empty) {
        toast.error('Book not found');
        return;
      }
      const targetBook = { id: booksSnap.docs[0].id, ...booksSnap.docs[0].data() } as Book;
      if (targetBook.quantityAvailable <= 0) {
        toast.error('Book is out of stock');
        return;
      }

      // 3. Create transaction
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(issueDate.getDate() + issueData.loanDays);

      await addDoc(collection(db, 'transactions'), {
        userUid: targetUser.uid,
        userName: targetUser.name,
        bookId: targetBook.id,
        bookTitle: targetBook.title,
        issueDate,
        dueDate,
        status: 'issued',
      });

      // 4. Update book availability
      await updateDoc(doc(db, 'books', targetBook.id), {
        quantityAvailable: targetBook.quantityAvailable - 1
      });

      // 5. Create notification for user
      await addDoc(collection(db, 'notifications'), {
        userUid: targetUser.uid,
        message: `Book "${targetBook.title}" has been issued to you. Due date: ${format(dueDate, 'PP')}`,
        type: 'issue',
        isRead: false,
        createdAt: new Date(),
      });

      toast.success('Book issued successfully!');
      setShowIssueModal(false);
      setIssueData({ userEmail: '', bookIsbn: '', loanDays: 14 });
    } catch (error) {
      toast.error('Failed to issue book');
    }
  };

  const handleReturnBook = async (transaction: Transaction) => {
    try {
      const returnDate = new Date();
      const dueDate = transaction.dueDate.toDate();
      let fineAmount = 0;

      if (returnDate > dueDate) {
        const daysLate = differenceInDays(returnDate, dueDate);
        fineAmount = daysLate * settings.finePerDay;
      }

      await updateDoc(doc(db, 'transactions', transaction.id), {
        returnDate,
        fineAmount,
        status: 'returned',
      });

      // Update book availability
      const bookSnap = await getDoc(doc(db, 'books', transaction.bookId));
      if (bookSnap.exists()) {
        await updateDoc(doc(db, 'books', transaction.bookId), {
          quantityAvailable: bookSnap.data().quantityAvailable + 1
        });
      }

      toast.success(`Book returned successfully! ${fineAmount > 0 ? `Fine: ₹${fineAmount}` : ''}`);
    } catch (error) {
      toast.error('Failed to return book');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm">Track book issues, returns, and history</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>Issue Book</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading transactions...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Book & User</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fine</th>
                  {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.length > 0 ? (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{t.bookTitle}</span>
                          <span className="text-xs text-slate-400">{isAdmin ? `Issued to: ${t.userName}` : 'Borrowed'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {format(t.issueDate.toDate(), 'PP')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-500">{format(t.dueDate.toDate(), 'PP')}</span>
                          {t.status === 'issued' && t.dueDate.toDate() < new Date() && (
                            <span className="text-[10px] font-bold text-red-500 flex items-center space-x-1">
                              <AlertCircle size={10} />
                              <span>OVERDUE</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          t.status === 'returned' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-blue-100 text-blue-600 border-blue-200'
                        }`}>
                          {t.status === 'returned' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          <span className="capitalize">{t.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${t.fineAmount && t.fineAmount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {t.fineAmount ? `₹${t.fineAmount}` : '₹0'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          {t.status === 'issued' && (
                            <button
                              onClick={() => handleReturnBook(t)}
                              className="text-xs font-bold text-orange-600 hover:underline"
                            >
                              Return Book
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <History className="text-slate-200 mb-4" size={64} />
                        <p className="text-slate-400 font-medium">No transactions found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Issue Book to User</h2>
              <button onClick={() => setShowIssueModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIssueBook} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">User Email</label>
                <input
                  type="email"
                  required
                  value={issueData.userEmail}
                  onChange={(e) => setIssueData({ ...issueData, userEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="student@college.edu"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Book ISBN</label>
                <input
                  type="text"
                  required
                  value={issueData.bookIsbn}
                  onChange={(e) => setIssueData({ ...issueData, bookIsbn: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter book ISBN"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Loan Duration (Days)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={issueData.loanDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setIssueData({ ...issueData, loanDays: isNaN(val) ? 0 : val });
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-sm"
                >
                  Issue Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
