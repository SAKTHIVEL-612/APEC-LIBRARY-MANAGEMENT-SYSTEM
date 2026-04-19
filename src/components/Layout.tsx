import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  GitPullRequest, 
  History, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Sidebar: React.FC = () => {
  const { isAdmin, isStudent, isTeacher } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'student', 'teacher'] },
    { name: 'Books', path: '/books', icon: BookOpen, roles: ['admin', 'student', 'teacher'] },
    { name: 'Users', path: '/users', icon: Users, roles: ['admin'] },
    { name: 'Requests', path: '/requests', icon: GitPullRequest, roles: ['admin', 'student', 'teacher'] },
    { name: 'Transactions', path: '/transactions', icon: History, roles: ['admin', 'student', 'teacher'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-orange-500">APEC Library</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const hasRole = item.roles.includes(isAdmin ? 'admin' : isStudent ? 'student' : isTeacher ? 'teacher' : '');
          if (!hasRole) return null;

          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                isActive ? "bg-orange-500 text-white" : "hover:bg-slate-800 text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 flex items-center justify-between px-8 z-10">
      <div className="text-slate-600 font-medium">
        Welcome, <span className="text-slate-900 font-bold">{user?.name}</span>
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative cursor-pointer hover:bg-slate-100 p-2 rounded-full transition-colors">
          <Bell size={20} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-slate-600 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <main className="ml-64 pt-24 p-8">
        {children}
      </main>
    </div>
  );
};
