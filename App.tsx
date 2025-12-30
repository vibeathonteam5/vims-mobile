
import React, { useState, useEffect } from 'react';
import { Visitor, VisitorPersona } from './types';
import Scanner from './components/Scanner';

// --- Helper Data & Logic ---
const LOCATIONS = [
  { id: 'TOWER_A', label: 'Tower A (Finance)', parkingZone: 'Zone A', navLink: '/nav/tower-a' },
  { id: 'TOWER_B', label: 'Tower B (Tech Hub)', parkingZone: 'Zone B', navLink: '/nav/tower-b' },
  { id: 'TOWER_C', label: 'Tower C (Ops)', parkingZone: 'Zone C', navLink: '/nav/tower-c' },
  { id: 'ANNEX', label: 'Convention Ctr', parkingZone: 'Zone D', navLink: '/nav/annex' },
];

const PURPOSES = [
  { label: 'Business Meeting', persona: 'CORPORATE_VISITOR' as VisitorPersona },
  { label: 'Site Maintenance', persona: 'CONTRACTOR' as VisitorPersona },
  { label: 'Delivery / Logistics', persona: 'DELIVERY' as VisitorPersona },
  { label: 'Job Interview', persona: 'INTERVIEW_CANDIDATE' as VisitorPersona },
  { label: 'VIP Visit', persona: 'VIP' as VisitorPersona },
  { label: 'Staff Entry', persona: 'INTERNAL_STAFF' as VisitorPersona },
];

// Map Coordinates based on the "Premise Map" reference image
const MAP_NODES: Record<string, { x: number, y: number, label: string, type: 'TOWER' | 'AMENITY_CIRCLE' | 'AMENITY_RECT' | 'GUARD' }> = {
  // Guard Houses
  'GUARD_A': { x: 25, y: 88, label: 'Guard House A', type: 'GUARD' }, // Bottom Left (Main)
  'GUARD_B': { x: 92, y: 62, label: 'Guard House B', type: 'GUARD' }, // Right side

  // Corporate Zone
  'TOWER_A': { x: 38, y: 35, label: 'Tower 1 (HQ)', type: 'TOWER' },
  'TOWER_B': { x: 62, y: 35, label: 'Tower 2', type: 'TOWER' },
  'TOWER_C': { x: 50, y: 52, label: 'Tower 3', type: 'TOWER' },

  // Amenities / Outer
  'ANNEX': { x: 15, y: 20, label: 'Convention Ctr', type: 'AMENITY_CIRCLE' }, // Top Left
  'MOSQUE': { x: 88, y: 20, label: 'Mosque', type: 'AMENITY_CIRCLE' }, // Top Right
  'SPORTS': { x: 85, y: 88, label: 'Sports Field', type: 'AMENITY_RECT' }, // Bottom Right
};

