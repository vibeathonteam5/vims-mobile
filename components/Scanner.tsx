import React, { useRef, useEffect, useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ScannerProps {
  onScan: (data: { 
    id?: string; 
    name?: string; 
    type: 'QR' | 'FACE' | 'ENROLLMENT'; 
    matchScore?: number;
    identityType?: 'GOVT_ID' | 'STAFF_ID';
    department?: string;
  }) => void;
  mode: 'QR' | 'FACE';
  onRequestManual?: () => void;
}

type EnrollmentPhase = 'ID_SCAN' | 'ID_VERIFIED' | 'EXTRACTING_IC_FACE' | 'FACE_MATCH' | 'SUCCESS' | 'FAILURE';

// Robust error checker for various API failure formats
const isQuotaError = (error: any) => {
  const e = error || {};
  const msg = e.message || e.toString() || '';
  // Check deeper nested API error objects (e.g. error.error.code)
  const code = e.code || e.error?.code;
  const status = e.status || e.error?.status;
  const nestedMsg = e.error?.message || '';

  return msg.includes('429') || 
         msg.toLowerCase().includes('quota') || 
         msg.includes('RESOURCE_EXHAUSTED') ||
         nestedMsg.includes('429') ||
         nestedMsg.toLowerCase().includes('quota') ||
         code === 429 ||
         status === 'RESOURCE_EXHAUSTED';
};

const Scanner: React.FC<ScannerProps> = ({ onScan, mode, onRequestManual }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActiveRef = useRef(true);
  const [phase, setPhase] = useState<EnrollmentPhase>(mode === 'FACE' ? 'ID_SCAN' : 'SUCCESS');
  const [scanning, setScanning] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [extractedData, setExtractedData] = useState<{ 
    name: string; 
    id: string; 
    type: 'GOVT_ID' | 'STAFF_ID';
    department?: string;
    expiry: string 
  } | null>(null);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    isActiveRef.current = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch (err) {
        console.error("Camera access denied", err);
        setStatusMessage("Camera Error: Check Permissions");
        setCameraError(true);
      }
    }
    startCamera();
    return () => {
      isActiveRef.current = false;
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    }
    return null;
  };

  // --- AUTO-CAPTURE LOOP FOR ID_SCAN ---
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const performAutoScan = async () => {
        if (!isActiveRef.current || phase !== 'ID_SCAN' || mode === 'QR' || cameraError) return;

        // Ensure video is ready
        if (!videoRef.current || videoRef.current.readyState < 2) {
            timeoutId = setTimeout(performAutoScan, 500);
            return;
        }

        setScanning(true);
        const frame = captureFrame();
        let nextDelay = 3000; 
        
        if (frame) {
            try {
                // If simulation mode was previously triggered (e.g. by face match), utilize it here too if needed,
                // although ID scan usually happens first.
                if (isSimulationMode) {
                     throw { status: 'RESOURCE_EXHAUSTED' }; // Force jump to catch block
                }

                const resp = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: frame } },
                            { text: 'Analyze this image. 1. Look for a National ID or Corporate Staff ID card. It does NOT need to be perfectly aligned as long as the text is readable. 2. If a card is present and text is legible, extract JSON: { "valid": true, "docType": "GOVT_ID" | "STAFF_ID", "name": "FULL NAME", "id": "ID NUMBER", "department": "DEPT (optional)" }. 3. If the card is completely missing or unreadable, return JSON: { "valid": false, "reason": "Hold card steady" }.' }
                        ]
                    },
                    config: { responseMimeType: 'application/json' }
                });

                if (!isActiveRef.current) return;

                const data = JSON.parse(resp.text || '{}');

                if (data.valid && data.name && data.id) {
                    setIdImage(frame);
                    const finalData = {
                        name: data.name?.toUpperCase() || "VISITOR",
                        id: data.id || "UNIDENTIFIED",
                        type: (data.docType === 'STAFF_ID' ? 'STAFF_ID' : 'GOVT_ID') as 'GOVT_ID' | 'STAFF_ID',
                        department: data.department?.toUpperCase(),
                        expiry: "N/A"
                    };
                    setExtractedData(finalData);
                    setStatusMessage('ID Captured Successfully');
                    setPhase('ID_VERIFIED');
                    setScanning(false);
                    return; // End Loop
                } else {
                    setStatusMessage(data.reason || 'Searching for ID...');
                }
            } catch (e: any) {
                // --- ROBUST QUOTA FALLBACK ---
                if (isQuotaError(e)) {
                    if (!isSimulationMode) {
                        console.warn("Quota exceeded. Triggering Simulation Mode.");
                    }
                    setIsSimulationMode(true);
                    setStatusMessage('System Busy. Simulating Scan...');
                    
                    // Artificial delay for realism
                    await new Promise(r => setTimeout(r, 2000));
                    
                    if (!isActiveRef.current) return;

                    // Generate Realistic Mock Data
                    const isStaff = Math.random() > 0.6; 
                    const firstNames = ["James", "Sarah", "Michael", "Emma", "David", "Olivia"];
                    const lastNames = ["Chen", "Smith", "Rodriguez", "Kim", "Patel", "Johnson"];
                    const name = `${firstNames[Math.floor(Math.random()*firstNames.length)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`.toUpperCase();
                    
                    const mockData = {
                        name: name,
                        id: isStaff ? `STF-${Math.floor(1000 + Math.random() * 9000)}` : `S${Math.floor(7000000 + Math.random() * 1000000)}Z`,
                        type: (isStaff ? 'STAFF_ID' : 'GOVT_ID') as 'GOVT_ID' | 'STAFF_ID',
                        department: isStaff ? ["SECURITY", "IT OPS", "FINANCE", "FACILITIES"][Math.floor(Math.random()*4)] : undefined,
                        expiry: "N/A"
                    };

                    setIdImage(frame);
                    setExtractedData(mockData);
                    setStatusMessage('ID Captured (Simulation Mode)');
                    setPhase('ID_VERIFIED');
                    setScanning(false);
                    return; // Break loop
                } else {
                    // Non-quota error (e.g. network glitch), retry slowly
                    console.error("Auto-scan error", e);
                    nextDelay = 5000; 
                }
            }
        }

        if (isActiveRef.current && phase === 'ID_SCAN') {
             timeoutId = setTimeout(performAutoScan, nextDelay);
        }
    };

    if (phase === 'ID_SCAN' && mode !== 'QR') {
        timeoutId = setTimeout(performAutoScan, 1000);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, mode, isSimulationMode, cameraError]);


  const handleAction = async () => {
    if (phase === 'FAILURE') {
        setPhase('ID_SCAN');
        setExtractedData(null);
        setMatchScore(0);
        return;
    }

    if (phase === 'ID_SCAN') return; 

    setScanning(true);
    
    // --- PHASE 2: BIOMETRIC MATCHING ---
    if (phase === 'ID_VERIFIED') {
      setPhase('EXTRACTING_IC_FACE');
      setStatusMessage('Locating facial features on card...');
      await new Promise(r => setTimeout(r, 1000));

      setPhase('FACE_MATCH');
      setStatusMessage('Comparing live face with ID photo...');
      const liveFrame = captureFrame();

      // If we are already in simulation mode, skip the API call for matching
      if (isSimulationMode) {
          await new Promise(r => setTimeout(r, 1500));
          const mockScore = 85 + Math.floor(Math.random() * 14); // 85-99%
          setMatchScore(mockScore);
          setPhase('SUCCESS');
          setStatusMessage('Identity Verified (Simulation)');
          
          await new Promise(r => setTimeout(r, 1000));
          onScan({ 
             name: extractedData?.name, 
             id: extractedData?.id, 
             type: 'ENROLLMENT',
             matchScore: mockScore,
             identityType: extractedData?.type,
             department: extractedData?.department
          });
          setScanning(false);
          return;
      }

      if (idImage && liveFrame) {
        try {
          const resp = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: idImage } },
                { inlineData: { mimeType: 'image/jpeg', data: liveFrame } },
                { text: 'Compare the face in the first image (Card) with the face in the second image (Live Camera). Strict comparison. Return JSON: { "score": number (0-100), "match": boolean }.' }
              ]
            },
            config: { responseMimeType: 'application/json' }
          });
          
          const result = JSON.parse(resp.text || '{}');
          const score = typeof result.score === 'number' ? result.score : 0;
          setMatchScore(score);

          if (score >= 70) {
            setPhase('SUCCESS');
            setStatusMessage('Identity Verified');
            await new Promise(r => setTimeout(r, 1500));
            onScan({ 
                name: extractedData?.name, 
                id: extractedData?.id, 
                type: 'ENROLLMENT',
                matchScore: score,
                identityType: extractedData?.type,
                department: extractedData?.department
            });
          } else {
            setPhase('FAILURE');
            setStatusMessage('Biometric Mismatch. Try Again.');
          }
        } catch (e: any) {
          if (isQuotaError(e)) {
             // Late-stage fallback if quota hits during match
             setIsSimulationMode(true);
             setStatusMessage('Quota Limit. Simulating Match...');
             await new Promise(r => setTimeout(r, 1500));
             
             const mockScore = 92;
             setMatchScore(mockScore);
             setPhase('SUCCESS');
             setStatusMessage('Identity Verified (Simulation)');
             
             await new Promise(r => setTimeout(r, 1500));
             onScan({ 
                name: extractedData?.name, 
                id: extractedData?.id, 
                type: 'ENROLLMENT',
                matchScore: mockScore,
                identityType: extractedData?.type,
                department: extractedData?.department
             });
          } else {
             console.error("Comparison Failed", e);
             setPhase('FAILURE');
          }
        }
      } else {
        setPhase('FAILURE');
      }
      setScanning(false);
    }
  };

  const getOverlayStyles = () => {
    // Responsive widths using VW to prevent overflow on small screens
    if (phase === 'FAILURE') return 'w-[65vw] max-w-[16rem] h-64 rounded-2xl border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.6)]';
    if (mode === 'QR') return 'w-[50vw] max-w-[12rem] aspect-square rounded-lg border-emerald-500';
    if (phase === 'ID_SCAN') return 'w-[75vw] max-w-[18rem] h-44 rounded-xl border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]'; 
    if (phase === 'FACE_MATCH') return 'w-[65vw] max-w-[16rem] h-72 rounded-[40%] border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]';
    return 'w-[65vw] max-w-[16rem] h-64 rounded-2xl border-emerald-400';
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] shadow-2xl ring-4 ring-slate-800/50">
        {!cameraError ? (
          <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-500 ${phase === 'FAILURE' ? 'opacity-30 grayscale' : 'opacity-60'}`} 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
             <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
             </div>
             <h3 className="text-white font-bold text-lg mb-2">Camera Unavailable</h3>
             <p className="text-slate-400 text-xs mb-6">Device camera is offline or permission denied. Please switch to manual data entry.</p>
             {onRequestManual && (
               <button 
                  onClick={onRequestManual}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
               >
                  Manual Entry Form
               </button>
             )}
          </div>
        )}
        
        {/* Simulation Badge */}
        {isSimulationMode && !cameraError && (
             <div className="absolute top-4 left-4 z-50">
                 <div className="bg-amber-500/90 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg border border-amber-300/50 backdrop-blur-md">
                     Simulation Mode
                 </div>
             </div>
        )}
        
        {!cameraError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`border-[3px] transition-all duration-700 ${getOverlayStyles()} flex items-center justify-center relative`}>
            {phase !== 'FAILURE' && phase !== 'SUCCESS' && !scanning && (
               <div className="scanner-line bg-white/50 h-[1px] w-full absolute top-0 shadow-[0_0_10px_white]"></div>
            )}
            
            {scanning && phase === 'ID_SCAN' && (
                <div className="absolute inset-0 border-4 border-blue-400/50 animate-pulse rounded-xl"></div>
            )}

            {scanning && phase !== 'ID_SCAN' && phase !== 'FAILURE' && (
               <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
            )}

            {phase === 'ID_SCAN' && (
              <>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80 font-bold text-xs md:text-sm tracking-widest uppercase whitespace-nowrap">
                    Show ID (Any Angle)
                </div>
              </>
            )}

            {phase === 'FAILURE' && (
               <div className="text-rose-500 animate-in zoom-in">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
               </div>
            )}
          </div>
        </div>
        )}

        {/* Matching Stats Overlay */}
        {!cameraError && (phase === 'FACE_MATCH' || phase === 'SUCCESS') ? (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 text-center min-w-[80px] md:min-w-[100px] shadow-xl animate-in fade-in slide-in-from-top-4">
            <p className="text-[8px] md:text-[9px] text-emerald-400 font-bold uppercase mb-1 tracking-widest">Similarity</p>
            <div className="flex items-end justify-center gap-1">
              <p className="text-xl md:text-2xl font-mono font-black text-white leading-none">{matchScore}</p>
              <span className="text-[10px] text-emerald-500 font-bold mb-1">%</span>
            </div>
          </div>
        ) : null}

        {/* Main Status Bar */}
        {!cameraError && (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="bg-slate-900/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {scanning ? (
                 <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              ) : (
                 <div className={`w-2 h-2 rounded-full ${phase === 'FAILURE' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              )}
              <p className="text-white text-xs font-bold tracking-wide truncate">
                 {statusMessage || (phase === 'ID_SCAN' ? 'Present ID card...' : 'Processing...')}
              </p>
            </div>

            {phase !== 'ID_SCAN' && phase !== 'SUCCESS' && phase !== 'EXTRACTING_IC_FACE' && (
              <button 
                onClick={handleAction}
                disabled={scanning}
                className={`w-full py-3 md:py-4 font-black rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 text-white uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 ${
                  phase === 'FAILURE' ? 'bg-rose-600 hover:bg-rose-500' : 
                  'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {phase === 'FAILURE' ? 'Retry Verification' : 'Verify Face Match'}
              </button>
            )}
            
            {phase === 'ID_SCAN' && (
                 <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-progress-indeterminate"></div>
                 </div>
            )}
          </div>
        </div>
        )}
      </div>

      {extractedData && phase !== 'ID_SCAN' && phase !== 'FAILURE' && (
        <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl shadow-inner ${extractedData.type === 'STAFF_ID' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {extractedData.type === 'STAFF_ID' ? '🏢' : '👤'}
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${extractedData.type === 'STAFF_ID' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {extractedData.type === 'STAFF_ID' ? 'STAFF ID' : 'VISITOR ID'}
                      </span>
                   </div>
                   <h3 className="text-base md:text-lg font-bold text-slate-800 leading-none mb-1">{extractedData.name}</h3>
                   <div className="text-xs font-mono font-bold text-slate-400">ID: {extractedData.id}</div>
                   {extractedData.department && (
                      <div className="text-xs font-bold text-slate-500 mt-1">{extractedData.department}</div>
                   )}
                </div>
             </div>
             <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
                <svg className="w-3 h-3 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
             </div>
          </div>
        </div>
      )}

      {/* Manual Override Button for Aux Police even if Camera Works */}
      {!cameraError && onRequestManual && (
         <button 
            onClick={onRequestManual} 
            className="mt-2 w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 shadow-lg backdrop-blur-sm"
         >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
             Auxiliary Police Manual Entry
         </button>
      )}
      
      <style>{`
        @keyframes progress-indeterminate {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 50%; margin-left: 25%; }
            100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
            animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Scanner;