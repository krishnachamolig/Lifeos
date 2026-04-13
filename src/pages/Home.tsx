import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { uploadFile } from '../lib/storage';
import PostCard from '../components/PostCard';
import { Image, Video, Type, Send, X, Plus, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [stories, setStories] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [newPost, setNewPost] = useState({ text: '', type: 'text' as const, category: 'Lifestyle' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch Posts
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
    });

    // Fetch Stories (not expired)
    const now = new Date();
    const qStories = query(
      collection(db, 'stories'),
      where('expiresAt', '>', Timestamp.fromDate(now)),
      orderBy('expiresAt', 'asc')
    );
    const unsubStories = onSnapshot(qStories, (snapshot) => {
      const storiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Group by user
      const grouped = storiesData.reduce((acc: any, story: any) => {
        if (!acc[story.authorUid]) {
          acc[story.authorUid] = {
            uid: story.authorUid,
            name: story.authorName,
            photo: story.authorPhoto,
            stories: []
          };
        }
        acc[story.authorUid].stories.push(story);
        return acc;
      }, {});
      setStories(Object.values(grouped));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stories');
    });

    // Fetch Following UIDs
    let unsubFollowing = () => {};
    if (profile) {
      const qFollowing = query(collection(db, 'follows'), where('followerId', '==', profile.uid));
      unsubFollowing = onSnapshot(qFollowing, (snapshot) => {
        const uids = snapshot.docs.map(doc => doc.data().followingId);
        setFollowingUids(uids);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'follows/following-uids');
      });
    }

    return () => {
      unsubPosts();
      unsubStories();
      unsubFollowing();
    };
  }, [profile]);

  useEffect(() => {
    if (followingUids.length === 0) {
      setFollowingPosts([]);
      return;
    }

    // Firestore 'in' query limit is 10, but for simplicity we'll just filter client-side or use a simple query
    // In a real app, you'd use a more complex query or multiple queries
    const qFollowingPosts = query(
      collection(db, 'posts'),
      where('authorUid', 'in', followingUids.slice(0, 10)),
      orderBy('createdAt', 'desc')
    );

    const unsubFollowingPosts = onSnapshot(qFollowingPosts, (snapshot) => {
      setFollowingPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts/following');
    });

    return () => unsubFollowingPosts();
  }, [followingUids]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!newPost.text && !selectedFile)) return;

    setUploading(true);
    try {
      let contentUrl = null;
      if (selectedFile) {
        contentUrl = await uploadFile(selectedFile, 'posts');
      }

      await addDoc(collection(db, 'posts'), {
        authorUid: profile.uid,
        authorName: profile.username,
        authorPhoto: profile.photoURL,
        type: selectedFile ? (selectedFile.type.startsWith('video') ? 'video' : 'image') : 'text',
        text: newPost.text,
        category: newPost.category,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        contentUrl,
      });
      setNewPost({ text: '', type: 'text', category: 'Lifestyle' });
      setSelectedFile(null);
      setIsPosting(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'posts');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!profile || !file) return;

    setUploading(true);
    try {
      const imageUrl = await uploadFile(file, 'stories');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await addDoc(collection(db, 'stories'), {
        authorUid: profile.uid,
        authorName: profile.username,
        authorPhoto: profile.photoURL,
        imageUrl,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'stories');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feed Tabs */}
      <div className="flex items-center justify-center space-x-8 border-b border-zinc-800">
        <button 
          onClick={() => setActiveTab('for-you')}
          className={`py-4 text-sm font-bold transition-colors ${
            activeTab === 'for-you' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          For You
        </button>
        <button 
          onClick={() => setActiveTab('following')}
          className={`py-4 text-sm font-bold transition-colors ${
            activeTab === 'following' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Following
        </button>
      </div>

      {/* Stories Section */}
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* My Story Add */}
        <div className="flex flex-col items-center space-y-1 flex-shrink-0">
          <div className="relative">
            <img 
              src={profile?.photoURL} 
              alt="" 
              className="w-16 h-16 rounded-full border-2 border-zinc-800 p-0.5 object-cover" 
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => storyInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-orange-500 rounded-full p-1 border-2 border-black hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3 h-3 text-white" />
            </button>
            <input 
              type="file" 
              ref={storyInputRef} 
              onChange={handleCreateStory} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Your Story</span>
        </div>

        {/* Other Stories */}
        {stories.map((group: any) => (
          <button
            key={group.uid}
            onClick={() => setActiveStory(group)}
            className="flex flex-col items-center space-y-1 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full border-2 border-orange-500 p-0.5">
              <img 
                src={group.photo} 
                alt="" 
                className="w-full h-full rounded-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[10px] text-zinc-300 font-medium truncate w-16 text-center">
              {group.name}
            </span>
          </button>
        ))}
      </div>

      {/* Create Post Trigger */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center space-x-4">
        <img src={profile?.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
        <button 
          onClick={() => setIsPosting(true)}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-left px-4 py-2 rounded-full transition-colors"
        >
          Share your life, {profile?.username}...
        </button>
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {(activeTab === 'for-you' ? posts : followingPosts).map((post) => (
            <div key={post.id}>
              <PostCard post={post} />
            </div>
          ))}
          {activeTab === 'following' && followingPosts.length === 0 && (
            <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 text-sm">Follow people to see their posts here!</p>
            </div>
          )}
        </div>
      )}

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
            <button 
              onClick={() => setActiveStory(null)}
              className="absolute top-6 right-6 z-[210] p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg aspect-[9/16] bg-zinc-900"
            >
              <img 
                src={activeStory.stories[0].imageUrl} 
                alt="" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center space-x-3">
                <img src={activeStory.photo} alt="" className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                <span className="font-bold text-sm">{activeStory.name}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isPosting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden"
            >
              <div className="p-4 border-bottom border-zinc-800 flex items-center justify-between">
                <h2 className="font-bold">Create Post</h2>
                <button onClick={() => setIsPosting(false)} className="p-2 hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="p-4 space-y-4">
                <textarea
                  value={newPost.text}
                  onChange={(e) => setNewPost({ ...newPost, text: e.target.value })}
                  placeholder="What's happening?"
                  className="w-full bg-transparent border-none focus:ring-0 text-lg resize-none min-h-[120px]"
                />

                {selectedFile && (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                    {selectedFile.type.startsWith('video') ? (
                      <video src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" />
                    ) : (
                      <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" />
                    )}
                    <button 
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-4 border-t border-zinc-800 pt-4">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                    accept="image/*,video/*"
                  />

                  <select 
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="bg-zinc-800 border-none rounded-lg text-xs font-medium focus:ring-0"
                  >
                    {['Work', 'Travel', 'Study', 'Hustle', 'Lifestyle'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={uploading || (!newPost.text && !selectedFile)}
                    className="ml-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-bold transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Post</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