const App: React.FC = () => {
  // --- State Machine: 'SCAN' -> 'AUTH_MANUAL_ENTRY' -> 'MANUAL_ENTRY' -> 'DETAILS' -> 'KIOSK_SUCCESS' -> 'PASS' -> 'NAVIGATION' ---
  const [step, setStep] = useState<'SCAN' | 'AUTH_MANUAL_ENTRY' | 'MANUAL_ENTRY' | 'DETAILS' | 'KIOSK_SUCCESS' | 'PASS' | 'NAVIGATION'>('SCAN');
  
  // --- Data State ---
  const [scannedIdentity, setScannedIdentity] = useState<{ 
      name: string; 
      id: string; 
      isStaff: boolean; 
      department?: string 
  } | null>(null);

  const [formData, setFormData] = useState({
    destination: LOCATIONS[0],
    purpose: PURPOSES[0],
    duration: 2, // hours
  });
  const [generatedPass, setGeneratedPass] = useState<Visitor | null>(null);

  // Manual Entry State
  const [auxPoliceId, setAuxPoliceId] = useState('');
  const [manualEntryData, setManualEntryData] = useState({
      name: '',
      ic: '',
      email: '',
      phone: '',
      company: '',
      purpose: PURPOSES[0].label,
      venue: LOCATIONS[0].id,
      duration: 2
  });

  // --- Handlers ---

  const handleScanComplete = (data: { id?: string; name?: string; identityType?: 'GOVT_ID' | 'STAFF_ID'; department?: string }) => {
    if (data.name && data.id) {
      const isStaff = data.identityType === 'STAFF_ID';
      
      setScannedIdentity({ 
          name: data.name, 
          id: data.id, 
          isStaff,
          department: data.department 
      });

      // If Staff, auto-select staff purpose
      if (isStaff) {
          const staffPurpose = PURPOSES.find(p => p.persona === 'INTERNAL_STAFF');
          if (staffPurpose) {
              setFormData(prev => ({ ...prev, purpose: staffPurpose, duration: 9 }));
          }
      }

      setStep('DETAILS');
    }
  };

  const handleGeneratePass = () => {
    if (!scannedIdentity) return;

    // Simulate parking allocation logic
    const parkingSlot = `${formData.destination.parkingZone}-0${Math.floor(Math.random() * 9) + 1}`;

    const newPass: Visitor = {
      id: scannedIdentity.id,
      name: scannedIdentity.name,
      nric: scannedIdentity.id, // Store IC Number explicitly
      tower: formData.destination.label,
      floor: scannedIdentity.isStaff ? 'Level 8 (Staff Hub)' : 'Lobby',
      purpose: formData.purpose.label,
      persona: formData.purpose.persona,
      durationHours: formData.duration,
      status: 'CHECKED_IN',
      checkInTime: new Date().toISOString(),
      qrCode: `QR_${scannedIdentity.id}_${Date.now()}`,
      accessType: 'FACE',
      evRequired: false,
      parkingSlot: parkingSlot,
      department: scannedIdentity.department
    };

    setGeneratedPass(newPass);
    setStep('KIOSK_SUCCESS');
  };

  const handleAuxAuth = (e: React.FormEvent) => {
      e.preventDefault();
      if (auxPoliceId.trim().length > 0) {
          setStep('MANUAL_ENTRY');
      }
  };

  const handleManualEntrySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const destination = LOCATIONS.find(l => l.id === manualEntryData.venue) || LOCATIONS[0];
      const purposeObj = PURPOSES.find(p => p.label === manualEntryData.purpose) || PURPOSES[0];
      const parkingSlot = `${destination.parkingZone}-0${Math.floor(Math.random() * 9) + 1}`;
      
      const newPass: Visitor = {
          id: manualEntryData.ic,
          name: manualEntryData.name.toUpperCase(),
          nric: manualEntryData.ic,
          tower: destination.label,
          floor: 'Lobby',
          purpose: purposeObj.label,
          persona: purposeObj.persona,
          durationHours: manualEntryData.duration,
          status: 'CHECKED_IN',
          checkInTime: new Date().toISOString(),
          qrCode: `QR_${manualEntryData.ic}_${Date.now()}`,
          accessType: 'QR', // Manual entry defaults to QR access since face isn't captured
          evRequired: false,
          parkingSlot: parkingSlot,
          department: manualEntryData.company
      };

      setGeneratedPass(newPass);
      // Update form data state to match for consistent pass viewing
      setFormData({
          destination: destination,
          purpose: purposeObj,
          duration: manualEntryData.duration
      });
      setStep('KIOSK_SUCCESS');
  };

  const resetFlow = () => {
    setStep('SCAN');
    setScannedIdentity(null);
    setGeneratedPass(null);
    setAuxPoliceId('');
    setFormData({
      destination: LOCATIONS[0],
      purpose: PURPOSES[0],
      duration: 2,
    });
    setManualEntryData({
        name: '',
        ic: '',
        email: '',
        phone: '',
        company: '',
        purpose: PURPOSES[0].label,
        venue: LOCATIONS[0].id,
        duration: 2
    });
  };

  // --- Render Steps ---

  const renderScanStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-in fade-in duration-700 px-4">
      <div className="text-center mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-900/30 rounded-full border border-blue-500/30 mb-4">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
          <span className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Gate Control Active</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3 md:mb-4">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Vanguard HQ</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-lg">Please scan your <span className="text-white font-bold">National ID</span> or <span className="text-amber-400 font-bold">Staff Badge</span>.</p>
      </div>

      <div className="w-full max-w-md">
        {/* Key forces remount on reset */}
        <Scanner 
            key="main-scanner" 
            mode="FACE" 
            onScan={handleScanComplete} 
            onRequestManual={() => setStep('AUTH_MANUAL_ENTRY')}
        />
      </div>
    </div>
  );

  const renderAuthManualEntryStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-100">
            <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-600"></div>
                 {/* Decorative background logo */}
                 <div className="absolute -top-6 -right-6 text-white/5 transform rotate-12 pointer-events-none">
                     <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                 </div>
                 
                 <div className="w-16 h-16 bg-amber-500 rounded-xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg transform rotate-3 border-2 border-amber-300">
                    🛡️
                 </div>
                 <h2 className="text-2xl font-black text-white mb-2">Security Override</h2>
                 <p className="text-slate-400 text-sm font-medium">Restricted Access: Auxiliary Police Only</p>
            </div>
            <form onSubmit={handleAuxAuth} className="p-8 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Staff Badge ID</label>
                    <div className="relative">
                        <input 
                            autoFocus
                            type="text" 
                            value={auxPoliceId}
                            onChange={(e) => setAuxPoliceId(e.target.value.toUpperCase())}
                            placeholder="e.g. AUX-88"
                            className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 placeholder:text-base placeholder:font-normal"
                            required
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                        </div>
                    </div>
                </div>
                <button 
                    type="submit" 
                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-lg shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                >
                    <span>VERIFY IDENTITY</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                </button>
                <button 
                    type="button" 
                    onClick={() => setStep('SCAN')}
                    className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors uppercase tracking-wider text-sm"
                >
                    Cancel Override
                </button>
            </form>
        </div>
    </div>
  );

  const renderManualEntryStep = () => (
    <div className="flex flex-col items-center justify-center min-h-full py-6 md:py-10 max-w-2xl mx-auto w-full animate-in slide-in-from-right-8 duration-500 px-4">
      <div className="bg-white w-full rounded-3xl md:rounded-[40px] shadow-2xl overflow-hidden border-2 border-slate-100">
        <div className="bg-slate-900 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/></svg>
            </div>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg border-2 border-amber-300">
                    👮‍♂️
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">Manual Visitor Entry</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-emerald-400 text-xs font-mono font-bold uppercase">Officer ID: {auxPoliceId}</p>
                    </div>
                </div>
            </div>
        </div>

        <form onSubmit={handleManualEntrySubmit} className="p-5 md:p-8 space-y-6">
            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                    <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" 
                        value={manualEntryData.name} onChange={e => setManualEntryData({...manualEntryData, name: e.target.value})} placeholder="Visitor Name" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">IC / Passport No.</label>
                    <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" 
                        value={manualEntryData.ic} onChange={e => setManualEntryData({...manualEntryData, ic: e.target.value})} placeholder="ID Number" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                    <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" 
                        value={manualEntryData.email} onChange={e => setManualEntryData({...manualEntryData, email: e.target.value})} placeholder="email@example.com" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                    <input required type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" 
                        value={manualEntryData.phone} onChange={e => setManualEntryData({...manualEntryData, phone: e.target.value})} placeholder="+60..." />
                </div>
            </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company / Organization</label>
                <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" 
                    value={manualEntryData.company} onChange={e => setManualEntryData({...manualEntryData, company: e.target.value})} placeholder="Company Name" />
            </div>

            <div className="w-full h-px bg-slate-200 my-4"></div>

            {/* Visit Details */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Purpose of Visit</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                        value={manualEntryData.purpose} onChange={e => setManualEntryData({...manualEntryData, purpose: e.target.value})}>
                        {PURPOSES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Venue / Location</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                        value={manualEntryData.venue} onChange={e => setManualEntryData({...manualEntryData, venue: e.target.value})}>
                        {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>
                </div>
            </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Duration of Access (Hours)</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <input 
                    type="range" min="1" max="12" step="0.5" 
                    value={manualEntryData.duration}
                    onChange={(e) => setManualEntryData({...manualEntryData, duration: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="w-12 text-center font-black text-lg text-slate-900">{manualEntryData.duration}h</div>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep('SCAN')} className="flex-1 py-4 font-bold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors uppercase tracking-wider">
                    CANCEL
                </button>
                <button type="submit" className="flex-[2] py-4 font-black rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 active:scale-95 transition-all">
                    AUTHORIZE ACCESS
                </button>
            </div>
        </form>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="flex flex-col items-center justify-center min-h-full py-6 md:py-10 max-w-2xl mx-auto w-full animate-in slide-in-from-right-8 duration-500 px-4">
      <div className="bg-white w-full rounded-3xl md:rounded-[40px] shadow-2xl overflow-hidden border-2 border-slate-100">
        {/* Header */}
        <div className={`p-6 md:p-8 text-center relative overflow-hidden ${scannedIdentity?.isStaff ? 'bg-slate-900' : 'bg-slate-900'}`}>
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${scannedIdentity?.isStaff ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-emerald-500'}`}></div>
          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-slate-700 shadow-xl ${scannedIdentity?.isStaff ? 'bg-slate-800' : 'bg-slate-800'}`}>
             <span className="text-2xl md:text-3xl">{scannedIdentity?.isStaff ? '🏢' : '👋'}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
            {scannedIdentity?.isStaff ? `Welcome back, ${scannedIdentity.name.split(' ')[0]}` : `Hi, ${scannedIdentity?.name}`}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${scannedIdentity?.isStaff ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {scannedIdentity?.isStaff ? 'STAFF MEMBER' : 'VISITOR'}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 md:p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                {scannedIdentity?.isStaff ? 'Select Work Location' : 'Where are you heading?'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setFormData({ ...formData, destination: loc })}
                  className={`p-3 md:p-4 rounded-xl border-2 text-left transition-all active:scale-98 ${
                    formData.destination.id === loc.id 
                      ? 'border-blue-600 bg-blue-50 text-blue-900' 
                      : 'border-slate-100 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="font-bold text-sm">{loc.label}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Parking: {loc.parkingZone}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Purpose</label>
              <div className="relative">
                <select 
                    className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${scannedIdentity?.isStaff ? 'opacity-75 pointer-events-none' : ''}`}
                    value={formData.purpose.label}
                    onChange={(e) => {
                    const p = PURPOSES.find(x => x.label === e.target.value);
                    if (p) setFormData({...formData, purpose: p});
                    }}
                >
                    {PURPOSES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Duration (Hours)</label>
               <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                 <input 
                    type="range" min="1" max="12" step="0.5" 
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
                 <div className="w-12 text-center font-black text-lg text-slate-800">{formData.duration}h</div>
               </div>
            </div>
          </div>

          <button 
            onClick={handleGeneratePass}
            className={`w-full py-4 font-black rounded-xl shadow-xl active:scale-95 transition-all text-lg text-white ${scannedIdentity?.isStaff ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
          >
            {scannedIdentity?.isStaff ? 'GENERATE PASS' : 'GENERATE PASS'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderKioskSuccessStep = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-2xl mx-auto w-full animate-in zoom-in-95 duration-500 px-4">
        <div className="bg-white w-full rounded-[32px] md:rounded-[40px] shadow-2xl p-6 md:p-10 text-center border-t-8 border-emerald-500">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Registration Complete</h2>
            <p className="text-slate-500 text-sm md:text-lg mb-8">Scan this QR code with your mobile device to access your digital visitor dashboard and navigate to your destination.</p>
            
            <button 
                onClick={() => setStep('PASS')}
                className="group relative inline-block p-4 bg-white border-2 border-slate-900 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer active:scale-95"
            >
                <div className="grid grid-cols-7 gap-1 w-40 h-40 md:w-48 md:h-48">
                    {Array.from({length: 49}).map((_, i) => (
                        <div key={i} className={`rounded-[2px] ${Math.random() > 0.3 ? 'bg-slate-900' : 'bg-transparent'}`}></div>
                    ))}
                </div>
                {/* Center logo of QR */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white rounded flex items-center justify-center border border-slate-900">
                     <span className="text-xl">📱</span>
                </div>
                <div className="absolute -bottom-10 left-0 right-0 text-center text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    (Click to Simulate Scan)
                </div>
            </button>
            <div className="mt-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Waiting for mobile scan...
            </div>
        </div>
    </div>
  );

  const renderPassStep = () => {
    // Calculate expiry time based on checkInTime + durationHours
    const checkIn = new Date(generatedPass?.checkInTime || Date.now());
    const expiry = new Date(checkIn.getTime() + (generatedPass?.durationHours || 0) * 60 * 60 * 1000);
    const timeString = expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="flex flex-col items-center justify-center min-h-full py-4 md:py-10 w-full animate-in slide-in-from-bottom-20 duration-500 px-4">
        <div className={`bg-white w-full max-w-[400px] h-auto rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden border-t-8 relative flex flex-col ${generatedPass?.persona === 'INTERNAL_STAFF' ? 'border-amber-500' : 'border-emerald-500'}`}>
            
            {/* Header Area: Identity Information */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col items-center shrink-0">
                 <div className="flex justify-between w-full items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Visitor Pass</span>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${generatedPass?.persona === 'INTERNAL_STAFF' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {generatedPass?.persona === 'INTERNAL_STAFF' ? 'Staff' : 'Active'}
                    </div>
                 </div>

                 {/* Photo & Name */}
                 <div className="flex items-center w-full gap-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full border-2 border-white shadow-md flex items-center justify-center text-2xl shrink-0">
                        {generatedPass?.persona === 'INTERNAL_STAFF' ? '🏢' : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black text-slate-800 leading-tight truncate">{generatedPass?.name}</h2>
                        <div className="text-xs font-mono font-bold text-slate-500 truncate mt-0.5">ID: {generatedPass?.nric || generatedPass?.id}</div>
                    </div>
                 </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 md:space-y-6">
                
                {/* 1. Navigate Live / Location */}
                <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-white">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Destination</div>
                                <div className="text-xl font-black leading-tight">{generatedPass?.tower}</div>
                                <div className="text-sm font-medium opacity-90">{generatedPass?.floor}</div>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </div>
                        </div>
                        <button 
                            onClick={() => setStep('NAVIGATION')}
                            className="w-full py-3 bg-white text-blue-600 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 animate-pulse"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                            NAVIGATE LIVE
                        </button>
                    </div>
                </div>

                {/* 2. Directions & Parking */}
                <div className="grid grid-cols-1 gap-4">
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                         <div className="flex items-center gap-2 mb-2 text-emerald-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                             <label className="text-[10px] font-black uppercase tracking-widest">Wayfinding</label>
                         </div>
                         <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Proceed to <strong>Main Lobby</strong>. Check in at Security Desk A. Take <strong>Lift Bank B</strong> (High Rise) to <strong>{generatedPass?.floor}</strong>.
                         </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                         <div>
                             <div className="flex items-center gap-2 mb-1 text-slate-400">
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                                 <label className="text-[10px] font-black uppercase tracking-widest">Nearest Parking</label>
                             </div>
                             <div className="text-xl font-black text-slate-800">{generatedPass?.parkingSlot}</div>
                         </div>
                         <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 font-bold">P</div>
                    </div>
                </div>

                {/* 3. Time Limit */}
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="flex justify-between items-end mb-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Expiry</label>
                         <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">{generatedPass?.durationHours}H LIMIT</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800">{timeString}</div>
                    <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[85%]"></div>
                    </div>
                </div>

                {/* 4. Gate Check-in QR */}
                <div className="bg-slate-800 text-white p-6 rounded-2xl text-center">
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-4">Scan at Turnstile</p>
                    <div className="inline-block p-2 bg-white rounded-xl mb-2">
                        <div className="grid grid-cols-5 gap-0.5 w-32 h-32 mx-auto">
                           {Array.from({length: 25}).map((_, i) => (
                             <div key={i} className={`rounded-[2px] ${Math.random() > 0.4 ? 'bg-slate-900' : 'bg-transparent'}`}></div>
                           ))}
                         </div>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-2">{generatedPass?.qrCode}</p>
                </div>

                 <button onClick={resetFlow} className="w-full text-slate-300 hover:text-slate-500 text-xs font-bold py-2 uppercase tracking-widest">
                    Back to Home (Demo Only)
                </button>
            </div>
        </div>
      </div>
    );
  };

  const renderNavigationStep = () => {
    // 1. Determine Start Node (Fixed: Guard House A)
    const startNode = MAP_NODES['GUARD_A'];

    // 2. Determine End Node
    const destinationId = formData.destination.id;
    // Map destination ID to Map Node key. Fallback to Tower A if not found.
    const endNode = MAP_NODES[destinationId] || MAP_NODES['TOWER_A']; 

    // 3. Simple Distance Calc
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 4); // Scale factor
    const minutes = Math.ceil(distance / 60);

    return (
        <div className="flex flex-col items-center justify-center min-h-full py-4 md:py-10 w-full animate-in fade-in duration-500 px-2 md:px-0">
            <div className="bg-slate-50 w-full max-w-[600px] h-[75vh] md:h-[800px] rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden border-t-8 border-blue-500 relative flex flex-col">
                
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-20 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md shadow-sm p-3 md:p-4 rounded-2xl border border-slate-200 pointer-events-auto flex justify-between items-center">
                         <div>
                             <h2 className="text-lg md:text-xl font-black text-slate-800">Premise Map</h2>
                             <p className="text-xs text-slate-500 font-medium">Real-time geospatial view.</p>
                         </div>
                         <button 
                             onClick={() => setStep('PASS')}
                             className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-90 transition-transform"
                         >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                         </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="relative flex-1 bg-[#f0f4f8] w-full overflow-hidden">
                    {/* SVG Map Layer */}
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="0.5"/>
                            </pattern>
                            <pattern id="parkingPattern" width="2" height="4" patternUnits="userSpaceOnUse">
                                <rect width="100%" height="100%" fill="#64748b"/>
                                <line x1="0" y1="2" x2="2" y2="2" stroke="white" strokeWidth="0.2" opacity="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="#f1f5f9" />
                        <rect width="100" height="100" fill="url(#grid)" />

                        {/* --- ROADS --- */}
                        {/* Main Vertical Left */}
                        <path d="M 25 0 L 25 100" stroke="#334155" strokeWidth="8" fill="none"/>
                        <path d="M 25 0 L 25 100" stroke="#fff" strokeWidth="0.5" strokeDasharray="3 3" fill="none"/>
                        
                        {/* Main Horizontal Bottom */}
                        <path d="M 0 75 L 100 75" stroke="#334155" strokeWidth="6" fill="none"/>
                        <path d="M 0 75 L 100 75" stroke="#fff" strokeWidth="0.5" strokeDasharray="3 3" fill="none"/>

                        {/* Cross Streets */}
                        <path d="M 0 40 L 40 40" stroke="#334155" strokeWidth="4" fill="none"/>
                        <path d="M 60 75 L 60 40 L 90 40" stroke="#334155" strokeWidth="4" fill="none"/>
                        <path d="M 90 40 Q 95 40 95 30 L 95 0" stroke="#334155" strokeWidth="4" fill="none"/>

                        {/* --- PARKING LOTS --- */}
                        {/* Left Lots */}
                        <rect x="2" y="45" width="20" height="25" fill="#94a3b8" rx="1" />
                        <rect x="5" y="48" width="14" height="19" fill="url(#parkingPattern)" opacity="0.4"/>
                        <text x="12" y="58" fontSize="3" fill="white" opacity="0.6" textAnchor="middle">P</text>

                        {/* Bottom Center Lot */}
                        <rect x="35" y="80" width="30" height="18" fill="#94a3b8" rx="1" />
                        <rect x="38" y="83" width="24" height="12" fill="url(#parkingPattern)" opacity="0.4"/>
                        <text x="50" y="90" fontSize="3" fill="white" opacity="0.6" textAnchor="middle">P</text>

                        {/* Top Center Lot */}
                        <rect x="45" y="5" width="20" height="10" fill="#94a3b8" rx="1" />
                        <text x="55" y="11" fontSize="2" fill="white" opacity="0.6" textAnchor="middle">P</text>

                        {/* Right Lots */}
                        <rect x="80" y="45" width="18" height="25" fill="#94a3b8" rx="1" />
                        <rect x="83" y="48" width="12" height="19" fill="url(#parkingPattern)" opacity="0.4"/>


                        {/* --- ZONES --- */}
                        {/* Corporate Zone Background */}
                        <rect x="32" y="25" width="45" height="40" rx="4" fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="0.5" />
                        <text x="35" y="29" fontSize="2" fill="#6366f1" fontWeight="bold" letterSpacing="0.2">CORPORATE ZONE</text>


                        {/* --- NAVIGATION PATH --- */}
                        <line 
                            x1={startNode.x} y1={startNode.y} 
                            x2={startNode.x} y2={75} // Go to road
                            stroke="#3b82f6" strokeWidth="1" strokeDasharray="1 1"
                        />
                        <line 
                            x1={startNode.x} y1={75} 
                            x2={endNode.x > 30 ? endNode.x : 25} y2={75} // Horizontal
                            stroke="#3b82f6" strokeWidth="1" strokeDasharray="1 1"
                        />
                        <line 
                            x1={endNode.x} y1={75} 
                            x2={endNode.x} y2={endNode.y} // Vertical to dest
                            stroke="#3b82f6" strokeWidth="1" strokeDasharray="1 1"
                            opacity={endNode.y < 75 ? 1 : 0}
                        />
                        
                        {/* Direct line as fallback/visual guide */}
                        <line 
                            x1={startNode.x} y1={startNode.y} 
                            x2={endNode.x} y2={endNode.y} 
                            stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2 1" 
                            className="animate-[dash_1s_linear_infinite]"
                            opacity="0.6"
                        />
                        <style>{`@keyframes dash { to { stroke-dashoffset: -3; } }`}</style>

                        
                        {/* --- NODES --- */}
                        {Object.keys(MAP_NODES).map(key => {
                            const node = MAP_NODES[key];
                            const isDestination = node === endNode;
                            const isStart = node === startNode;

                            // Color Logic
                            let fill = '#fff';
                            let stroke = '#64748b';
                            if (node.type === 'TOWER') { fill = '#eff6ff'; stroke = '#3b82f6'; }
                            if (node.type.includes('AMENITY')) { fill = '#ecfdf5'; stroke = '#10b981'; }
                            if (node.type === 'GUARD') { fill = '#1e293b'; stroke = '#0f172a'; }

                            // Shape Logic
                            return (
                                <g key={key} onClick={() => {}} style={{ cursor: 'pointer' }}>
                                    
                                    {/* Shadow */}
                                    {node.type === 'AMENITY_CIRCLE' ? (
                                        <circle cx={node.x} cy={node.y} r="7" fill="black" opacity="0.1" transform="translate(1,1)" />
                                    ) : (
                                        <rect x={node.x - 7} y={node.y - 5} width="14" height="10" rx="1" fill="black" opacity="0.1" transform="translate(1,1)" />
                                    )}

                                    {/* Building Body */}
                                    {node.type === 'AMENITY_CIRCLE' ? (
                                        <circle cx={node.x} cy={node.y} r="7" fill={fill} stroke={stroke} strokeWidth="1" />
                                    ) : (
                                        <rect x={node.x - 7} y={node.y - 5} width="14" height="10" rx={node.type === 'TOWER' ? 2 : 1} fill={fill} stroke={stroke} strokeWidth="1" />
                                    )}

                                    {/* Interior Detail */}
                                    {node.type === 'TOWER' && (
                                        <>
                                           <rect x={node.x - 4} y={node.y - 2} width="8" height="5" rx="0.5" fill={stroke} opacity="0.1" />
                                           <text x={node.x} y={node.y - 6} fontSize="2.5" fill="white" fontWeight="bold" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: stroke, strokeWidth: '0.5px' }}>
                                             {node.label.includes('1') ? '1' : node.label.includes('2') ? '2' : '3'}
                                           </text>
                                        </>
                                    )}
                                    
                                    {/* Label */}
                                    <text 
                                        x={node.x} y={node.y + (node.type === 'AMENITY_CIRCLE' ? 10 : 8)} 
                                        fontSize="2.5" 
                                        fill="#1e293b" 
                                        textAnchor="middle" 
                                        fontWeight="700"
                                        className="drop-shadow-sm"
                                    >
                                        {node.label}
                                    </text>

                                    {/* Pulse Effect for Destination */}
                                    {isDestination && (
                                        <circle cx={node.x} cy={node.y} r="10" fill="none" stroke="#2563eb" strokeWidth="1">
                                            <animate attributeName="r" from="6" to="14" dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                    )}
                                </g>
                            );
                        })}

                        {/* 5. You Are Here Marker */}
                        <g transform={`translate(${startNode.x}, ${startNode.y})`}>
                            <circle r="4" fill="#ef4444" stroke="white" strokeWidth="1.5" className="shadow-lg" />
                            <circle r="8" fill="#ef4444" opacity="0.3">
                                <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <text y="-6" fontSize="3" fill="#ef4444" fontWeight="bold" textAnchor="middle">YOU</text>
                        </g>
                    </svg>

                    {/* Legend / Status Overlay */}
                    <div className="absolute top-6 right-6 bg-white/90 backdrop-blur rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col gap-1 z-10">
                         <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                             <div className="w-2 h-2 rounded-full bg-blue-500"></div> Staff
                         </div>
                         <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Visitor
                         </div>
                         <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                             <div className="w-2 h-2 rounded-full bg-orange-500"></div> Contractor
                         </div>
                    </div>

                    {/* Bottom Floating Card */}
                    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate">Est. Arrival</div>
                                <div className="text-lg md:text-xl font-black text-slate-800 truncate">{minutes} min <span className="text-xs md:text-sm font-normal text-slate-500">({distance}m)</span></div>
                            </div>
                            <div className="shrink-0">
                                <button className="px-3 py-2 md:px-4 md:py-2 bg-slate-900 text-white text-[10px] md:text-xs font-bold rounded-lg hover:bg-black transition-colors">
                                    Start AR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Content Container */}
      <div className="relative z-10 w-full">
        {step === 'SCAN' && renderScanStep()}
        {step === 'AUTH_MANUAL_ENTRY' && renderAuthManualEntryStep()}
        {step === 'MANUAL_ENTRY' && renderManualEntryStep()}
        {step === 'DETAILS' && renderDetailsStep()}
        {step === 'KIOSK_SUCCESS' && renderKioskSuccessStep()}
        {step === 'PASS' && renderPassStep()}
        {step === 'NAVIGATION' && renderNavigationStep()}
      </div>
    </div>
  );
};

export default App;
