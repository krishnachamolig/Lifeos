import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Send, Image as ImageIcon, Search, MoreVertical, MessageCircle, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const { profile } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${activeChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [activeChat]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', searchTerm.toLowerCase()),
          where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        setSearchResults(snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(u => u.uid !== profile?.uid)
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users/search');
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, profile]);

  const startChat = async (otherUser: any) => {
    if (!profile) return;

    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(otherUser.uid));
    if (existingChat) {
      setActiveChat(existingChat);
      setShowNewChat(false);
      return;
    }

    try {
      const chatData = {
        participants: [profile.uid, otherUser.uid],
        participantData: {
          [profile.uid]: { name: profile.username, photo: profile.photoURL },
          [otherUser.uid]: { name: otherUser.username, photo: otherUser.photoURL }
        },
        lastMessage: '',
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      setActiveChat({ id: docRef.id, ...chatData });
      setShowNewChat(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'chats');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeChat || !newMessage.trim()) return;

    try {
      const msgText = newMessage;
      setNewMessage('');
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        chatId: activeChat.id,
        senderUid: profile.uid,
        text: msgText,
        createdAt: serverTimestamp(),
      });
      // Update last message in chat doc
      // Note: In a real app, use a cloud function for this
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${activeChat.id}/messages`);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const getOtherParticipant = (chat: any) => {
    const otherId = chat.participants.find((p: string) => p !== profile?.uid);
    return chat.participantData?.[otherId] || { name: 'User', photo: '' };
  };

  return (
    <div className="h-[calc(100vh-120px)] md:h-[calc(100vh-40px)] flex bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-zinc-800 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Messages</h2>
          <button 
            onClick={() => setShowNewChat(true)}
            className="p-2 bg-orange-500 hover:bg-orange-600 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const other = getOtherParticipant(chat);
            return (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-zinc-800 transition-colors ${activeChat?.id === chat.id ? 'bg-zinc-800' : ''}`}
              >
                <img src={other.photo} alt="" className="w-12 h-12 rounded-full object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold text-sm truncate">@{other.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                </div>
                {chat.updatedAt && (
                  <span className="text-[10px] text-zinc-600">
                    {formatDistanceToNow(chat.updatedAt.toDate())}
                  </span>
                )}
              </button>
            );
          })}
          {chats.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No conversations yet. Tap the + icon to start one!
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 hover:bg-zinc-800 rounded-full mr-2">
                  <X className="w-5 h-5" />
                </button>
                <img src={getOtherParticipant(activeChat).photo} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-bold text-sm">@{getOtherParticipant(activeChat).name}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                </div>
              </div>
              <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderUid === profile?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                      msg.senderUid === profile?.uid
                        ? 'bg-orange-500 text-white rounded-tr-none'
                        : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                    <p className={`text-[10px] mt-1 ${msg.senderUid === profile?.uid ? 'text-orange-100' : 'text-zinc-500'}`}>
                      {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate()) : 'just now'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900 border-t border-zinc-800">
              <div className="flex items-center space-x-2">
                <button type="button" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-black border border-zinc-800 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Your Inbox</h3>
            <p className="max-w-xs">Select a conversation or start a new one to begin chatting.</p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-bold">New Message</h2>
                <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-black border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startChat(user)}
                      className="w-full p-3 flex items-center space-x-3 hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="text-left">
                        <p className="font-bold text-sm">@{user.username}</p>
                        <p className="text-xs text-zinc-500">{user.bio || 'No bio'}</p>
                      </div>
                    </button>
                  ))}
                  {searchTerm && searchResults.length === 0 && (
                    <p className="text-center text-zinc-500 py-4 text-sm">No users found</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


