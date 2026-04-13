import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function PostCard({ post }: { post: any }) {
  const { profile } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!profile) return;

    // Check if liked
    const q = query(collection(db, 'likes'), where('postId', '==', post.id), where('userId', '==', profile.uid));
    const unsubLike = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIsLiked(true);
        setLikeId(snapshot.docs[0].id);
      } else {
        setIsLiked(false);
        setLikeId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `likes (postId: ${post.id})`);
    });

    // Fetch comments
    const qComments = query(collection(db, 'comments'), where('postId', '==', post.id));
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `comments (postId: ${post.id})`);
    });

    // Check if saved
    const qSave = query(
      collection(db, 'saved_posts'),
      where('postId', '==', post.id),
      where('userId', '==', profile.uid)
    );
    const unsubSave = onSnapshot(qSave, (snapshot) => {
      if (!snapshot.empty) {
        setIsSaved(true);
        setSaveId(snapshot.docs[0].id);
      } else {
        setIsSaved(false);
        setSaveId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `saved_posts (postId: ${post.id})`);
    });

    return () => {
      unsubLike();
      unsubComments();
      unsubSave();
    };
  }, [post.id, profile]);

  const handleLike = async () => {
    if (!profile) return;

    try {
      if (isLiked && likeId) {
        await deleteDoc(doc(db, 'likes', likeId));
        await updateDoc(doc(db, 'posts', post.id), { likesCount: increment(-1) });
      } else {
        await addDoc(collection(db, 'likes'), {
          postId: post.id,
          userId: profile.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'posts', post.id), { likesCount: increment(1) });
        
        // Notification
        if (post.authorUid !== profile.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: post.authorUid,
            senderId: profile.uid,
            senderName: profile.username,
            senderPhoto: profile.photoURL,
            type: 'like',
            postId: post.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'likes/posts');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      if (isSaved && saveId) {
        await deleteDoc(doc(db, 'saved_posts', saveId));
      } else {
        await addDoc(collection(db, 'saved_posts'), {
          postId: post.id,
          userId: profile.uid,
          createdAt: serverTimestamp(),
          postData: {
            contentUrl: post.contentUrl,
            type: post.type,
            text: post.text,
            authorName: post.authorName,
            authorPhoto: post.authorPhoto
          }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'saved_posts');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newComment.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        userId: profile.uid,
        userName: profile.username,
        userPhoto: profile.photoURL,
        text: newComment,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', post.id), { commentsCount: increment(1) });
      setNewComment('');

      // Notification
      if (post.authorUid !== profile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.authorUid,
          senderId: profile.uid,
          senderName: profile.username,
          senderPhoto: profile.photoURL,
          type: 'comment',
          postId: post.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'comments/posts');
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden mb-6"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={post.authorPhoto} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
            <div>
              <h3 className="font-medium text-sm">{post.authorName}</h3>
              <div className="flex items-center text-xs text-zinc-500 space-x-2">
                <span>{post.location}</span>
                <span>•</span>
                <span>{post.createdAt ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000)) : 'Just now'} ago</span>
              </div>
            </div>
          </div>
          <button className="text-zinc-400 hover:text-white">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative aspect-square bg-zinc-800">
          {post.type === 'image' && (
            <img src={post.contentUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          )}
          {post.type === 'video' && (
            <video src={post.contentUrl} className="w-full h-full object-cover" controls />
          )}
          {post.type === 'text' && (
            <div className="w-full h-full flex items-center justify-center p-8 text-xl font-medium text-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              {post.text}
            </div>
          )}
          
          {post.category && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium border border-white/10">
              {post.category}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLike}
                className={`transition-colors ${isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={() => setShowComments(true)}
                className="text-zinc-400 hover:text-white"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              <button className="text-zinc-400 hover:text-white">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
            <button 
              onClick={handleSave}
              className={`transition-colors ${isSaved ? 'text-orange-500' : 'text-zinc-400 hover:text-white'}`}
            >
              <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold">{post.likesCount || 0} likes</p>
            {post.text && post.type !== 'text' && (
              <p className="text-sm">
                <span className="font-semibold mr-2">{post.authorName}</span>
                {post.text}
              </p>
            )}
            <button 
              onClick={() => setShowComments(true)}
              className="text-zinc-500 text-sm hover:underline"
            >
              View all {post.commentsCount || 0} comments
            </button>
          </div>
        </div>
      </motion.div>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-bold">Comments</h2>
                <button onClick={() => setShowComments(false)} className="p-2 hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <img src={comment.userPhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-sm">
                        <span className="font-bold mr-2">{comment.userName}</span>
                        {comment.text}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt.seconds * 1000)) : 'Just now'} ago
                      </p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-10 text-zinc-500">No comments yet. Be the first!</div>
                )}
              </div>

              <form onSubmit={handleAddComment} className="p-4 border-t border-zinc-800 flex items-center space-x-3">
                <img src={profile?.photoURL} alt="" className="w-8 h-8 rounded-full" />
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-zinc-800 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-orange-500"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim()}
                  className="text-orange-500 font-bold text-sm disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
