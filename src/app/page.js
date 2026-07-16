"use client";
import Link from "next/link";

export default function Home() {
  // 🌟 এখানে আপনার স্কুল বা কলেজের নাম পরিবর্তন করুন
  const schoolName = "Birganj Govt. College";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/40 rounded-full filter blur-[120px] animate-pulse duration-10000"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-200/40 rounded-full filter blur-[120px] animate-pulse duration-7000"></div>

      <div className="relative z-10 max-w-4xl w-full text-center">
        {/* School Name */}
        <h2 className="text-lg md:text-xl font-bold text-indigo-900 mb-2">
          {schoolName}
        </h2>

        {/* Header Badge */}
        <span className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md shadow-indigo-100">
          Digital Attendance System v2.0
        </span>
        
        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mt-6 tracking-tight leading-none">
          Smart Attendance & Notification
        </h1>
        
        {/* Subtitle */}
        <p className="text-sm md:text-base text-slate-500 mt-4 max-w-4xl mx-auto font-medium tracking-wide">
          Take attendance of members and send automatic SMS to the guardian's phone with one click.
        </p>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-2xl mx-auto items-stretch">
          
          {/* Card 1: Register Member */}
          <Link href="/add-member" className="group h-full flex flex-col">
            <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100/80 transition-all duration-500 ease-out transform hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.25)] text-left flex flex-col justify-between overflow-hidden h-full flex-1">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-l-2xl"></div>
              
              <div className="pl-2">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl mb-5 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500">
                  ＋
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Register Member</h3>
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                  Add new students or members with their name, class, session, and phone number.
                </p>
              </div>
            </div>
          </Link>

          {/* Card 2: Attendance Panel */}
          <Link href="/attendance" className="group h-full flex flex-col">
            <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-slate-100/80 transition-all duration-500 ease-out transform hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(16,185,129,0.25)] text-left flex flex-col justify-between overflow-hidden h-full flex-1">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-l-2xl"></div>
              
              <div className="pl-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl mb-5 group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Attendance Panel</h3>
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                  Filter members by class, mark attendance (Present/Absent), and send SMS instantly.
                </p>
              </div>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}