import React, { useState, useRef, useEffect } from 'react';
import { Camera, Utensils, ChevronRight, Flame, Plus, ScanLine, Edit2, Check, X, Clock, ChevronDown, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../supabaseClient';

interface Meal {
  id: string;
  meal_type: string;
  name: string;
  calories: number;
}

const MEAL_TYPES = ['Café da Manhã', 'Almoço', 'Jantar', 'Lanche', 'Pré-Treino', 'Pós-Treino'];

const NutritionScreen: React.FC = () => {
  // --- STATE ---
  const [targetCalories, setTargetCalories] = useState(2000); // This could be saved in profiles
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Meal List State
  const [meals, setMeals] = useState<Meal[]>([]);

  // Derived State: Calculate Total Calories dynamically
  const currentCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // AI Analyze Modal State
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisImage, setAnalysisImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{name: string, calories: number} | null>(null);

  // Shared Form State (Used by both Manual and AI modals)
  const [newMealType, setNewMealType] = useState(MEAL_TYPES[3]); // Default to Lanche
  const [newMealName, setNewMealName] = useState('');
  const [newMealCalories, setNewMealCalories] = useState('');

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMeals();
  }, []);

  useEffect(() => {
    if (isEditingTarget && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingTarget]);

  const fetchMeals = async () => {
    try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;
        
        // Fetch meals for today
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('date', today);
            
        if(error) throw error;
        
        if(data) {
            setMeals(data);
        }
    } catch (err) {
        console.error("Error fetching meals:", err);
    } finally {
        setLoading(false);
    }
  };

  // --- LOGIC ---
  const percentage = Math.min((currentCalories / targetCalories) * 100, 100);
  
  // SVG Math for Circle
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleTargetSubmit = () => {
    setIsEditingTarget(false);
    if (targetCalories < 500) setTargetCalories(500);
    // Optional: Save target to profiles table here
  };

  const handleAddMeal = async () => {
    if (!newMealName || !newMealCalories) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;

        const newMealPayload = {
            user_id: session.user.id,
            meal_type: newMealType,
            name: newMealName,
            calories: parseInt(newMealCalories),
            date: new Date().toISOString().split('T')[0] // Today
        };

        const { data, error } = await supabase
            .from('meals')
            .insert(newMealPayload)
            .select()
            .single();
            
        if(error) throw error;

        if(data) {
            setMeals(prev => [...prev, data]);
        }

        // Reset and Close
        setNewMealName('');
        setNewMealCalories('');
        setAnalysisImage(null);
        setAnalysisResult(null);
        setIsAddModalOpen(false);
        setIsAnalyzeModalOpen(false);

    } catch (err: any) {
        alert('Erro ao salvar refeição: ' + err.message);
    }
  };

  // --- GEMINI AI INTEGRATION ---
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAnalysisImage(base64String);
        setAnalysisResult(null); // Reset previous result
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeWithGemini = async () => {
    if (!analysisImage) return;

    setIsAnalyzing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = analysisImage.split(',')[1];
      const mimeType = analysisImage.split(';')[0].split(':')[1];

      const schema = {
        type: Type.OBJECT,
        properties: {
          foodName: { type: Type.STRING, description: "Nome curto e descritivo do alimento identificado." },
          calories: { type: Type.INTEGER, description: "Estimativa total de calorias." }
        },
        required: ["foodName", "calories"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: "Identifique o alimento nesta imagem e estime as calorias totais aproximadas. Retorne apenas o JSON." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const resultText = response.text;
      if (resultText) {
        const data = JSON.parse(resultText);
        setAnalysisResult({
            name: data.foodName,
            calories: data.calories
        });
        setNewMealName(data.foodName);
        setNewMealCalories(data.calories.toString());
      }

    } catch (error) {
      console.error("Gemini Error:", error);
      alert("Não foi possível analisar a imagem. Verifique sua conexão ou tente outra foto.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMealIconColor = (type: string) => {
      if (type.includes('Café')) return 'text-orange-500 bg-orange-50 border-orange-100';
      if (type.includes('Almoço')) return 'text-lime-600 bg-lime-50 border-lime-100';
      if (type.includes('Jantar')) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      return 'text-cyan-600 bg-cyan-50 border-cyan-100';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 relative animate-in fade-in duration-300 overflow-y-auto no-scrollbar pb-24">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>

      {/* Header Title */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between z-10 sticky top-0 bg-slate-50/90 backdrop-blur-sm">
        <h1 className="text-2xl font-bold italic tracking-tight text-slate-900">Nutrição</h1>
        <div className="bg-orange-100 p-2 rounded-full">
            <Flame size={20} className="text-orange-500" fill="currentColor" />
        </div>
      </div>

      {/* 1. TOP: Circular Progress Indicator */}
      <div className="flex flex-col items-center justify-center py-6 relative z-10">
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* SVG Ring */}
            <svg className="transform -rotate-90 w-full h-full drop-shadow-xl">
                <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200" />
                <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
                    className="text-lime-500 transition-all duration-1000 ease-out" />
            </svg>
            
            {/* Inner Content */}
            <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-bold tracking-tighter text-slate-800">{currentCalories}</span>
                <div className="w-12 h-0.5 bg-slate-200 my-2"></div>
                
                {/* Editable Target Area */}
                <div className="flex items-center gap-2 h-8">
                    {isEditingTarget ? (
                        <div className="flex items-center bg-slate-100 rounded-lg px-2 border border-cyan-300 ring-2 ring-cyan-100">
                            <input 
                                ref={inputRef}
                                type="number" 
                                className="w-16 bg-transparent text-sm font-bold text-slate-700 outline-none text-center"
                                value={targetCalories}
                                onChange={(e) => setTargetCalories(Number(e.target.value))}
                                onBlur={handleTargetSubmit}
                                onKeyDown={(e) => e.key === 'Enter' && handleTargetSubmit()}
                            />
                            <button onClick={handleTargetSubmit} className="text-cyan-600 ml-1"><Check size={14} /></button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsEditingTarget(true)}
                            className="group flex items-center gap-1.5 text-slate-400 hover:text-cyan-600 transition-colors px-2 py-1 rounded-full hover:bg-slate-100"
                            title="Editar Meta"
                        >
                            <span className="text-lg font-medium font-mono group-hover:text-cyan-600 text-slate-500">{targetCalories} kcal</span>
                            <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* 2. MIDDLE: Analyze Meal Button */}
      <div className="px-6 py-4 z-10">
        <button 
            onClick={() => {
                setNewMealName('');
                setNewMealCalories('');
                setAnalysisImage(null);
                setAnalysisResult(null);
                setIsAnalyzeModalOpen(true);
            }}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white p-1 rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all group"
        >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl py-4 px-6 flex items-center justify-center gap-3 h-full w-full border border-white/20 group-hover:bg-transparent transition-colors">
                <div className="bg-white/20 p-2 rounded-full shadow-inner">
                    <Camera size={24} />
                </div>
                <span className="text-lg font-bold tracking-wide">Analisar Refeição</span>
                <ScanLine size={20} className="text-white/70 ml-auto" />
            </div>
        </button>
      </div>

      {/* 3. BOTTOM: List View */}
      <div className="flex-1 mt-2 px-6">
        
        {/* Today Section */}
        <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-500"></div> Hoje
            </h3>
            
            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-cyan-600"/></div>
                ) : meals.map((meal) => (
                    <div key={meal.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl border ${getMealIconColor(meal.meal_type)}`}>
                                <Utensils size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{meal.meal_type}</span>
                                <span className="text-xs text-slate-500 font-medium">{meal.name}</span>
                            </div>
                        </div>
                        <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md text-sm border border-slate-100">{meal.calories} kcal</span>
                    </div>
                ))}

                {!loading && meals.length === 0 && (
                     <div className="text-center py-6 text-slate-400 text-sm">Nenhuma refeição registrada hoje.</div>
                )}
            </div>
            
            {/* Add Manual Button */}
            <button 
                onClick={() => {
                    setNewMealName('');
                    setNewMealCalories('');
                    setIsAddModalOpen(true);
                }}
                className="w-full mt-3 py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-semibold hover:bg-white hover:border-cyan-400 hover:text-cyan-600 hover:shadow-sm transition-all flex items-center justify-center gap-2 bg-slate-50"
            >
                <Plus size={16} /> Adicionar Manualmente
            </button>
        </div>

      </div>

      {/* ======================================== */}
      {/* MANUAL MEAL MODAL                        */}
      {/* ======================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
                
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold italic text-slate-900">Adicionar Refeição</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    
                    {/* Meal Type Dropdown */}
                    <div className="relative">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Tipo</label>
                        <div className="relative">
                            <select 
                                value={newMealType} 
                                onChange={(e) => setNewMealType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl appearance-none focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                            >
                                {MEAL_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Meal Name Input */}
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Alimento</label>
                         <input 
                            type="text" 
                            placeholder="Ex: Tapioca com queijo" 
                            value={newMealName}
                            onChange={(e) => setNewMealName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium py-3 px-4 rounded-xl focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Calories Input */}
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Calorias (kcal)</label>
                         <input 
                            type="number" 
                            placeholder="0" 
                            value={newMealCalories}
                            onChange={(e) => setNewMealCalories(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium py-3 px-4 rounded-xl focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                        />
                    </div>

                    <button 
                        onClick={handleAddMeal}
                        disabled={!newMealName || !newMealCalories}
                        className="w-full py-4 mt-2 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={20} /> Adicionar
                    </button>

                </div>
             </div>
        </div>
      )}

      {/* ======================================== */}
      {/* AI ANALYSIS MODAL                        */}
      {/* ======================================== */}
      {isAnalyzeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                         <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-1.5 rounded-lg text-white">
                             <Sparkles size={16} fill="currentColor" />
                         </div>
                         <h2 className="text-xl font-bold italic text-slate-900">Análise AI</h2>
                    </div>
                    <button onClick={() => setIsAnalyzeModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto no-scrollbar space-y-5">
                    
                    {/* 1. Meal Type Dropdown */}
                    <div className="relative">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Refeição</label>
                        <div className="relative">
                            <select 
                                value={newMealType} 
                                onChange={(e) => setNewMealType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl appearance-none focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                            >
                                {MEAL_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Image Upload / Preview Area */}
                    <div className="w-full aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-cyan-200 flex flex-col items-center justify-center relative overflow-hidden transition-all">
                        {analysisImage ? (
                            <>
                                <img src={analysisImage} alt="Analysis Target" className="w-full h-full object-cover" />
                                {/* Scanning Overlay */}
                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                                        <ScanLine size={48} className="text-cyan-400 animate-pulse mb-4" />
                                        <div className="flex items-center gap-2 text-white font-bold animate-pulse">
                                            <Loader2 size={18} className="animate-spin" />
                                            Analisando...
                                        </div>
                                    </div>
                                )}
                                {/* Retake Button */}
                                {!isAnalyzing && !analysisResult && (
                                     <button 
                                        onClick={() => setAnalysisImage(null)}
                                        className="absolute bottom-3 right-3 bg-white/80 backdrop-blur text-slate-700 p-2 rounded-lg text-xs font-bold shadow-sm hover:bg-white z-20"
                                     >
                                        Trocar foto
                                     </button>
                                )}
                            </>
                        ) : (
                            <div className="flex gap-6 z-10">
                                {/* Camera Button */}
                                <button 
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 group p-2"
                                >
                                    <div className="bg-cyan-100 p-4 rounded-full group-hover:bg-cyan-200 group-hover:scale-105 transition-all shadow-sm">
                                        <Camera size={32} className="text-cyan-600" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-cyan-600">Tirar Foto</span>
                                </button>
                                
                                {/* Gallery Button */}
                                <button 
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 group p-2"
                                >
                                    <div className="bg-purple-100 p-4 rounded-full group-hover:bg-purple-200 group-hover:scale-105 transition-all shadow-sm">
                                        <ImageIcon size={32} className="text-purple-600" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-purple-600">Galeria</span>
                                </button>
                            </div>
                        )}
                        
                        {/* Hidden Inputs */}
                        <input 
                            ref={cameraInputRef}
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden"
                            onChange={handleImageSelect}
                            disabled={isAnalyzing}
                        />
                        <input 
                            ref={galleryInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={handleImageSelect}
                            disabled={isAnalyzing}
                        />
                    </div>

                    {/* 3. Action / Result Section */}
                    {!analysisResult ? (
                        <button 
                            onClick={handleAnalyzeWithGemini}
                            disabled={!analysisImage || isAnalyzing}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? 'Processando...' : 'Identificar Calorias'}
                        </button>
                    ) : (
                        <div className="bg-lime-50 border border-lime-200 rounded-3xl p-5 animate-in fade-in slide-in-from-bottom-2 space-y-4 text-center">
                            
                            <div className="flex flex-col items-center justify-center">
                                <div className="bg-lime-100 p-2 rounded-full mb-2">
                                    <Check size={24} className="text-lime-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{newMealName}</h3>
                                <div className="text-4xl font-extrabold text-lime-600 my-1">{newMealCalories} <span className="text-lg font-medium text-lime-700">kcal</span></div>
                                <p className="text-xs text-lime-700 opacity-80 mb-2">Estimativa via IA</p>
                            </div>

                            {/* Editable Fields (Hidden by default or smaller to prioritize quick add) */}
                            <div className="grid grid-cols-2 gap-2 text-left">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome (Editar)</label>
                                    <input 
                                        type="text" 
                                        value={newMealName}
                                        onChange={(e) => setNewMealName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calorias (Editar)</label>
                                    <input 
                                        type="number" 
                                        value={newMealCalories}
                                        onChange={(e) => setNewMealCalories(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleAddMeal}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                <Plus size={22} className="text-lime-400" />
                                Adicionar ao Dia
                            </button>
                        </div>
                    )}

                </div>
             </div>
        </div>
      )}

    </div>
  );
};

export default NutritionScreen;