import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Flag, RotateCcw, Timer, Coffee, Settings2, Minus, Plus, Dumbbell, Volume2, VolumeX, Save, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

type Mode = 'free' | 'interval';
type IntervalPhase = 'ready' | 'work' | 'rest' | 'finished';

const StopwatchScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('free');
  const [isMuted, setIsMuted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- FREE STOPWATCH STATE ---
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  // Timestamp Refs for Accuracy (Background/Screen Off support)
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const restStartTimeRef = useRef<number>(0);
  const restPausedTimeRef = useRef<number>(0);

  // --- INTERVAL TIMER STATE ---
  const [sets, setSets] = useState(4);
  const [workSecs, setWorkSecs] = useState(30); // Total seconds for work
  const [restSecs, setRestSecs] = useState(10); // Total seconds for rest

  const [intervalPhase, setIntervalPhase] = useState<IntervalPhase>('ready');
  const [currentSet, setCurrentSet] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0); // Countdown in seconds
  const [isIntervalRunning, setIsIntervalRunning] = useState(false);

  // Interval Timestamp Refs
  const intervalEndTimeRef = useRef<number>(0);
  const intervalPausedLeftRef = useRef<number>(0); // Seconds left when paused

  // Refs
  const mainIntervalRef = useRef<number | null>(null);
  const restIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // --- WAKE LOCK (Prevent Screen from Sleeping) ---
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      // Only request if running and browser supports it
      if ('wakeLock' in navigator && (isRunning || isResting || isIntervalRunning)) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock denied:', err);
        }
      }
    };

    requestWakeLock();

    // Re-request visibility change (e.g. switching tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (isRunning || isResting || isIntervalRunning)) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, isResting, isIntervalRunning]);

  // ... (Audio Engine Code omitted for brevity, logic remains the same)
  // Re-implementing simplified Audio Engine for context
  const playSound = (type: 'tick' | 'work' | 'rest' | 'finish' | 'click') => {
    if (isMuted) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  };

  // ==========================================
  // DB SAVE LOGIC
  // ==========================================
  const handleSaveWorkout = async () => {
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Você precisa estar logado para salvar.");
        return;
      }

      const payload = {
        user_id: session.user.id,
        mode: mode,
        total_time_ms: mode === 'free' ? time : (sets * (workSecs + restSecs) * 1000),
        rounds_completed: mode === 'interval' ? sets : null,
        work_time_sec: mode === 'interval' ? workSecs : null,
        rest_time_sec: mode === 'interval' ? restSecs : null,
        created_at: new Date()
      };

      const { error } = await supabase.from('workouts').insert(payload);
      if (error) throw error;

      alert("Treino salvo com sucesso!");

      // Reset after save
      if (mode === 'free') handleFreeReset();
      else resetInterval();

    } catch (err: any) {
      alert("Erro ao salvar treino: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };


  // ==========================================
  // FREE STOPWATCH LOGIC (Timestamp Based)
  // ==========================================
  useEffect(() => {
    if (mode === 'free' && isRunning) {
      // Start loop
      mainIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        // Time = Current - Start (The start reference was set on handleFreeStartStop)
        setTime(now - startTimeRef.current);
      }, 50); // Update freq
    } else {
      if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
    }
    return () => { if (mainIntervalRef.current) clearInterval(mainIntervalRef.current); };
  }, [isRunning, mode]);

  useEffect(() => {
    if (mode === 'free' && isResting) {
      restIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        setRestTime(now - restStartTimeRef.current);
      }, 50);
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
  }, [isResting, mode]);

  const handleFreeStartStop = () => {
    playSound('click');
    if (isRunning) {
      // STOPPING (Pausing/To Rest)
      setIsRunning(false);
      setIsResting(true);

      // Save current time as "Accumulated/Paused" if we were to support pause-resume of work
      // But logic here switches to REST. 
      // Current Time is preserved in state `time`. 

      // Start Rest Timer
      setRestTime(0);
      restStartTimeRef.current = Date.now();

    } else {
      // STARTING (From 0 or From Pause?)
      // Logic implies: If Resting -> Resume Work? Or Stop Rest?
      // "handleFreeStartStop" toggles.

      // If we are currently RESTING (Paused work), we RESUME WORK.
      // Or if fresh start.

      setIsRunning(true);
      setIsResting(false);

      // Setup Timestamp for Work
      // If resuming, we need to adjust StartTime so that (Now - Start) = PreviousTime
      // NewStart = Now - PreviousTime
      const now = Date.now();
      startTimeRef.current = now - time;
    }
  };

  const handleFreeReset = () => {
    playSound('click');
    setIsRunning(false);
    setIsResting(false);
    setTime(0);
    setRestTime(0);
    setLaps([]);
    startTimeRef.current = 0;
    restStartTimeRef.current = 0;
  };

  const handleFreeLap = () => {
    playSound('click');
    setLaps([time, ...laps]);
  };

  // ==========================================
  // INTERVAL TIMER LOGIC
  // ==========================================

  // Helper to adjust time by Min or Sec
  const adjustTime = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    currentTotal: number,
    unit: 'min' | 'sec',
    amount: number,
    minLimit: number = 0
  ) => {
    const currentMin = Math.floor(currentTotal / 60);
    const currentSec = currentTotal % 60;

    let newTotal = currentTotal;

    if (unit === 'min') {
      const newMin = Math.max(0, currentMin + amount);
      newTotal = (newMin * 60) + currentSec;
    } else {
      let newSec = currentSec + amount;
      // Logic to wrap seconds: 0 -> 55 -> 50... or 55 -> 0 -> 5
      if (newSec >= 60) newSec = 0;
      if (newSec < 0) newSec = 55;
      newTotal = (currentMin * 60) + newSec;
    }

    // Enforce limits (e.g., Work can't be 0 if limit is 5)
    setter(Math.max(minLimit, newTotal));
  };

  useEffect(() => {
    if (mode === 'interval' && isIntervalRunning && intervalPhase !== 'finished' && intervalPhase !== 'ready') {

      // Clear any existing interval to prevent duplicates
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        // Calculate remaining seconds based on End Time
        const msRemaining = intervalEndTimeRef.current - now;
        const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));

        // Update state but only trigger side-effects (sound) on integer change if needed
        // Since we ceil, 3.9 -> 4, 3.1 -> 4, 2.9 -> 3. 
        // We want to update timeLeft to show user.

        setTimeLeft(prev => {
          if (prev !== secondsRemaining) {
            // Play tick sound for 3, 2, 1
            if (secondsRemaining <= 3 && secondsRemaining > 0) {
              playSound('tick');
            }
          }
          return secondsRemaining;
        });

        // Phase Transition Trigger
        if (msRemaining <= 20) { // Buffer of 20ms to ensure we don't skip
          handlePhaseTransition();
        }
      }, 100); // Check frequently
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isIntervalRunning, intervalPhase, mode]);

  const handlePhaseTransition = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (intervalPhase === 'work') {
      // Finishing Work
      if (currentSet >= sets) {
        setIntervalPhase('finished');
        setIsIntervalRunning(false);
        playSound('finish');
      } else {
        setIntervalPhase('rest');
        const nextDuration = restSecs;
        setTimeLeft(nextDuration);
        // Set new Target
        intervalEndTimeRef.current = Date.now() + (nextDuration * 1000);
        playSound('rest');
      }
    } else if (intervalPhase === 'rest') {
      // Finishing Rest
      setCurrentSet((prev) => prev + 1);
      setIntervalPhase('work');
      const nextDuration = workSecs;
      setTimeLeft(nextDuration);
      intervalEndTimeRef.current = Date.now() + (nextDuration * 1000);
      playSound('work');
    }
  };

  const startInterval = () => {
    console.log("Starting Interval...");
    playSound('click');
    let duration = timeLeft;

    if (intervalPhase === 'ready' || intervalPhase === 'finished') {
      // Fresh Start
      setIntervalPhase('work');
      setCurrentSet(1);
      duration = workSecs;
      setTimeLeft(duration);
      playSound('work');
    }

    // Set Target based on Duration
    intervalEndTimeRef.current = Date.now() + (duration * 1000);
    setIsIntervalRunning(true);
  };

  const pauseInterval = () => {
    playSound('click');
    setIsIntervalRunning(false);
    // When pausing, timeLeft is accurate (seconds).
    // On resume, we recalculate EndTime from this timeLeft.
  };

  const resetInterval = () => {
    playSound('click');
    setIsIntervalRunning(false);
    setIntervalPhase('ready');
    setCurrentSet(1);
    setTimeLeft(workSecs);
  };

  // ==========================================
  // HELPER FUNCTIONS (FORMATTING)
  // ==========================================
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return (
      <div className="flex items-baseline justify-center font-mono tracking-tighter text-slate-800">
        <span className="text-6xl sm:text-7xl font-bold w-[76px] sm:w-[90px] text-center">{minutes.toString().padStart(2, '0')}</span>
        <span className="text-4xl sm:text-5xl text-slate-300 mx-1">:</span>
        <span className="text-6xl sm:text-7xl font-bold w-[76px] sm:w-[90px] text-center">{seconds.toString().padStart(2, '0')}</span>
        <span className="text-2xl sm:text-3xl text-slate-300 mx-1 self-end mb-2 sm:mb-3">.</span>
        <span className="text-3xl sm:text-4xl font-medium text-cyan-500 w-[50px] sm:w-[60px] self-end mb-1 sm:mb-2">{milliseconds.toString().padStart(2, '0')}</span>
      </div>
    );
  };

  const formatRestTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const formatCountdown = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatLapTime = (ms: number) => {
    const min = Math.floor(ms / 60000).toString().padStart(2, '0');
    const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const mil = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${min}:${sec}.${mil}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">

      {/* Header & Toggle */}
      <div className="px-5 pt-6 pb-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-xs mb-4">
          {/* Mode Switcher */}
          <div className="flex bg-slate-200 p-1 rounded-full flex-1 mr-4">
            <button
              onClick={() => { playSound('click'); setMode('free'); }}
              className={`flex-1 py-1.5 rounded-full text-sm font-bold transition-all ${mode === 'free' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Livre
            </button>
            <button
              onClick={() => { playSound('click'); setMode('interval'); }}
              className={`flex-1 py-1.5 rounded-full text-sm font-bold transition-all ${mode === 'interval' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Intervalado
            </button>
          </div>

          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-full transition-colors ${isMuted ? 'bg-slate-200 text-slate-500' : 'bg-cyan-100 text-cyan-600'}`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-4 pb-24 overflow-y-auto no-scrollbar">

        {/* ================= MODE: INTERVAL SETUP ================= */}
        {mode === 'interval' && intervalPhase === 'ready' && (
          <div className="w-full max-w-xs space-y-4 animate-in slide-in-from-bottom-4">

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
              <Dumbbell size={32} className="text-cyan-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-800 mb-1">Configurar Treino</h2>
              <p className="text-sm text-slate-400">Defina suas séries e intervalos</p>
            </div>

            {/* Sets Input */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-700">Séries</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setSets(Math.max(1, sets - 1))} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"><Minus size={18} /></button>
                <span className="text-2xl font-bold text-slate-900 w-8 text-center">{sets}</span>
                <button onClick={() => setSets(sets + 1)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"><Plus size={18} /></button>
              </div>
            </div>

            {/* Work Time Input (Minutes & Seconds) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-lime-500"></div>
                <span className="font-bold text-slate-700">Ação (Min : Seg)</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Minutes Control */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                  <button onClick={() => adjustTime(setWorkSecs, workSecs, 'min', -1, 5)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Minus size={14} /></button>
                  <div className="flex flex-col items-center w-12">
                    <span className="text-xl font-bold text-slate-900">{Math.floor(workSecs / 60).toString().padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Min</span>
                  </div>
                  <button onClick={() => adjustTime(setWorkSecs, workSecs, 'min', 1, 5)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Plus size={14} /></button>
                </div>

                <span className="text-slate-300 font-bold">:</span>

                {/* Seconds Control */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                  <button onClick={() => adjustTime(setWorkSecs, workSecs, 'sec', -5, 5)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Minus size={14} /></button>
                  <div className="flex flex-col items-center w-12">
                    <span className="text-xl font-bold text-slate-900">{(workSecs % 60).toString().padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Seg</span>
                  </div>
                  <button onClick={() => adjustTime(setWorkSecs, workSecs, 'sec', 5, 5)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Plus size={14} /></button>
                </div>
              </div>
            </div>

            {/* Rest Time Input (Minutes & Seconds) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="font-bold text-slate-700">Descanso (Min : Seg)</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Minutes Control */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                  <button onClick={() => adjustTime(setRestSecs, restSecs, 'min', -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Minus size={14} /></button>
                  <div className="flex flex-col items-center w-12">
                    <span className="text-xl font-bold text-slate-900">{Math.floor(restSecs / 60).toString().padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Min</span>
                  </div>
                  <button onClick={() => adjustTime(setRestSecs, restSecs, 'min', 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Plus size={14} /></button>
                </div>

                <span className="text-slate-300 font-bold">:</span>

                {/* Seconds Control */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                  <button onClick={() => adjustTime(setRestSecs, restSecs, 'sec', -5)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Minus size={14} /></button>
                  <div className="flex flex-col items-center w-12">
                    <span className="text-xl font-bold text-slate-900">{(restSecs % 60).toString().padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Seg</span>
                  </div>
                  <button onClick={() => adjustTime(setRestSecs, restSecs, 'sec', 5)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90"><Plus size={14} /></button>
                </div>
              </div>
            </div>

            <button
              onClick={startInterval}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Play size={20} fill="currentColor" />
              Começar Treino
            </button>
          </div>
        )}


        {/* ================= MAIN DISPLAY (SHARED) ================= */}
        {((mode === 'free') || (mode === 'interval' && intervalPhase !== 'ready')) && (
          <>
            <div className="relative mb-12 mt-4">
              {/* Background Decor */}
              <div className={`absolute inset-0 bg-gradient-to-tr rounded-full blur-3xl opacity-20 transition-all duration-1000 
                    ${mode === 'interval' && intervalPhase === 'work' ? 'from-cyan-400 to-lime-500 scale-110 opacity-40' : ''}
                    ${mode === 'interval' && intervalPhase === 'rest' ? 'from-orange-400 to-amber-500 scale-110 opacity-40' : ''}
                    ${mode === 'interval' && intervalPhase === 'finished' ? 'from-purple-400 to-blue-500 scale-100 opacity-20' : ''}
                    ${mode === 'free' && isRunning ? 'from-cyan-400 to-lime-400 scale-110 opacity-30' : 'from-slate-300 to-slate-400 scale-100'}
                `}></div>

              <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center overflow-hidden">

                {/* --- INTERVAL DISPLAY --- */}
                {mode === 'interval' ? (
                  <>
                    {intervalPhase === 'finished' ? (
                      <div className="flex flex-col items-center animate-in zoom-in">
                        <Flag size={48} className="text-purple-500 mb-2" />
                        <span className="text-2xl font-bold text-slate-800">Treino Concluído!</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-7xl font-mono font-bold text-slate-800 tracking-tight">
                          {formatCountdown(timeLeft)}
                        </span>
                        <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest flex items-center gap-2 
                                        ${intervalPhase === 'work' ? 'bg-lime-100 text-lime-700' : 'bg-amber-100 text-amber-700'}`}>
                          {intervalPhase === 'work' ? <Dumbbell size={16} /> : <Coffee size={16} />}
                          {intervalPhase === 'work' ? 'Ação' : 'Descanso'}
                        </div>
                        <span className="absolute bottom-10 text-slate-400 font-bold text-sm">
                          Série {currentSet} de {sets}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  /* --- FREE DISPLAY --- */
                  <>
                    <div className={`transition-all duration-500 ${isResting ? 'scale-90 opacity-40 blur-[1px]' : 'scale-100 opacity-100'}`}>
                      {formatTime(time)}
                    </div>
                    <div className="absolute bottom-10 flex flex-col items-center">
                      {isResting ? (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-2 fade-in">
                          <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                            <Coffee size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Descanso</span>
                          </div>
                          <span className="text-3xl font-mono font-bold text-slate-800 bg-orange-50 px-4 py-1 rounded-xl border border-orange-100 shadow-sm">
                            {formatRestTime(restTime)}
                          </span>
                        </div>
                      ) : (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${isRunning ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-400'}`}>
                          {isRunning ? 'Treinando' : 'Pronto'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex items-center gap-6 mb-10 w-full max-w-xs justify-center">

              {mode === 'free' && (
                <>
                  {/* Free Mode: Reset/Lap/Save */}
                  {!isRunning && !isResting && time === 0 ? (
                    <button disabled className="w-16 h-16 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center transition-all cursor-not-allowed">
                      <RotateCcw size={24} />
                    </button>
                  ) : isRunning ? (
                    <button onClick={handleFreeLap} className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 border-2 border-amber-200 hover:bg-amber-200 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-amber-500/10">
                      <Flag size={24} fill="currentColor" />
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button onClick={handleFreeReset} className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all">
                        <RotateCcw size={24} />
                      </button>
                      {/* Save Button shows when stopped and has time */}
                      {time > 0 && (
                        <button onClick={handleSaveWorkout} disabled={isSaving} className="w-16 h-16 rounded-full bg-cyan-100 text-cyan-600 border-2 border-cyan-200 hover:bg-cyan-200 flex items-center justify-center transition-all">
                          {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Free Mode: Play/Pause */}
                  <button onClick={handleFreeStartStop} className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 ${isRunning ? 'bg-red-500 shadow-red-500/30' : 'bg-lime-500 shadow-lime-500/30'}`}>
                    {isRunning ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
                  </button>
                </>
              )}

              {mode === 'interval' && (
                <>
                  {/* Interval Mode: Reset/Config/Save */}
                  <div className="flex flex-col gap-2">
                    <button onClick={resetInterval} className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all">
                      {intervalPhase === 'finished' ? <RotateCcw size={24} /> : <Settings2 size={24} />}
                    </button>
                    {intervalPhase === 'finished' && (
                      <button onClick={handleSaveWorkout} disabled={isSaving} className="w-16 h-16 rounded-full bg-cyan-100 text-cyan-600 border-2 border-cyan-200 hover:bg-cyan-200 flex items-center justify-center transition-all">
                        {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                      </button>
                    )}
                  </div>

                  {/* Interval Mode: Play/Pause */}
                  {intervalPhase !== 'finished' && (
                    <button onClick={isIntervalRunning ? pauseInterval : startInterval} className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 ${isIntervalRunning ? 'bg-amber-500 shadow-amber-500/30' : 'bg-slate-900 shadow-slate-900/30'}`}>
                      {isIntervalRunning ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Laps List (Only Free Mode) */}
        {mode === 'free' && laps.length > 0 && (
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico de Voltas</span>
              <span className="text-xs font-bold text-slate-400">{laps.length} registros</span>
            </div>
            <div className="max-h-60 overflow-y-auto no-scrollbar">
              {laps.map((lapTime, index) => (
                <div key={index} className="flex justify-between items-center px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-semibold text-slate-400">Volta {laps.length - index}</span>
                  <span className="text-lg font-mono font-bold text-slate-700">{formatLapTime(lapTime)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StopwatchScreen;