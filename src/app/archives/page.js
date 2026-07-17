"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';

export default function ArchivesPage() {
  const router = useRouter();
  
  // --- States ---
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedClassFolder, setSelectedClassFolder] = useState(null);
  
  // Search States
  const [members, setMembers] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [searchRoll, setSearchRoll] = useState('');
  const [studentResult, setStudentResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Custom Modal State (For Errors/Success)
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'error' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: arc } = await supabase.from('archives').select('*').order('created_at', { ascending: false });
        const { data: mem } = await supabase.from('members').select('class_name');
        setArchives(arc || []); setMembers(mem || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- স্মার্ট ক্লাস সর্টিং ---
  const classList = useMemo(() => {
    const order = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
    return [...new Set(members.map(m => m.class_name))].sort((a,b) => {
      const aV = parseInt(a.replace(/\D/g,'')) || order[a.toLowerCase()] || 0;
      const bV = parseInt(b.replace(/\D/g,'')) || order[b.toLowerCase()] || 0;
      return aV - bV || a.localeCompare(b);
    });
  }, [members]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchClass || !searchRoll) {
      return setNotification({ show: true, title: 'Missing Info', message: 'Please select Class and enter Roll number.', type: 'error' });
    }
    setSearchLoading(true);
    try {
      const { data: st } = await supabase.from('members').select('*').eq('class_name', searchClass).eq('roll_no', searchRoll).single();
      if (!st) throw new Error("No student found with this Roll and Class.");
      const { data: rec } = await supabase.from('attendance').select('*').eq('member_id', st.id).order('attendance_date', { ascending: false }).limit(20);
      setStudentResult({ info: st, records: rec || [] });
    } catch (err) {
      setNotification({ show: true, title: 'Not Found', message: err.message, type: 'error' });
    } finally { setSearchLoading(false); }
  };

  const months = ['All', ...new Set(archives.map(a => a.month_folder).filter(Boolean))];
  const monthFiltered = selectedMonth === 'All' ? archives : archives.filter(a => a.month_folder === selectedMonth);
  const classFolders = [...new Set(monthFiltered.map(a => a.class_name))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-3 md:p-12 font-sans select-none text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header - পাসওয়ার্ড বা লগইন বাটন তুলে দেওয়া হয়েছে */}
        <div className="flex justify-between items-center mb-8 bg-white p-5 md:p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-white">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')} 
                className="bg-slate-50 text-slate-500 px-6 py-2.5 rounded-2xl font-black text-[10px] tracking-widest hover:bg-slate-100 transition-all uppercase"
              >
                BACK
              </button>
              <h1 className="hidden md:block text-xl font-black uppercase tracking-[0.2em] text-slate-800">Storage Vault</h1>
           </div>
           <div>
              <button onClick={() => router.push('/attendance')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">ATTENDANCE DESK</button>
           </div>
        </div>

        {/* --- STUDENT SEARCH --- */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 mb-12 shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
          <div className="relative z-10 text-left">
            <h2 className="text-3xl md:text-6xl font-black mb-4 tracking-tighter leading-tight">Student Search</h2>
            <p className="text-indigo-100 font-medium mb-10 text-sm md:text-xl opacity-90">View student attendance report for current month.</p>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
               <select 
                 value={searchClass} onChange={e => setSearchClass(e.target.value)} 
                 className="flex-1 bg-white/10 border-2 border-white/20 p-5 rounded-3xl font-black text-sm outline-none focus:bg-white focus:text-indigo-900 transition-all appearance-none cursor-pointer"
               >
                  <option value="">SELECT CLASS</option>
                  {classList.map(c => <option key={c} value={c} className="text-slate-800">{c}</option>)}
               </select>
               <input 
                 type="text" placeholder="ENTER ROLL NO" 
                 value={searchRoll} onChange={e => setSearchRoll(e.target.value)} 
                 className="flex-1 bg-white/10 border-2 border-white/20 p-5 rounded-3xl font-black text-sm outline-none focus:bg-white focus:text-indigo-900 transition-all" 
               />
               <button 
                 type="submit" disabled={searchLoading}
                 className="bg-white text-indigo-600 px-12 py-5 rounded-3xl font-black text-xs md:text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
               >
                 {searchLoading ? 'SEARCHING...' : 'SEARCH NOW'}
               </button>
            </form>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px]"></div>
        </div>

        {/* Result Area */}
        {studentResult && (
          <div className="mb-14 bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border-4 border-indigo-50 animate-in slide-in-from-bottom-10">
             <div className="flex justify-between border-b border-slate-100 pb-8 mb-8 items-center">
                <div className="text-left">
                   <h3 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tight">{studentResult.info.name}</h3>
                   <p className="font-bold text-slate-400 mt-2 uppercase text-xs md:text-sm">Class {studentResult.info.class_name} | Roll {studentResult.info.roll_no}</p>
                </div>
                <button onClick={() => setStudentResult(null)} className="text-rose-500 font-black text-xl bg-rose-50 w-12 h-12 rounded-full hover:rotate-90 transition-all">✕</button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {studentResult.records.map((r, i) => (
                  <div key={i} className="p-6 rounded-[2.5rem] border-2 border-slate-50 flex flex-col items-center bg-white shadow-sm hover:border-indigo-100 transition-all">
                    <p className="text-[10px] font-black text-slate-300 mb-1">{r.attendance_date}</p>
                    <p className="font-bold text-slate-700 text-xs mb-4 truncate w-full text-center uppercase tracking-tight">{r.subject}</p>
                    <span className={`px-5 py-2 rounded-2xl font-black text-[9px] text-white shadow-lg ${r.status === 'Present' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'}`}>{r.status}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- STORAGE SECTION (সবার জন্য উন্মুক্ত করা হয়েছে) --- */}
        <div className="animate-in fade-in duration-700">
          <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-widest text-left">Monthly Reports Archive</h3>
          <div className="mb-10 flex flex-wrap gap-2">
             {months.map(m => (
               <button key={m} onClick={() => {setSelectedMonth(m); setSelectedClassFolder(null);}} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedMonth === m ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-200'}`}>{m}</button>
             ))}
          </div>

          {!selectedClassFolder ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-10">
              {classFolders.map(cls => (
                <div key={cls} onClick={() => setSelectedClassFolder(cls)} className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border-2 border-transparent hover:border-indigo-400 cursor-pointer flex flex-col items-center group transition-all">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📂</div>
                  <h4 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-widest">Class {cls}</h4>
                  <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-tighter">VIEW REPORTS</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border transition-all">
               <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-4 text-left">
                  <h3 className="text-xl md:text-3xl font-black text-slate-800 italic tracking-tight uppercase">📁 {selectedMonth} / CLASS {selectedClassFolder}</h3>
                  <button onClick={() => setSelectedClassFolder(null)} className="text-indigo-600 font-black text-xs uppercase tracking-widest border-2 border-indigo-50 px-8 py-2.5 rounded-2xl hover:bg-indigo-50 transition-all">BACK TO DIRECTORY</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {monthFiltered.filter(a => a.class_name === selectedClassFolder).map(f => (
                   <div key={f.id} className="p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 bg-slate-50 transition-all flex flex-col justify-between group">
                     <div className="text-left">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm uppercase tracking-widest mb-4 inline-block ${f.report_type === 'Monthly' ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{f.report_type}</span>
                        <h4 className="font-black text-slate-800 text-lg mb-8 leading-tight">{f.file_name}</h4>
                     </div>
                     <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="block w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] text-center tracking-[0.3em] hover:bg-indigo-600 transition-all uppercase shadow-lg shadow-slate-200 active:scale-95">DOWNLOAD PDF</a>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* General Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 z-[400]">
           <div className="bg-white p-10 md:p-14 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl border-b-[12px] border-slate-100 animate-in zoom-in-95">
              <div className="text-7xl mb-8">{notification.type === 'success' ? '✅' : '🚨'}</div>
              <h4 className={`text-2xl font-black mb-4 tracking-tighter uppercase ${notification.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{notification.title}</h4>
              <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed italic">"{notification.message}"</p>
              <button 
                onClick={() => setNotification({ ...notification, show: false })} 
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest shadow-xl active:scale-95 transition-all uppercase"
              >
                CONTINUE
              </button>
           </div>
        </div>
      )}

    </div>
  );
}