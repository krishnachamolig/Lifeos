import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User, Play, Bell } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'layout/notifications-badge');
    });

    return () => unsubscribe();
  }, [user]);

  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Search, path: '/explore', label: 'Explore' },
    { icon: Play, path: '/live', label: 'Reels' },
    { icon: Bell, path: '/notifications', label: 'Notifications', badge: unreadCount },
    { icon: MessageCircle, path: '/messages', label: 'Messages' },
    { icon: User, path: `/profile/${user?.uid}`, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0 md:pl-20 lg:pl-64">
      {/* Sidebar for Desktop */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full border-r border-zinc-800 bg-black w-20 lg:w-64 p-4 z-50">
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent hidden lg:block">
            LifeOS
          </h1>
          <div className="w-8 h-8 bg-orange-500 rounded-lg lg:hidden" />
        </div>
        
        <div className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-xl transition-colors relative ${
                location.pathname === item.path ? 'bg-zinc-900 text-orange-500' : 'hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="ml-4 font-medium hidden lg:block">{item.label}</span>
            </Link>
          ))}
        </div>

        {user && (
          <div className="mt-auto p-2">
            <Link to={`/profile/${user.uid}`} className="flex items-center space-x-3 p-2 hover:bg-zinc-900 rounded-xl transition-colors">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-zinc-800" referrerPolicy="no-referrer" />
              <div className="hidden lg:block overflow-hidden">
                <p className="text-sm font-medium truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-zinc-500 truncate">@{user.email?.split('@')[0]}</p>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-zinc-800 flex items-center justify-around px-4 z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`p-2 rounded-lg transition-colors relative ${
              location.pathname === item.path ? 'text-orange-500' : 'text-zinc-400'
            }`}
          >
            <div className="relative">
              <item.icon className="w-6 h-6" />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">
                  {item.badge}
                </span>
              )}
            </div>
          </Link>
        ))}
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
