import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { uploadFile } from '../lib/storage';
import PostCard from '../components/PostCard';
import { Settings, Grid, Bookmark, MapPin, Calendar, Edit3, LayoutDashboard, LogOut, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { signOut } from 'firebase/auth';

export default function Profile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isMyProfile = myProfile?.uid === uid;

  useEffect(() => {
    if (!uid) return;

    const unsubProfile = onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
        setEditBio(doc.data().bio || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    });

    const q = query(collection(db, 'posts'), where('authorUid', '==', uid));
    const unsubPosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `posts (authorUid: ${uid})`);
    });

    // Fetch saved posts if it's my profile
    let unsubSaved = () => {};
    if (isMyProfile) {
      const qSaved = query(collection(db, 'saved_posts'), where('userId', '==', uid));
      unsubSaved = onSnapshot(qSaved, (snapshot) => {
        setSavedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `saved_posts (userId: ${uid})`);
      });
    }

    // Check if following
    let unsubFollow = () => {};
    if (myProfile && !isMyProfile) {
      const qFollow = query(
        collection(db, 'follows'), 
        where('followerId', '==', myProfile.uid), 
        where('followingId', '==', uid)
      );
      unsubFollow = onSnapshot(qFollow, (snapshot) => {
        if (!snapshot.empty) {
          setIsFollowing(true);
          setFollowId(snapshot.docs[0].id);
        } else {
          setIsFollowing(false);
          setFollowId(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `follows (followerId: ${myProfile.uid}, followingId: ${uid})`);
      });
    }

    return () => {
      unsubProfile();
      unsubPosts();
      unsubFollow();
      unsubSaved();
    };
  }, [uid, myProfile, isMyProfile]);

  const handleUpdateBio = async () => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), { bio: editBio });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleUpdatePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!uid || !file) return;

    setUploadingPhoto(true);
    try {
      const photoURL = await uploadFile(file, 'profiles');
      await updateDoc(doc(db, 'users', uid), { photoURL });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/photo`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFollow = async () => {
    if (!myProfile || !uid) return;

    try {
      if (isFollowing && followId) {
        await deleteDoc(doc(db, 'follows', followId));
        await updateDoc(doc(db, 'users', myProfile.uid), { followingCount: increment(-1) });
        await updateDoc(doc(db, 'users', uid), { followersCount: increment(-1) });
      } else {
        await addDoc(collection(db, 'follows'), {
          followerId: myProfile.uid,
          followingId: uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', myProfile.uid), { followingCount: increment(1) });
        await updateDoc(doc(db, 'users', uid), { followersCount: increment(1) });

        // Notification
        await addDoc(collection(db, 'notifications'), {
          recipientId: uid,
          senderId: myProfile.uid,
          senderName: myProfile.username,
          senderPhoto: myProfile.photoURL,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'follows');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return <div className="text-center py-20 text-zinc-500">User not found</div>;

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          <div className="relative group">
            <img 
              src={profile.photoURL} 
              alt="" 
              className="w-32 h-32 rounded-3xl object-cover border-4 border-black shadow-xl" 
              referrerPolicy="no-referrer" 
            />
            {isMyProfile && (
              <button 
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
            )}
            <input 
              type="file" 
              ref={photoInputRef} 
              onChange={handleUpdatePhoto} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">@{profile.username}</h1>
                <p className="text-zinc-400">{profile.email}</p>
              </div>
              <div className="flex items-center space-x-3 mt-4 md:mt-0 justify-center">
                {isMyProfile ? (
                  <>
                    <Link 
                      to="/monetize"
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold transition-colors flex items-center space-x-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold transition-colors flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-xl transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleFollow}
                    className={`px-8 py-2 rounded-xl font-bold transition-colors ${
                      isFollowing 
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start space-x-8 mb-6">
              <div className="text-center md:text-left">
                <span className="block font-bold text-xl">{posts.length}</span>
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Posts</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block font-bold text-xl">{profile.followersCount || 0}</span>
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block font-bold text-xl">{profile.followingCount || 0}</span>
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Following</span>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Tell us about yourself..."
                />
                <div className="flex space-x-2">
                  <button onClick={handleUpdateBio} className="bg-orange-500 text-white px-4 py-1 rounded-lg text-sm font-bold">Save</button>
                  <button onClick={() => setIsEditing(false)} className="bg-zinc-800 text-white px-4 py-1 rounded-lg text-sm font-bold">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed max-w-lg">
                {profile.bio || "No bio yet. Tap edit to add one!"}
              </p>
            )}

            <div className="flex items-center justify-center md:justify-start space-x-4 mt-6 text-xs text-zinc-500">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-12 border-b border-zinc-800">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`py-4 text-sm font-bold flex items-center space-x-2 transition-colors ${
              activeTab === 'posts' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>POSTS</span>
          </button>
          {isMyProfile && (
            <button 
              onClick={() => setActiveTab('saved')}
              className={`py-4 text-sm font-bold flex items-center space-x-2 transition-colors ${
                activeTab === 'saved' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>SAVED</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeTab === 'posts' ? (
            posts.map((post) => (
              <div key={post.id}>
                <PostCard post={post} />
              </div>
            ))
          ) : (
            savedPosts.map((saved) => (
              <div key={saved.id}>
                <PostCard post={{ id: saved.postId, ...saved.postData }} />
              </div>
            ))
          )}
        </div>

        {((activeTab === 'posts' && posts.length === 0) || (activeTab === 'saved' && savedPosts.length === 0)) && (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
            <p className="text-zinc-500">No {activeTab} yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
