import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, TrendingUp, Users } from 'lucide-react';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';

export default function Explore() {
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'users'>('trending');

  useEffect(() => {
    // Fetch trending posts (most liked)
    const q = query(collection(db, 'posts'), orderBy('likesCount', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'explore/trending');
    });

    // Fetch all users for discovery
    const fetchUsers = async () => {
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        setUsers(uSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'explore/users');
      }
    };
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const filteredPosts = posts.filter(p => 
    p.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.authorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search locations, categories, or people..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center space-x-2 transition-colors ${
            activeTab === 'trending' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Trending</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center space-x-2 transition-colors ${
            activeTab === 'users' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>People</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'trending' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((post) => (
                <div key={post.id}>
                  <PostCard post={post} />
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div className="col-span-full text-center py-20 text-zinc-500">No posts found</div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <Link 
                  key={user.id} 
                  to={`/profile/${user.uid}`}
                  className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <h3 className="font-bold">@{user.username}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-1">{user.bio || 'No bio yet'}</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-orange-500">View Profile</div>
                </Link>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-20 text-zinc-500">No users found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
