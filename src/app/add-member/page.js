"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';

export default function AddMember() {
  const router = useRouter();

  // --- নিরাপত্তা চেক (পাসওয়ার্ড ছাড়া সরাসরি ঢোকা বন্ধ করবে) ---
  useEffect(() => {
    const auth = localStorage.getItem("isLoggedIn");
    if (auth !== "true") {
      router.push("/"); // লগইন না থাকলে হোম পেজে পাঠিয়ে দিবে
    }
  }, [router]);

  const [formData, setFormData] = useState({
    name: '', class_name: '', session: '', roll_no: '', phone_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const classOptions = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const sessionOptions = ['2023-24', '2024-25', '2025-26', '2026-27'];

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.class_name || !formData.session || !formData.roll_no.trim() || !formData.phone_number.trim()) {
      triggerToast("সবগুলো তথ্য সঠিকভাবে পূরণ করুন!", "error");
      return;
    }

    setLoading(true);
    // ডুপ্লিকেট চেক
    const { data: duplicateCheck } = await supabase
      .from('members')
      .select('id')
      .eq('class_name', formData.class_name)
      .eq('session', formData.session)
      .eq('roll_no', formData.roll_no.trim())
      .maybeSingle();

    if (duplicateCheck) {
      triggerToast(`এই রোলে অলরেডি একজন রেজিস্ট্রেশন করেছে!`, "error");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('members').insert([{
      name: formData.name.trim(),
      class_name: formData.class_name,
      session: formData.session,
      roll_no: formData.roll_no.trim(),
      phone_number: formData.phone_number.trim()
    }]);

    if (error) {
      triggerToast("Error: " + error.message, 'error');
    } else {
      triggerToast("সফলভাবে রেজিস্ট্রেশন হয়েছে!", 'success');
      setFormData({ name: '', class_name: '', session: '', roll_no: '', phone_number: '' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F6F9] flex flex-col items-center p-4 md:p-10 font-sans selection:bg-indigo-100 text-slate-800">
      
      {/* মোবাইল ফ্রেন্ডলি হেডার */}
      <div className="w-full max-w-md flex items-center justify-between mb-8 px-2">
        <button 
          onClick={() => router.push('/')} 
          className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
        >
          ←
        </button>
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">New Student</h2>
        <div className="w-10"></div> {/* ব্যালেন্স করার জন্য খালি ডাইভ */}
      </div>

      {/* মেইন কার্ড - বিকাশ অ্যাপ স্টাইল */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/60 border border-white relative overflow-hidden">
        
        {/* উপরের ছোট ডেকোরেশন */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

        <div className="text-left mb-8 relative z-10">
          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Registration Form</p>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">ব্যক্তিগত তথ্য দিন</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">ছাত্র/ছাত্রীর নাম</label>
            <input 
              type="text" 
              placeholder="Full Name" 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold" 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              value={formData.name} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">ক্লাস</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold appearance-none cursor-pointer"
                onChange={e => setFormData({...formData, class_name: e.target.value})} 
                value={formData.class_name}
              >
                <option value="">SELECT</option>
                {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">সেশন</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold appearance-none cursor-pointer"
                onChange={e => setFormData({...formData, session: e.target.value})} 
                value={formData.session}
              >
                <option value="">SELECT</option>
                {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">রোল নম্বর</label>
            <input 
              type="text" 
              placeholder="Roll Number" 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold" 
              onChange={e => setFormData({...formData, roll_no: e.target.value})} 
              value={formData.roll_no} 
            />
          </div>
            
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">অভিভাবকের মোবাইল</label>
            <input 
              type="tel" 
              placeholder="017XXXXXXXX" 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold" 
              onChange={e => setFormData({...formData, phone_number: e.target.value})} 
              value={formData.phone_number} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[1.5rem] transition-all active:scale-95 shadow-lg shadow-indigo-100 text-sm uppercase tracking-widest mt-4"
          >
            {loading ? 'প্রসেসিং হচ্ছে...' : 'Register Student'}
          </button>
        </form>

        <div className="text-center mt-8">
           <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">
             © 2024 Rokan Automation
           </p>
        </div>
      </div>

      {/* টোস্ট মেসেজ */}
      {toast.show && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full text-white font-black shadow-2xl z-50 animate-bounce text-xs ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}