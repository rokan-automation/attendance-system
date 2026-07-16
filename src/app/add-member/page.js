"use client";
import { useState } from 'react';
import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AddMember() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', class_name: '', session: '', roll_no: '', phone_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // সার্চ মডাল স্টেট
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchData, setSearchData] = useState({ class_name: '', session: '' });
  const [searchedStudents, setSearchedStudents] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // কাস্টম ডিলিট ওয়ার্নিং স্টেট
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const classOptions = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const sessionOptions = ['2023-24', '2024-25', '2025-26', '2026-27'];

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() || 
      !formData.class_name || 
      !formData.session || 
      !formData.roll_no.trim() || 
      !formData.phone_number.trim()
    ) {
      triggerToast("Please fill in all the academic details!", "error");
      return;
    }

    setLoading(true);

    const { data: duplicateCheck, error: checkError } = await supabase
      .from('members')
      .select('id')
      .eq('class_name', formData.class_name)
      .eq('session', formData.session)
      .eq('roll_no', formData.roll_no.trim())
      .maybeSingle();

    if (duplicateCheck) {
      triggerToast(`Roll ${formData.roll_no} already exists in Class ${formData.class_name} for Session ${formData.session}!`, "error");
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
      triggerToast("Member successfully registered!", 'success');
      setFormData({ name: '', class_name: '', session: '', roll_no: '', phone_number: '' });
    }
    setLoading(false);
  };

  const handleSearchClass = async () => {
    setSearchError('');
    setSearchedStudents([]);

    if (!searchData.class_name || !searchData.session) {
      setSearchError("Please select both Class and Session!");
      return;
    }

    setSearchLoading(true);

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('class_name', searchData.class_name)
      .eq('session', searchData.session)
      .order('roll_no', { ascending: true });

    setSearchLoading(false);

    if (error) {
      setSearchError("Error searching students: " + error.message);
    } else if (!data || data.length === 0) {
      setSearchError("No students found registered in this Class and Session.");
    } else {
      setSearchedStudents(data);
    }
  };

  const downloadStudentListPDF = () => {
    if (searchedStudents.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Registered Student List", 14, 15);
    doc.setFontSize(10);
    doc.text(`Class: Class ${searchData.class_name}`, 14, 22);
    doc.text(`Session: ${searchData.session}`, 14, 27);
    doc.text(`Total Registered Students: ${searchedStudents.length}`, 14, 32);

    autoTable(doc, {
      head: [["Roll No", "Student Name", "Guardian Phone", "Registration Date"]],
      body: searchedStudents.map(s => [
        s.roll_no, 
        s.name, 
        s.phone_number, 
        new Date(s.created_at).toLocaleDateString('en-GB')
      ]),
      startY: 38,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`Student_List_Class_${searchData.class_name}_Session_${searchData.session}.pdf`);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setSearchData({ class_name: '', session: '' });
    setSearchedStudents([]);
    setSearchError('');
  };

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberToDelete.id);

    if (error) {
      triggerToast("Failed to delete: " + error.message, 'error');
    } else {
      triggerToast("Student record deleted successfully!", 'success');
      setSearchedStudents(prev => prev.filter(s => s.id !== memberToDelete.id));
    }
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      </div>

      {/* Main Single Card Layout (মোবাইলের জন্য প্যাডিং ও কোণা অপ্টিমাইজড) */}
      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-10">
        
        {/* কাস্টম ব্যাক বাটন */}
        <button 
          onClick={() => router.back()} 
          className="absolute top-5 left-5 flex items-center gap-1 text-white hover:text-indigo-200 font-bold bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-xl transition text-[10px] sm:text-xs"
        >
          ← Back
        </button>

        <div className="text-center mb-6 mt-8 sm:mt-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">New Student</h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1 sm:mt-2">Enter student academic details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Full Name" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white placeholder-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              value={formData.name} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              onChange={e => setFormData({...formData, class_name: e.target.value})} 
              value={formData.class_name}
            >
              <option value="" className="text-gray-800">Class</option>
              {classOptions.map(c => <option key={c} value={c} className="text-gray-800">{c}</option>)}
            </select>
            
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              onChange={e => setFormData({...formData, session: e.target.value})} 
              value={formData.session}
            >
              <option value="" className="text-gray-800">Session</option>
              {sessionOptions.map(s => <option key={s} value={s} className="text-gray-800">{s}</option>)}
            </select>
          </div>

          <input 
            type="text" 
            placeholder="Roll Number" 
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white placeholder-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
            onChange={e => setFormData({...formData, roll_no: e.target.value})} 
            value={formData.roll_no} 
          />
            
          <input 
            type="tel" 
            placeholder="Guardian Phone" 
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white placeholder-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
            onChange={e => setFormData({...formData, phone_number: e.target.value})} 
            value={formData.phone_number} 
          />

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3.5 sm:py-4 rounded-2xl transition-transform hover:scale-[1.02] shadow-lg shadow-indigo-500/30 text-xs sm:text-sm"
          >
            {loading ? 'Processing...' : 'Register Student'}
          </button>
        </form>

        <div className="text-center mt-5 sm:mt-6">
          <button 
            type="button"
            onClick={() => { setShowSearchModal(true); setSearchError(''); setSearchedStudents([]); }}
            className="text-indigo-300 hover:text-white text-[10px] sm:text-xs font-semibold underline transition-colors"
          >
            Duplicate roll error? Search by Class & Manage
          </button>
        </div>
      </div>

      {/* সার্চ মডাল */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40 p-4">
          <div className="bg-slate-800/95 border border-white/10 p-5 sm:p-6 rounded-3xl max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <button 
              onClick={closeSearchModal} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base font-bold"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-white mb-1">Search & Manage Class</h3>
            <p className="text-indigo-200 text-[10px] sm:text-xs mb-4">Select Class and Session to search registered students</p>

            <div className="space-y-3 mb-4 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs outline-none"
                  onChange={e => setSearchData({...searchData, class_name: e.target.value})} 
                  value={searchData.class_name}
                >
                  <option value="" className="text-gray-800">Class</option>
                  {classOptions.map(c => <option key={c} value={c} className="text-gray-800">{c}</option>)}
                </select>
                
                <select 
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs outline-none"
                  onChange={e => setSearchData({...searchData, session: e.target.value})} 
                  value={searchData.session}
                >
                  <option value="" className="text-gray-800">Session</option>
                  {sessionOptions.map(s => <option key={s} value={s} className="text-gray-800">{s}</option>)}
                </select>
              </div>

              <button 
                onClick={handleSearchClass}
                disabled={searchLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                {searchLoading ? 'Searching records...' : 'Search Class Students'}
              </button>
            </div>

            {searchedStudents.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-3 shrink-0 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-200">Total: {searchedStudents.length}</span>
                  <button 
                    onClick={downloadStudentListPDF}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Download List (PDF)
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                  {searchedStudents.map(student => (
                    <div key={student.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-3 sm:p-4 rounded-2xl hover:bg-white/10 transition gap-2">
                      <div className="text-left min-w-0">
                        <h4 className="font-bold text-white text-xs sm:text-sm truncate">{student.name}</h4>
                        <p className="text-[9px] sm:text-[10px] text-indigo-200 mt-0.5">
                          Roll: {student.roll_no} | Phone: {student.phone_number}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDeleteClick(student)}
                        className="bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white font-bold px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs transition-colors shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchError && (
              <div className="mt-4 text-[10px] sm:text-xs text-red-400 font-semibold bg-red-500/10 p-3 rounded-xl border border-red-500/20 shrink-0">
                ⚠️ {searchError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ডিলিট মডাল */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 p-5 sm:p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
              ⚠️
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white mb-2">Delete Student?</h4>
            <p className="text-xs sm:text-sm text-indigo-200 mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{memberToDelete?.name}</strong> (Roll: {memberToDelete?.roll_no}, Class: {memberToDelete?.class_name}, Session: {memberToDelete?.session})? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs sm:text-sm transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-6 px-5 py-2.5 rounded-full text-white font-bold shadow-2xl z-50 animate-bounce text-xs sm:text-sm ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}