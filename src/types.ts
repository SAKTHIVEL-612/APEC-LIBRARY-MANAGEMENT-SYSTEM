export type UserRole = 'admin' | 'student' | 'teacher';

export interface User {
  uid: string;
  id: string; // Register Number / Teacher ID / Admin ID
  name: string;
  email: string;
  role: UserRole;
  isBlocked?: boolean;
  createdAt: any;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category?: string;
  publisher?: string;
  quantityTotal: number;
  quantityAvailable: number;
  shelfLocation?: string;
  description?: string;
  coverImage?: string;
  createdAt: any;
}

export interface BookRequest {
  id: string;
  userUid: string;
  userName: string;
  bookTitle: string;
  bookId?: string;
  type?: 'borrow' | 'request';
  customDescription?: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  createdAt: any;
}

export interface Transaction {
  id: string;
  userUid: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  issueDate: any;
  dueDate: any;
  returnDate?: any;
  fineAmount?: number;
  status: 'issued' | 'returned';
}

export interface Notification {
  id: string;
  userUid: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: any;
}

export interface LibrarySettings {
  finePerDay: number;
  maxBooksPerUser: number;
  loanDurationDays: number;
}
