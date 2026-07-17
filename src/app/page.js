"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(""); // কোন পেজে যেতে চাইছেন তা মনে রাখার জন্য
  const router = useRouter();

  const schoolName = "Birganj Govt. College";

  // পেজ লোড হওয়ার সময় চেক করবে আগে থেকে লগইন করা আছে কি না
  useEffect(() => {
    if (localStorage.getItem("isLoggedIn") === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  // পাসওয়ার্ড চেক করার ফাংশন (মোবাইল ফ্রেন্ডলি)
  const handleLogin = () => {
    if (password.trim().toUpperCase() === "ADMIN") {
      localStorage.setItem("isLoggedIn", "true");
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setPassword("");
      if (pendingRoute) router.push(pendingRoute); // পাসওয়ার্ড সঠিক হলে কাঙ্ক্ষিত পেজে পাঠিয়ে দিবে
    } else {
      alert("ভুল পাসওয়ার্ড! (ADMIN ব্যবহার করুন)");
    }
  };

  // সুরক্ষিত লিঙ্কে ক্লিক করলে এই ফাংশনটি চলবে
  const handleProtectedClick = (route) => {
    if (isLoggedIn) {
      router.push(route);
    } else {
      setPendingRoute(route);
      setShowLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-5 md:p-10 relative overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-15%] w-[80vw] h-[80vw] bg-indigo-50 rounded-full filter blur-[100px] opacity-70"></div>
      <div className="absolute bottom-[-10%] right-[-15%] w-[80vw] h-[80vw] bg-blue-50 rounded-full filter blur-[100px] opacity-70"></div>

      <div className="relative z-10 max-w-md w-full mt-4 md:mt-12 text-center flex flex-col items-center">
        
        <h2 className="text-[12px] md:text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{schoolName}</h2>

        <div className="bg-white border border-slate-100 px-4 py-1.5 rounded-full shadow-sm mb-6">
           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Digital Desk v2.0</span>
        </div>
        
        {/* Main Title - Mobile Optimized */}
        <h1 className="text-[26px] md:text-[52px] font-black text-slate-800 leading-[1.2] tracking-tight px-4">
          Smart Attendance & <br className="hidden md:block" /> Notification
        </h1>
        
        <p className="text-xs md:text-base text-slate-500 mt-4 px-8 font-medium opacity-80 leading-relaxed">
          Take attendance and send automated SMS <br className="hidden md:block" /> reports to parents instantly.
        </p>

        {/* Dashboard Cards */}
        <div className="flex flex-col gap-4 mt-12 w-full">
          
          {/* ১. স্টুডেন্ট সার্চ - সবার জন্য খোলা */}
          <Link href="/archives" className="group active:scale-95 transition-transform duration-200">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">🔍</div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Student Search</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">View attendance history</p>
              </div>
            </div>
          </Link>

          {/* ২. অ্যাটেনডেন্স প্যানেল - সুরক্ষিত */}
          <div onClick={() => handleProtectedClick('/attendance')} className="group active:scale-95 transition-transform duration-200 cursor-pointer">
            <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-lg shadow-indigo-100 flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">✓</div>
              <div className="text-left">
                <h3 className="text-lg font-black text-white tracking-tight">Attendance Panel</h3>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-tighter">Daily SMS tracking</p>
              </div>
            </div>
          </div>

          {/* ৩. রেজিস্টার মেম্বার - সুরক্ষিত */}
          <div onClick={() => handleProtectedClick('/add-member')} className="group active:scale-95 transition-transform duration-200 cursor-pointer">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:bg-slate-50">
              <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-2xl">👤</div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Register Member</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Add new student details</p>
              </div>
            </div>
          </div>

        </div>
        
        {/* Logout Button */}
        {isLoggedIn && (
          <button 
            onClick={() => { localStorage.clear(); setIsLoggedIn(false); window.location.reload(); }}
            className="mt-10 text-slate-300 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.2em] underline"
          >
            Logout Admin
          </button>
        )}

        <div className="mt-12 py-4 flex flex-col items-center gap-2">
           <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
           <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">© 2024 ROKAN AUTOMATION</p>
        </div>
      </div>

      {/* Login Modal - বিকাশ অ্যাপ স্টাইল পপ-আপ */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-sm transform transition-all animate-in zoom-in-95 duration-200">
            <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mb-6"></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Admin Login</h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">প্যানেলে প্রবেশ করতে পাসওয়ার্ড দিন।</p>
            
            <input
              type="password"
              placeholder="ENTER PASSWORD"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-black tracking-[0.3em] text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            
            <div className="flex gap-3">
              <button onClick={handleLogin} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all text-xs uppercase">Unlock</button>
              <button onClick={() => setShowLoginModal(false)} className="px-6 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase">Close</button>
            </div>
            <p className="text-[10px] text-slate-300 mt-6 italic font-medium">Tip: Password is "ADMIN"</p>
          </div>
        </div>
      )}

    </div>
  );
}