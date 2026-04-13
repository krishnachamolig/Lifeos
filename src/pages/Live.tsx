import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Heart, MessageCircle, Share2, Music, UserPlus, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Live() {
  const { profile } = useAuth();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'video'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reels');
    });

    return () => unsubscribe();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    setActiveIndex(index);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black z-50 md:relative md:inset-auto md:h-[calc(100vh-40px)] md:rounded-3xl overflow-hidden">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {reels.map((reel, index) => (
          <div 
            key={reel.id} 
            className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-900"
          >
            <video 
              src={reel.contentUrl} 
              className="h-full w-full object-cover"
              loop
              muted={index !== activeIndex}
              autoPlay={index === activeIndex}
              playsInline
            />

            {/* Overlay Content */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 flex flex-col justify-end p-6 pb-24 md:pb-6">
              <div className="flex items-end justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={reel.authorPhoto} 
                      alt="" 
                      className="w-10 h-10 rounded-full border-2 border-white" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-bold text-white shadow-sm">@{reel.authorName}</span>
                    <button className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white border border-white/20">
                      Follow
                    </button>
                  </div>
                  <p className="text-white text-sm line-clamp-2 shadow-sm">{reel.text}</p>
                  <div className="flex items-center space-x-2 text-white/80 text-xs">
                    <Music className="w-3 h-3 animate-spin-slow" />
                    <span>Original Audio - {reel.authorName}</span>
                  </div>
                </div>

                {/* Vertical Actions */}
                <div className="flex flex-col items-center space-y-6 ml-4">
                  <div className="flex flex-col items-center">
                    <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                      <Heart className="w-7 h-7" />
                    </button>
                    <span className="text-[10px] font-bold text-white mt-1">{reel.likesCount || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                      <MessageCircle className="w-7 h-7" />
                    </button>
                    <span className="text-[10px] font-bold text-white mt-1">{reel.commentsCount || 0}</span>
                  </div>
                  <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                    <Share2 className="w-7 h-7" />
                  </button>
                  <div className="w-8 h-8 rounded-lg border-2 border-white/50 overflow-hidden animate-spin-slow">
                    <img src={reel.authorPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {reels.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <Activity className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Reels Yet</h3>
            <p className="max-w-xs">Be the first to share a video life log!</p>
          </div>
        )}
      </div>
    </div>
  );
}
