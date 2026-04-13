import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Heart, MessageCircle, UserPlus, Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [profile]);

  const markAllAsRead = async () => {
    if (!profile || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notifications/read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500 fill-current" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getMessage = (n: any) => {
    switch (n.type) {
      case 'like': return 'liked your post';
      case 'comment': return 'commented on your post';
      case 'follow': return 'started following you';
      case 'message': return 'sent you a message';
      default: return 'sent a notification';
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center space-x-1"
          >
            <Check className="w-3 h-3" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-2xl border transition-colors flex items-center space-x-4 ${
              n.read ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-zinc-900 border-zinc-800 border-l-4 border-l-orange-500'
            }`}
          >
            <Link to={`/profile/${n.senderId}`}>
              <div className="relative">
                <img src={n.senderPhoto} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-zinc-800">
                  {getIcon(n.type)}
                </div>
              </div>
            </Link>

            <div className="flex-1">
              <p className="text-sm">
                <Link to={`/profile/${n.senderId}`} className="font-bold hover:underline">@{n.senderName}</Link>
                {' '}{getMessage(n)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {n.createdAt ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000)) : 'Just now'} ago
              </p>
            </div>

            {n.postId && (
              <Link to={`/profile/${profile?.uid}`} className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                {/* In a real app, we'd fetch the post thumbnail here */}
                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">POST</div>
              </Link>
            )}
          </motion.div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
            <Bell className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
