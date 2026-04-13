import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Heart, 
  Eye, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Upload,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';

export default function Monetize() {
  const { profile } = useAuth();
  const [monetizationRequest, setMonetizationRequest] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: '',
    address: '',
    email: profile?.email || '',
    phone: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  const MONETIZATION_THRESHOLD = 100000;

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch monetization request status
    const qRequest = query(
      collection(db, 'monetization_requests'),
      where('userId', '==', profile.uid)
    );
    const unsubRequest = onSnapshot(qRequest, (snapshot) => {
      if (!snapshot.empty) {
        setMonetizationRequest({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    });

    // Fetch earnings
    const unsubEarnings = onSnapshot(doc(db, 'earnings', profile.uid), (doc) => {
      if (doc.exists()) {
        setEarnings(doc.data());
      }
    });

    setLoading(false);
    return () => {
      unsubRequest();
      unsubEarnings();
    };
  }, [profile?.uid]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await addDoc(collection(db, 'monetization_requests'), {
        userId: profile.uid,
        fullName: form.fullName,
        address: form.address,
        email: form.email,
        phone: form.phone,
        bankDetails: {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
        },
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setIsApplying(false);
    } catch (err) {
      console.error('Error applying for monetization:', err);
    }
  };

  const handleWithdraw = async () => {
    if (!profile || !earnings || earnings.total < 100) {
      alert('Minimum withdrawal amount is ₹100');
      return;
    }

    try {
      await addDoc(collection(db, 'withdraw_requests'), {
        userId: profile.uid,
        amount: earnings.total,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      alert('Withdrawal request submitted!');
    } catch (err) {
      console.error('Error submitting withdrawal request:', err);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: 'Followers', value: profile?.followersCount || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Likes', value: profile?.likesCount || 0, icon: Heart, color: 'text-red-500' },
    { label: 'Views', value: profile?.viewsCount || 0, icon: Eye, color: 'text-purple-500' },
    { label: 'Posts', value: profile?.postsCount || 0, icon: FileText, color: 'text-green-500' },
  ];

  const engagementRate = profile?.viewsCount 
    ? (((profile.likesCount || 0) / profile.viewsCount) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Creator Studio</h1>
          <p className="text-zinc-500">Manage your growth and earnings</p>
        </div>
        <div className="bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-800 flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold">Engagement: {engagementRate}%</span>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
            <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Monetization Status / Apply */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Monetization</h2>
              <p className="text-sm text-zinc-500">Earn money from your content</p>
            </div>
          </div>

          {!monetizationRequest ? (
            <div className="space-y-6">
              <div className="bg-black/40 rounded-2xl p-6 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold">Eligibility Progress</span>
                  <span className="text-sm text-zinc-400">
                    {(profile?.followersCount || 0).toLocaleString()} / {MONETIZATION_THRESHOLD.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full transition-all duration-1000"
                    style={{ width: `${Math.min(((profile?.followersCount || 0) / MONETIZATION_THRESHOLD) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {profile?.followersCount >= MONETIZATION_THRESHOLD ? (
                <button 
                  onClick={() => setIsApplying(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                >
                  Apply for Monetization
                </button>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-zinc-500 bg-zinc-800/30 py-4 rounded-2xl border border-dashed border-zinc-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Reach 100K followers to unlock</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-zinc-800/30 p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-center space-x-4">
                {monetizationRequest.status === 'pending' && <Clock className="w-6 h-6 text-yellow-500" />}
                {monetizationRequest.status === 'approved' && <CheckCircle className="w-6 h-6 text-green-500" />}
                {monetizationRequest.status === 'rejected' && <AlertCircle className="w-6 h-6 text-red-500" />}
                <div>
                  <p className="font-bold capitalize">Status: {monetizationRequest.status}</p>
                  <p className="text-xs text-zinc-500">
                    {monetizationRequest.status === 'pending' && "Your application is under review"}
                    {monetizationRequest.status === 'approved' && "Congratulations! You are now earning"}
                    {monetizationRequest.status === 'rejected' && "Application rejected. Please check your details"}
                  </p>
                </div>
              </div>
              {monetizationRequest.status === 'rejected' && (
                <button 
                  onClick={() => setIsApplying(true)}
                  className="text-orange-500 font-bold text-sm hover:underline"
                >
                  Retry Application
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Earnings Section (Only if approved) */}
      {monetizationRequest?.status === 'approved' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Earnings Dashboard</h3>
              <div className="flex items-center space-x-2 text-xs text-zinc-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live Revenue</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Total</p>
                <p className="text-3xl font-bold text-orange-500">₹{earnings?.total || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Monthly</p>
                <p className="text-xl font-bold">₹{earnings?.monthly || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Daily</p>
                <p className="text-xl font-bold">₹{earnings?.daily || 0}</p>
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Available for Withdrawal</p>
                <p className="text-2xl font-bold">₹{earnings?.total || 0}</p>
              </div>
              <button 
                onClick={handleWithdraw}
                className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-zinc-200 transition-colors flex items-center space-x-2"
              >
                <span>Withdraw</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <h3 className="font-bold">Revenue Logic</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">CPM Rate</span>
                <span className="font-bold">₹50 / 1k views</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Platform Fee</span>
                <span className="font-bold">10%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Next Payout</span>
                <span className="font-bold">25th Oct</span>
              </div>
            </div>
            <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
              <p className="text-xs text-orange-500 leading-relaxed">
                Earnings are calculated based on valid views and engagement. Payments are processed monthly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      <AnimatePresence>
        {isApplying && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
                <h2 className="text-xl font-bold">Monetization Application</h2>
                <button onClick={() => setIsApplying(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleApply} className="p-8 space-y-8">
                {/* Personal Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name (As per PAN)"
                      required
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      required
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                {/* Documents Upload (Placeholders) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Document Verification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Aadhaar Card', 'PAN Card', 'Bank Proof'].map((doc) => (
                      <div key={doc} className="border-2 border-dashed border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer group">
                        <Upload className="w-5 h-5 text-zinc-500 group-hover:text-orange-500" />
                        <span className="text-[10px] font-bold uppercase text-zinc-500">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Bank Name"
                      required
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      required
                      value={form.accountNumber}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="IFSC Code"
                      required
                      value={form.ifscCode}
                      onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                      className="bg-black border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    Submit Application
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center mt-4">
                    By submitting, you agree to LifeOS Creator Terms & Conditions.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
