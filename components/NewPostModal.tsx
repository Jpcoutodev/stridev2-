import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Ruler, Scale, Plus, Trash2, MessageSquare, Dumbbell, Smile, Image as ImageIcon } from 'lucide-react';
import { PostModel } from '../types';
import { compressImage, convertHeicToJpeg } from '../lib/imageUtils';
import { useToast } from './Toast';
import { supabase } from '../supabaseClient'; // Added for moderation
import { moderateContent } from '../lib/openai'; // Import Moderation

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated signature to accept the file object
  onSave: (data: Partial<PostModel>, imageFile?: File | null) => void;
  postType: 'image' | 'measurement' | 'text' | 'workout';
  initialData?: PostModel | null;
}

const BODY_PARTS = [
  'Bíceps', 'Peito', 'Cintura', 'Quadril', 'Coxas', 'Panturrilhas', 'Ombros', 'Antebraços', 'Pescoço'
];

const EMOJIS = ['💪', '🔥', '🏃‍♂️', '🧘‍♀️', '✨', '💯', '👏', '🏋️‍♂️', '🥗', '😅', '🚀', '🎯', '💦', '🥑'];

const NewPostModal: React.FC<NewPostModalProps> = ({ isOpen, onClose, onSave, postType, initialData }) => {
  const { showToast } = useToast();
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Added for moderation loading state

  // Measurement Logic
  const [measurements, setMeasurements] = useState<{ part: string, value: string }[]>([]);
  const [currentPart, setCurrentPart] = useState(BODY_PARTS[0]);
  const [currentValue, setCurrentValue] = useState('');
  const [weight, setWeight] = useState<string>('');

  // Workout Logic
  const [workoutItems, setWorkoutItems] = useState<{ activity: string, detail: string }[]>([]);
  const [currentActivity, setCurrentActivity] = useState('');
  const [currentDetail, setCurrentDetail] = useState('');

  // Refs for File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- Initialize State on Open (Edit Mode vs Create Mode) ---
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // EDIT MODE: Populate fields
        setCaption(initialData.caption || '');
        setSelectedImagePreview(initialData.imageUrl || null);
        setSelectedImageFile(null); // Reset file on edit init
        setWeight(initialData.weight?.toString() || '');

        // Parse Measurement String
        if (initialData.measurements) {
          const parts = initialData.measurements.split(' | ');
          const parsed = parts.map(p => {
            const [label, val] = p.split(': ');
            return { part: label, value: val.replace('cm', '') };
          }).filter(i => i.part && i.value);
          setMeasurements(parsed);
        } else {
          setMeasurements([]);
        }

        // Parse Workout Items
        setWorkoutItems(initialData.workoutItems || []);

      } else {
        // CREATE MODE: Reset fields
        setCaption('');
        setSelectedImagePreview(null);
        setSelectedImageFile(null);
        setMeasurements([]);
        setWorkoutItems([]);
        setCurrentValue('');
        setCurrentActivity('');
        setCurrentDetail('');
        setWeight('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Construct the payload based on current state
    const payload: Partial<PostModel> = {
      caption,
      // We pass the preview URL as a fallback if no new file is uploaded (editing existing)
      imageUrl: selectedImagePreview || undefined,
      weight: weight ? parseFloat(weight) : undefined,
    };

    if (measurements.length > 0) {
      payload.measurements = measurements.map(m => `${m.part}: ${m.value}cm`).join(' | ');
    }

    if (workoutItems.length > 0) {
      payload.workoutItems = workoutItems;
    }

    // Pass the file separately so App.tsx can handle upload
    onSave(payload, selectedImageFile);
  };



  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      try {
        // Step 1: Convert HEIC to JPEG if needed
        const convertedFile = await convertHeicToJpeg(originalFile);

        // Step 2: Compress the image
        const compressedFile = await compressImage(convertedFile, 1024, 0.7);
        setSelectedImageFile(compressedFile);
        // Create a local preview URL from the compressed file
        setSelectedImagePreview(URL.createObjectURL(compressedFile));
      } catch (error: any) {
        console.error("Compression/Selection error:", error);

        // FALLBACK: If compression fails (e.g. format issue), try using original if < 10MB
        if (originalFile.size < 10 * 1024 * 1024) {
          console.warn("Compression failed, using original file as fallback.");
          setSelectedImageFile(originalFile);

          // Check if it's a format we can preview (browser-supported)
          const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
          if (supportedTypes.includes(originalFile.type.toLowerCase())) {
            setSelectedImagePreview(URL.createObjectURL(originalFile));
          } else {
            // Use special marker for unsupported formats (e.g., HEIC)
            setSelectedImagePreview('NO_PREVIEW');
          }
        } else {
          showToast(`Erro: Imagem muito grande e falha na otimização. (${error.message || "Tente outra imagem"})`, 'error');
        }
      }
    }
  };

  // Measurement Helpers
  const addMeasurement = () => {
    if (currentValue) {
      setMeasurements([...measurements, { part: currentPart, value: currentValue }]);
      setCurrentValue('');
    }
  };
  const removeMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  // Workout Helpers
  const addWorkoutItem = () => {
    if (currentActivity && currentDetail) {
      setWorkoutItems([...workoutItems, { activity: currentActivity, detail: currentDetail }]);
      setCurrentActivity('');
      setCurrentDetail('');
    }
  };
  const removeWorkoutItem = (index: number) => {
    setWorkoutItems(workoutItems.filter((_, i) => i !== index));
  };

  // Text Helpers
  const addEmoji = (emoji: string) => {
    setCaption(prev => prev + emoji);
  };

  // Dynamic Title based on type
  const getTitle = () => {
    if (initialData) return 'Editar Post'; // Edit mode title

    switch (postType) {
      case 'image': return 'Postar Foto';
      case 'measurement': return 'Registrar Medidas';
      case 'text': return 'Compartilhar Pensamento';
      case 'workout': return 'Treino de Hoje';
      default: return 'Novo Stride';
    }
  };

  const getButtonText = () => {
    if (initialData) return 'Salvar Alterações';

    switch (postType) {
      case 'measurement': return 'Salvar Medidas';
      case 'workout': return 'Salvar Treino';
      default: return 'Compartilhar Stride';
    }
  };

  const getPlaceholder = () => {
    switch (postType) {
      case 'text': return "No que está pensando? Compartilhe sua motivação...";
      case 'image': return "Descreva o momento...";
      default: return "Como foi o treino?";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all scale-100 border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold italic tracking-tight text-slate-900">{getTitle()}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={26} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">

          {/* IMAGE UPLOAD (Available for Image AND Measurement types now) */}
          {(postType === 'image' || postType === 'measurement') && (
            <div className="space-y-3">
              {selectedImagePreview ? (
                // Preview Mode
                <div className="w-full aspect-[4/3] bg-slate-50 rounded-2xl border border-slate-200 relative overflow-hidden group">
                  {selectedImagePreview === 'NO_PREVIEW' ? (
                    // Placeholder for unsupported formats
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-cyan-50 to-slate-50 p-6">
                      <div className="bg-white p-4 rounded-full shadow-md">
                        <ImageIcon size={40} className="text-cyan-500" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-700 mb-1">Imagem Selecionada</p>
                        <p className="text-xs text-slate-500 max-w-[200px] truncate">{selectedImageFile?.name}</p>
                        <p className="text-xs text-cyan-600 mt-2">✓ Pronta para postar</p>
                      </div>
                    </div>
                  ) : (
                    // Normal image preview
                    <img src={selectedImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => {
                      setSelectedImagePreview(null);
                      setSelectedImageFile(null);
                    }}
                    className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                // Selection Mode (Split Buttons)
                <div className="grid grid-cols-2 gap-4">
                  {/* Camera Button */}
                  <div
                    onClick={() => cameraInputRef.current?.click()}
                    className="aspect-square bg-cyan-50 rounded-2xl border-2 border-dashed border-cyan-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-cyan-100 hover:border-cyan-300 transition-all active:scale-95"
                  >
                    <div className="bg-white p-3 rounded-full shadow-sm text-cyan-600">
                      <Camera size={28} />
                    </div>
                    <span className="font-bold text-cyan-700 text-sm">Tirar Foto</span>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>

                  {/* Gallery Button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95"
                  >
                    <div className="bg-white p-3 rounded-full shadow-sm text-slate-500">
                      <ImageIcon size={28} />
                    </div>
                    <span className="font-bold text-slate-600 text-sm">Galeria</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MEASUREMENT BUILDER (Only for Measurement Type) */}
          {postType === 'measurement' && (
            <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Ruler size={20} className="text-lime-600" />
                <span className="font-bold text-slate-700">Adicionar Medidas</span>
              </div>

              {/* Input Row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={currentPart}
                    onChange={(e) => setCurrentPart(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-xl leading-tight focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {BODY_PARTS.map(part => <option key={part} value={part}>{part}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>

                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="cm"
                  className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-3 font-semibold text-slate-900 focus:outline-none focus:border-cyan-500"
                />

                <button
                  onClick={addMeasurement}
                  disabled={!currentValue}
                  className="bg-lime-400 hover:bg-lime-500 text-slate-900 p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={24} />
                </button>
              </div>

              {/* List of Added Measurements */}
              {measurements.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
                  {measurements.map((m, index) => (
                    <div key={index} className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm animate-in fade-in zoom-in duration-200">
                      <span className="text-sm font-semibold text-slate-600 mr-2">{m.part}:</span>
                      <span className="text-sm font-bold text-slate-900 mr-2">{m.value}cm</span>
                      <button onClick={() => removeMeasurement(index)} className="text-slate-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WORKOUT BUILDER (Only for Workout Type) */}
          {postType === 'workout' && (
            <div className="bg-orange-50 p-4 rounded-2xl space-y-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell size={20} className="text-orange-600" />
                <span className="font-bold text-slate-700">Adicionar Exercícios</span>
              </div>

              {/* Input Row */}
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={currentActivity}
                  onChange={(e) => setCurrentActivity(e.target.value)}
                  placeholder="Atividade (Ex: Corrida)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                />
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={currentDetail}
                    onChange={(e) => setCurrentDetail(e.target.value)}
                    placeholder="Detalhes (Ex: 5km)"
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={addWorkoutItem}
                    disabled={!currentActivity || !currentDetail}
                    className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0 w-12 h-12"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>

              {/* List of Added Workout Items */}
              {workoutItems.length > 0 && (
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-orange-200/50">
                  {workoutItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-orange-100 rounded-xl px-4 py-3 shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{item.activity}</span>
                        <span className="text-xs font-semibold text-orange-600">{item.detail}</span>
                      </div>
                      <button type="button" onClick={() => removeWorkoutItem(index)} className="text-slate-400 hover:text-red-500 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WEIGHT Input (Only for Measurement Mode now) */}
          {postType === 'measurement' && (
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Scale size={20} className="text-cyan-500" />
              </div>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Peso Atual (kg)"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all font-semibold text-slate-700 placeholder-slate-400"
              />
            </div>
          )}

          {/* CAPTION (Larger for Text Mode) */}
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={getPlaceholder()}
              rows={postType === 'text' ? 5 : 3}
              className={`w-full p-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all resize-none text-slate-700 placeholder-slate-400 font-medium ${postType === 'text' ? 'text-lg' : ''}`}
            ></textarea>
            {postType === 'text' && (
              <div className="absolute bottom-3 right-3 text-slate-400">
                <MessageSquare size={20} />
              </div>
            )}
          </div>

          {/* EMOJI BAR (Only for Text Mode) */}
          {postType === 'text' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-center min-w-[32px] h-8 bg-slate-100 rounded-full mr-1">
                <Smile size={18} className="text-slate-500" />
              </div>
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:bg-slate-100 hover:scale-110 p-1.5 rounded-lg transition-all active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all tracking-wide text-lg flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPostModal;