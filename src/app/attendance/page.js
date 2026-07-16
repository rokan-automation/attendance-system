"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AttendancePanel() {
  const router = useRouter();
  const schoolName = "Birganj Govt. College"; 

  // --- States ---
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(''); 
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const selectedDate = new Date().toISOString().split('T')[0];
  const displayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentMonthFolder = new Date().toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-');
  
  // Custom Controls
  const [sendSMS, setSendSMS] = useState(true);
  const [needsReset, setNeedsReset] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'alert', onConfirm: null });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [pendingRecords, setPendingRecords] = useState([]);

  // --- Helpers ---
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  // --- Logic Fix for Hydration & Sorting ---
  const sortedClassNames = useMemo(() => {
    const order = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
    return [...new Set(members.map(m => m.class_name))].sort((a, b) => {
      const aL = a.toLowerCase(), bL = b.toLowerCase();
      let aV = parseInt(aL.replace(/\D/g, '')) || order[aL] || 0;
      let bV = parseInt(bL.replace(/\D/g, '')) || order[bL] || 0;
      return aV - bV || a.localeCompare(b);
    });
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const mClass = selectedClass === '' || m.class_name === selectedClass;
      const mSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.roll_no.toString().includes(searchTerm);
      return mClass && mSearch;
    });
  }, [members, selectedClass, searchTerm]);

  const handleMarkAttendance = (id, status) => {
    setAttendanceRecords(prev => ({ ...prev, [id]: prev[id] === status ? undefined : status }));
  };

  const archivePdfToStorage = async (pdfDoc, fileName, className, type = 'Daily') => {
    try {
      const pdfBlob = pdfDoc.output('blob');
      const filePath = `${currentMonthFolder}/${className}/${fileName}`;
      await supabase.storage.from('attendance-archives').upload(filePath, pdfBlob, { upsert: true });
      const { data: urlData } = supabase.storage.from('attendance-archives').getPublicUrl(filePath);
      await supabase.from('archives').upsert({
        file_name: fileName, file_url: urlData.publicUrl, report_type: type,
        class_name: className, subject: selectedSubject || 'Summary', month_folder: currentMonthFolder
      }, { onConflict: 'file_name' });
    } catch (e) { console.error(e); }
  };

  const handleEndMonthProcess = async () => {
    setModal({ show: false }); setLoading(true);
    try {
      const { data: mData } = await supabase.from('attendance').select('*');
      if (!mData?.length) { showToast("No data to archive!", "error"); setLoading(false); return; }
      const uniqueClasses = [...new Set(members.map(m => m.class_name))];
      for (const cls of uniqueClasses) {
        const classMembers = members.filter(m => m.class_name === cls);
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text(schoolName, 14, 15);
        autoTable(doc, { head: [["Roll", "Name", "P", "A"]], body: classMembers.map(m => {
            const logs = mData.filter(r => r.member_id === m.id);
            return [m.roll_no, m.name, logs.filter(l => l.status === 'Present').length, logs.filter(l => l.status === 'Absent').length];
          }), startY: 25, headStyles: { fillColor: [79, 70, 229] }
        });
        await archivePdfToStorage(doc, `Final_Summary_${cls}_${currentMonthFolder}.pdf`, cls, 'Monthly');
      }
      await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setNeedsReset(false); showToast("Reports Generated & Cleared!", "success"); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setLoading(false); }
  };

  const handlePreSubmitCheck = async () => {
    if (!selectedClass || !selectedSubject) return showToast("Select Class & Subject!", "error");
    const recs = Object.entries(attendanceRecords).filter(([_, s]) => s).map(([id, s]) => ({ member_id: id, status: s, attendance_date: selectedDate, subject: selectedSubject }));
    if (!recs.length) return showToast("Mark attendance!", "error");

    setSubmitLoading(true);
    try {
      const { data } = await supabase.from('attendance').select('id').eq('attendance_date', selectedDate).eq('subject', selectedSubject).in('member_id', members.filter(m => m.class_name === selectedClass).map(m => m.id)).limit(1);
      if (data?.length > 0) {
        setModal({ show: true, title: "Duplicate Entry", message: "Today's attendance for this class has already been submitted.", type: 'alert', onConfirm: () => setModal({show:false}) });
      } else {
        setPendingRecords(recs); setIsSubmitModalOpen(true);
      }
    } catch (e) { showToast("Check Error", "error"); } finally { setSubmitLoading(false); }
  };

  const confirmSubmitAttendance = async () => {
    setIsSubmitModalOpen(false); setSubmitLoading(true);
    try {
      const { error } = await supabase.from('attendance').upsert(pendingRecords, { onConflict: 'member_id,attendance_date,subject' });
      if (error) throw error;

      if (sendSMS) {
        const smsPromises = pendingRecords.map(r => {
          const m = members.find(mem => mem.id === r.member_id);
          if (m?.phone_number) return fetch('https://yennarzfeuqyfewetdos.supabase.co/functions/v1/send-sms', { method: 'POST', body: JSON.stringify({ phone: m.phone_number, message: `Guardian, child ${m.name} is ${r.status} today in ${selectedSubject}.` }) }).catch(() => null);
          return null;
        });
        Promise.allSettled(smsPromises);
      }

      const doc = new jsPDF();
      doc.setFontSize(16); doc.text(schoolName, 14, 15);
      doc.setFontSize(12); doc.text(`Date: ${selectedDate} | Class: ${selectedClass} | Subject: ${selectedSubject}`, 14, 25);
      autoTable(doc, { head: [["Roll", "Name", "Status"]], body: filteredMembers.map(m => [m.roll_no, m.name, attendanceRecords[m.id] || "Unmarked"]), startY: 30, headStyles: { fillColor: [79, 70, 229] } });
      await archivePdfToStorage(doc, `${selectedDate}_${selectedSubject}.pdf`, selectedClass);

      showToast("Sync Completed!", "success");
      setAttendanceRecords({}); setSelectedClass(''); setSelectedSubject('');
    } catch (e) { showToast(e.message, "error"); } finally { setSubmitLoading(false); }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (localStorage.getItem('isAdmin') !== 'true') { router.push('/archives'); return; }
      const { data } = await supabase.from('members').select('*').order('roll_no', { ascending: true });
      setMembers(data || []);
      const { data: lastRec } = await supabase.from('attendance').select('attendance_date').order('attendance_date', { ascending: false }).limit(1);
      if (lastRec?.length && new Date().getMonth() !== new Date(lastRec[0].attendance_date).getMonth()) setNeedsReset(true);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-600 text-white font-black text-xl animate-pulse">BOOTING...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-2 sm:p-10 font-sans select-none">
      {toast.show && <div key="toast-box" className="fixed top-5 right-5 z-[200] px-8 py-4 rounded-2xl bg-emerald-500 text-white font-black shadow-2xl animate-in fade-in slide-in-from-top-4">{toast.message}</div>}

      <div className="max-w-5xl mx-auto pb-24 sm:pb-0">
        {/* Header */}
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-xl border flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
           <div className="text-center sm:text-left">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em]">Live Smart Desk</span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tighter mt-1">{displayDate}</h2>
           </div>
           <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={() => needsReset && setModal({show: true, title: "Archive Month?", message: "This will clear data and create final reports. Proceed?", type: 'confirm', onConfirm: handleEndMonthProcess})} className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-xs transition shadow-lg ${needsReset ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>RESET MONTH</button>
              <button onClick={() => router.push('/archives')} className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg">STORAGE</button>
              <button onClick={() => router.back()} className="flex-1 sm:flex-none bg-white border-2 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs">BACK</button>
           </div>
        </div>

        {/* Minimal Filters */}
        <div className="bg-white p-4 sm:p-8 rounded-[2.5rem] shadow-lg border flex flex-col gap-5 mb-6">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                 <span className="text-xs font-black text-indigo-600 uppercase">SMS</span>
                 <label className="relative inline-flex items-center cursor-pointer scale-110">
                    <input type="checkbox" checked={sendSMS} onChange={(e) => setSendSMS(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:after:translate-x-full"></div>
                 </label>
              </div>
              <input type="text" placeholder="Search students by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-slate-50 px-8 py-4 rounded-3xl outline-none font-bold text-slate-600 border focus:bg-white transition-all" />
           </div>
           <div className="flex flex-col md:flex-row gap-4">
              <select value={selectedClass} onChange={(e) => { if(needsReset) return setModal({show:true, title:"Month End Required", message:"Please perform 'End Month & Reset' to start new term.", onConfirm: handleEndMonthProcess}); setSelectedClass(e.target.value); }} className="flex-1 bg-indigo-50/50 px-8 py-4 rounded-3xl font-black text-indigo-600 text-sm outline-none cursor-pointer appearance-none text-center">
                 <option value="">CLASS</option>
                 {sortedClassNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="flex-1 bg-indigo-50/50 px-8 py-4 rounded-3xl font-black text-indigo-600 text-sm outline-none cursor-pointer appearance-none text-center">
                 <option value="">SUBJECT</option>
                 <option value="Bangla">Bangla</option><option value="English">English</option><option value="Math">Math</option>
              </select>
           </div>
        </div>

        <div className="mb-4 flex justify-end">
           <button onClick={() => { if(!selectedClass) return showToast("Select class!", "error"); const upd = {...attendanceRecords}; filteredMembers.forEach(m => { if(!upd[m.id]) upd[m.id] = 'Absent'; }); setAttendanceRecords(upd); }} className="bg-amber-400 text-white font-black py-4 px-10 rounded-2xl text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest">MARK ALL ABSENT</button>
        </div>

        {/* List Section - Fixed for Child Nodes */}
        <div className="bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl border overflow-hidden mb-12 relative min-h-[300px]">
           {!selectedClass && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center font-black text-slate-300 uppercase tracking-widest text-sm">Select Class First</div>}
           <div className="divide-y divide-slate-50 max-h-[50vh] overflow-y-auto">
              {filteredMembers.map(m => (
                 <div key={`student-${m.id}`} className="p-5 sm:p-8 flex justify-between items-center hover:bg-indigo-50/30 active:bg-slate-100 transition-colors">
                    <div className="min-w-0">
                       <h3 className="font-black text-slate-800 text-sm sm:text-lg truncate">{m.name}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Roll: {m.roll_no} | {m.class_name}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleMarkAttendance(m.id, 'Present')} className={`px-5 py-3 sm:px-10 sm:py-4 rounded-xl font-black text-[9px] sm:text-xs transition-all shadow-sm ${attendanceRecords[m.id] === 'Present' ? 'bg-emerald-500 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400'}`}>PRESENT</button>
                       <button onClick={() => handleMarkAttendance(m.id, 'Absent')} className={`px-5 py-3 sm:px-10 sm:py-4 rounded-xl font-black text-[9px] sm:text-xs transition-all shadow-sm ${attendanceRecords[m.id] === 'Absent' ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400'}`}>ABSENT</button>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <div className="fixed bottom-4 left-0 right-0 px-4 z-[100] max-w-4xl mx-auto sm:relative sm:bottom-0 sm:px-0">
           <button onClick={handlePreSubmitCheck} disabled={submitLoading} className="w-full bg-indigo-600 py-6 sm:py-8 rounded-[2rem] sm:rounded-[3rem] text-white font-black text-xs sm:text-lg shadow-2xl tracking-[0.3em] active:scale-95 transition-all uppercase">{submitLoading ? 'PROCESSING...' : 'SUBMIT TODAY\'S DATA'}</button>
        </div>
      </div>

      {/* --- MODAL SYSTEM - FIXED STRUCTURE --- */}
      {modal.show && (
        <div key="custom-modal-overlay" className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
           <div className="bg-white p-10 sm:p-14 rounded-[4rem] text-center max-w-sm w-full shadow-2xl border-t-[12px] border-rose-500">
              <div className="text-6xl mb-6">⚠️</div>
              <h4 className="text-xl font-black text-slate-800 mb-2">{modal.title}</h4>
              <p className="text-slate-500 text-xs mb-8 italic leading-relaxed">{modal.message}</p>
              <div className="flex gap-2">
                 {modal.type === 'confirm' && <button onClick={() => setModal({show:false})} className="flex-1 bg-slate-100 py-3 rounded-2xl font-bold text-slate-400">CANCEL</button>}
                 <button onClick={modal.onConfirm} className="flex-1 bg-rose-500 text-white py-3 rounded-2xl font-black shadow-lg">PROCEED</button>
              </div>
           </div>
        </div>
      )}

      {isSubmitModalOpen && (
        <div key="submit-modal-overlay" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
           <div className="bg-white p-10 sm:p-14 rounded-[4rem] text-center max-w-sm w-full shadow-2xl border-t-[10px] border-indigo-500">
              <h4 className="text-xl font-black text-slate-800 mb-2 tracking-widest">Finalize?</h4>
              <p className="text-slate-500 text-xs mb-8 italic">Attendance will be archived in folders.</p>
              <div className="flex gap-3">
                 <button onClick={() => setIsSubmitModalOpen(false)} className="flex-1 bg-slate-50 py-3 rounded-2xl font-bold">CANCEL</button>
                 <button onClick={confirmSubmitAttendance} className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black shadow-lg">CONFIRM</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}