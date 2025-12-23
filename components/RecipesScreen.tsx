import React, { useState, useRef } from 'react';
import { ChefHat, Plus, X, Sparkles, Flame, Clock, ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const RecipesScreen: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<any | null>(null);

  const handleAddIngredient = () => {
    if (currentInput.trim()) {
      if (!ingredients.includes(currentInput.trim())) {
        setIngredients([...ingredients, currentInput.trim()]);
      }
      setCurrentInput('');
    }
  };

  const handleRemoveIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddIngredient();
    }
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) return;

    setIsLoading(true);
    setRecipe(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          calories: { type: Type.INTEGER },
          time: { type: Type.STRING },
          description: { type: Type.STRING },
          ingredients: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["title", "calories", "time", "ingredients", "instructions"]
      };

      const prompt = `Crie uma receita FITNESS e SAUDÁVEL usando principalmente estes ingredientes: ${ingredients.join(', ')}. 
      Você pode adicionar temperos básicos ou ingredientes muito comuns (como água, sal, azeite) se necessário, mas foque no que o usuário tem.
      Seja criativo. O resultado deve ser em Português.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.7
        }
      });

      const resultText = response.text;
      if (resultText) {
         setRecipe(JSON.parse(resultText));
      }

    } catch (error) {
      console.error("Erro ao gerar receita:", error);
      alert("Ocorreu um erro ao consultar o Chef IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300 overflow-y-auto no-scrollbar pb-24">
      
      {/* Header with gradient (Updated to match Nutrition Screen: Cyan/Blue) */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 pt-10 pb-16 rounded-b-[40px] shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
         <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform -translate-x-5 translate-y-5"></div>
         
         <div className="relative z-10 text-white">
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <ChefHat size={28} />
                </div>
                <h1 className="text-2xl font-bold italic tracking-tight">Chef IA</h1>
            </div>
            <p className="text-cyan-50 text-sm font-medium opacity-90 leading-relaxed max-w-[280px]">
                O que tem na sua geladeira? Adicione os itens e deixe a IA criar uma receita fit para você.
            </p>
         </div>
      </div>

      <div className="px-6 -mt-8 relative z-20 space-y-6">
        
        {/* Input Area */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
                <ShoppingBag size={14} /> Ingredientes Disponíveis
            </label>
            
            {/* Tag List (Updated to Lime to signify Food/Ingredients) */}
            <div className="flex flex-wrap gap-2 mb-4">
                {ingredients.map((ing, idx) => (
                    <span key={idx} className="bg-lime-50 text-lime-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-lime-100 animate-in zoom-in duration-200">
                        {ing}
                        <button onClick={() => handleRemoveIngredient(ing)} className="hover:text-red-500">
                            <X size={14} />
                        </button>
                    </span>
                ))}
                {ingredients.length === 0 && (
                    <span className="text-slate-400 text-sm italic py-1.5">Nenhum ingrediente adicionado...</span>
                )}
            </div>

            {/* Input Field (Updated Focus colors to Cyan) */}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Frango, Batata Doce, Ovos..." 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                />
                <button 
                    onClick={handleAddIngredient}
                    disabled={!currentInput.trim()}
                    className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Plus size={24} />
                </button>
            </div>
        </div>

        {/* Generate Button (Updated to Cyan/Blue Gradient) */}
        <button 
            onClick={generateRecipe}
            disabled={ingredients.length === 0 || isLoading}
            className={`w-full py-4 font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg
                ${isLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:shadow-cyan-500/40'}
            `}
        >
            {isLoading ? (
                <>
                    <Loader2 size={24} className="animate-spin" />
                    Criando Receita...
                </>
            ) : (
                <>
                    <Sparkles size={24} fill="currentColor" className="text-cyan-100" />
                    Gerar Receita Fit
                </>
            )}
        </button>

        {/* Recipe Result Card */}
        {recipe && (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-6 duration-500 mb-6">
                
                {/* Header */}
                <div className="bg-slate-50 p-5 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 leading-tight mb-2">{recipe.title}</h2>
                    <p className="text-sm text-slate-500 italic">{recipe.description}</p>
                    
                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                            <Flame size={14} fill="currentColor" />
                            {recipe.calories} kcal
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            <Clock size={14} />
                            {recipe.time}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Ingredients List (Using Lime accents) */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-lime-500 rounded-full"></div> Ingredientes
                        </h3>
                        <ul className="space-y-2">
                            {recipe.ingredients.map((item: string, idx: number) => (
                                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                    <div className="min-w-[6px] h-[6px] rounded-full bg-lime-400 mt-1.5"></div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="w-full h-px bg-slate-100"></div>

                    {/* Instructions List (Using Cyan accents) */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-cyan-500 rounded-full"></div> Modo de Preparo
                        </h3>
                        <div className="space-y-4">
                            {recipe.instructions.map((step: string, idx: number) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default RecipesScreen;