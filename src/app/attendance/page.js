"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AttendancePanel() {
  const router = useRouter();
  const schoolName = "Birganj Govt. College"; 

  // --- নিরাপত্তা চেক ---
  useEffect(() => {
    const auth = localStorage.getItem("isLoggedIn");
    if (auth !== "true") {
      router.push("/");
    }
  }, [router]);

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
  
  const [sendSMS, setSendSMS] = useState(true);
  const [needsReset, setNeedsReset] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'alert', onConfirm: null });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [pendingRecords, setPendingRecords] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

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
      const { data } = await supabase.from('members').select('*').order('roll_no', { ascending: true });
      setMembers(data || []);
      const { data: lastRec } = await supabase.from('attendance').select('attendance_date').order('attendance_date', { ascending: false }).limit(1);
      if (lastRec?.length && new Date().getMonth() !== new Date(lastRec[0].attendance_date).getMonth()) setNeedsReset(true);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-600 text-white font-black text-xl animate-pulse">BOOTING...</div>;

  return (
    <div className="min-h-screen bg-[#F3F6F9] p-4 md:p-10 font-sans select-none text-slate-800">
      {toast.show && <div key="toast-box" className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-8 py-3 rounded-full bg-emerald-500 text-white font-black shadow-2xl animate-in slide-in-from-top-4">{toast.message}</div>}

      <div className="max-w-4xl mx-auto pb-24">
        
        {/* বিকাশ অ্যাপ স্টাইল হেডার */}
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
           <div className="text-center md:text-left">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Live Smart Desk</span>
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter mt-1">{displayDate}</h2>
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => router.push('/archives')} className="flex-1 bg-slate-100 text-slate-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Storage</button>
              <button onClick={() => router.push('/')} className="flex-1 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">Back</button>
           </div>
        </div>

        {/* ফিল্টার সেকশন */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-lg shadow-slate-200/50 border border-white flex flex-col gap-6 mb-8">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center justify-between gap-6 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex-1 md:flex-none">
                 <span className="text-[10px] font-black text-indigo-600 uppercase">SMS Report</span>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={sendSMS} onChange={(e) => setSendSMS(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:after:translate-x-full"></div>
                 </label>
              </div>
              <input type="text" placeholder="Search students by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-slate-50 px-6 py-4 rounded-2xl outline-none font-bold text-slate-600 border border-slate-100 focus:bg-white transition-all text-sm" />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <select value={selectedClass} onChange={(e) => { if(needsReset) return setModal({show:true, title:"Month End Required", message:"Please perform 'End Month & Reset' to start new term.", onConfirm: handleEndMonthProcess}); setSelectedClass(e.target.value); }} className="bg-indigo-50/50 px-6 py-4 rounded-2xl font-black text-indigo-600 text-[10px] uppercase tracking-widest outline-none cursor-pointer appearance-none text-center border border-indigo-100">
                 <option value="">Select Class</option>
                 {sortedClassNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="bg-indigo-50/50 px-6 py-4 rounded-2xl font-black text-indigo-600 text-[10px] uppercase tracking-widest outline-none cursor-pointer appearance-none text-center border border-indigo-100">
                 <option value="">Select Subject</option>
                 <option value="Bangla">Bangla</option><option value="English">English</option><option value="Math">Math</option>
              </select>
           </div>
        </div>

        <div className="mb-6 flex justify-between items-center px-4">
           <button onClick={() => needsReset && setModal({show: true, title: "Archive Month?", message: "This will clear data and create final reports. Proceed?", type: 'confirm', onConfirm: handleEndMonthProcess})} className={`text-[10px] font-black transition-all underline tracking-widest uppercase ${needsReset ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>Reset Month</button>
           <button onClick={() => { if(!selectedClass) return showToast("Select class!", "error"); const upd = {...attendanceRecords}; filteredMembers.forEach(m => { if(!upd[m.id]) upd[m.id] = 'Absent'; }); setAttendanceRecords(upd); }} className="bg-amber-400 text-white font-black py-3 px-8 rounded-2xl text-[10px] shadow-lg active:scale-95 transition-all uppercase tracking-widest">Mark All Absent</button>
        </div>

        {/* স্টুডেন্ট লিস্ট */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden mb-12 relative min-h-[300px]">
           {!selectedClass && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center font-black text-slate-300 uppercase tracking-widest text-sm">Select Class First</div>}
           <div className="divide-y divide-slate-50">
              {filteredMembers.map(m => (
                 <div key={`student-${m.id}`} className="p-6 md:p-8 flex justify-between items-center hover:bg-slate-50 active:bg-slate-100 transition-colors">
                    <div className="min-w-0 text-left">
                       <h3 className="font-black text-slate-800 text-sm md:text-lg truncate">{m.name}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Roll: {m.roll_no} | Class {m.class_name}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleMarkAttendance(m.id, 'Present')} className={`px-4 py-2.5 md:px-8 md:py-3 rounded-xl font-black text-[9px] md:text-xs transition-all ${attendanceRecords[m.id] === 'Present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105' : 'bg-slate-50 text-slate-300'}`}>Present</button>
                       <button onClick={() => handleMarkAttendance(m.id, 'Absent')} className={`px-4 py-2.5 md:px-8 md:py-3 rounded-xl font-black text-[9px] md:text-xs transition-all ${attendanceRecords[m.id] === 'Absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-100 scale-105' : 'bg-slate-50 text-slate-300'}`}>Absent</button>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* সাবমিট বাটন - নিচে ফিক্সড */}
        <div className="fixed bottom-6 left-0 right-0 px-6 z-[100] max-w-md mx-auto md:relative md:bottom-0 md:px-0 md:max-w-none">
           <button onClick={handlePreSubmitCheck} disabled={submitLoading} className="w-full bg-indigo-600 py-6 md:py-7 rounded-[2rem] text-white font-black text-xs md:text-sm shadow-xl shadow-indigo-100 tracking-[0.2em] active:scale-95 transition-all uppercase">{submitLoading ? 'Processing...' : "Submit Today's Data"}</button>
        </div>
      </div>

      {/* মডাল সিস্টেম */}
      {modal.show && (
        <div key="custom-modal-overlay" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-[300]">
           <div className="bg-white p-8 md:p-12 rounded-[3rem] text-center max-w-sm w-full shadow-2xl border-t-[10px] border-rose-500">
              <div className="text-5xl mb-6">⚠️</div>
              <h4 className="text-lg font-black text-slate-800 mb-2">{modal.title}</h4>
              <p className="text-slate-500 text-[10px] mb-8 font-medium italic leading-relaxed">{modal.message}</p>
              <div className="flex gap-2">
                 {modal.type === 'confirm' && <button onClick={() => setModal({show:false})} className="flex-1 bg-slate-100 py-3 rounded-2xl font-bold text-slate-400 text-xs">Cancel</button>}
                 <button onClick={modal.onConfirm} className="flex-1 bg-rose-500 text-white py-3 rounded-2xl font-black shadow-lg text-xs">Proceed</button>
              </div>
           </div>
        </div>
      )}

      {isSubmitModalOpen && (
        <div key="submit-modal-overlay" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-[200]">
           <div className="bg-white p-8 md:p-12 rounded-[3rem] text-center max-w-sm w-full shadow-2xl border-t-[10px] border-indigo-500">
              <h4 className="text-lg font-black text-slate-800 mb-2 tracking-widest uppercase">Finalize?</h4>
              <p className="text-slate-500 text-[10px] mb-8 font-medium italic">Attendance will be archived in folders.</p>
              <div className="flex gap-3">
                 <button onClick={() => setIsSubmitModalOpen(false)} className="flex-1 bg-slate-50 py-3 rounded-2xl font-bold text-xs uppercase">Cancel</button>
                 <button onClick={confirmSubmitAttendance} className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black shadow-lg text-xs uppercase">Confirm</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}