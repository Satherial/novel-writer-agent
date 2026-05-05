"use client";

import { useState, useEffect } from "react";

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  projectId: string;
}

// Modal for Chapter Generation
export function ChapterWorkflowModal({ isOpen, onClose, onSubmit }: WorkflowModalProps) {
  const [chapterNum, setChapterNum] = useState(1);
  const [title, setTitle] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [tone, setTone] = useState("drammatico");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      chapterNum,
      title: title || `Capitolo ${chapterNum}`,
      keyPoints,
      tone,
    });
    onClose();
    // Reset form
    setChapterNum(1);
    setTitle("");
    setKeyPoints("");
    setTone("drammatico");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📝 Scrivi Capitolo</h3>
          <p className="text-sm text-gray-500 mt-1">Genera un nuovo capitolo per il tuo romanzo</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
              <input
                type="number"
                min={1}
                value={chapterNum}
                onChange={(e) => setChapterNum(parseInt(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tono</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="epico">Epico</option>
                <option value="intimo">Intimo</option>
                <option value="drammatico">Drammatico</option>
                <option value="leggero">Leggero</option>
                <option value="sospense">Suspense</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo capitolo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Capitolo ${chapterNum}`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Punti chiave da trattare</label>
            <textarea
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="Descrivi brevemente cosa deve succedere in questo capitolo..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Genera Capitolo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for Character Generation
export function CharacterWorkflowModal({ isOpen, onClose, onSubmit }: WorkflowModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("secondario");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [traits, setTraits] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      role,
      age,
      gender,
      traits,
    });
    onClose();
    // Reset
    setName("");
    setRole("secondario");
    setAge("");
    setGender("");
    setTraits("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">👤 Crea Personaggio</h3>
          <p className="text-sm text-gray-500 mt-1">Genera una scheda personaggio completa</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome personaggio *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Marco Rossi"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="protagonista">Protagonista</option>
                <option value="antagonista">Antagonista</option>
                <option value="secondario">Secondario</option>
                <option value=" comprimario">Comprimario</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Età</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Es: 32"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sesso/Genere</label>
            <input
              type="text"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="Es: Maschio, Femmina, Non-binary..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caratteristiche distintive</label>
            <textarea
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              placeholder="Descrivi carattere, aspetto fisico, background..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Crea Personaggio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for Dialog Generation
export function DialogWorkflowModal({ isOpen, onClose, onSubmit }: WorkflowModalProps) {
  const [char1, setChar1] = useState("");
  const [char2, setChar2] = useState("");
  const [topic, setTopic] = useState("");
  const [tension, setTension] = useState("calma");
  const [location, setLocation] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      char1,
      char2,
      topic,
      tension,
      location,
    });
    onClose();
    // Reset
    setChar1("");
    setChar2("");
    setTopic("");
    setTension("calma");
    setLocation("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">💭 Genera Dialogo</h3>
          <p className="text-sm text-gray-500 mt-1">Crea una conversazione tra personaggi</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personaggio 1 *</label>
              <input
                type="text"
                value={char1}
                onChange={(e) => setChar1(e.target.value)}
                placeholder="Es: Marco"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personaggio 2 *</label>
              <input
                type="text"
                value={char2}
                onChange={(e) => setChar2(e.target.value)}
                placeholder="Es: Giulia"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema/Argomento *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Di cosa parlano? Es: Una rivelazione importante, un litigio..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tensione</label>
              <select
                value={tension}
                onChange={(e) => setTension(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="calma">Calma</option>
                <option value="tesa">Tesa</option>
                <option value="conflittuale">Conflittuale</option>
                <option value="romantica">Romantica</option>
                <option value="umoristica">Umoristica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo (opz.)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Es: Un caffè"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Genera Dialogo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for Text Review
export function ReviewWorkflowModal({ isOpen, onClose, onSubmit, selectedFile }: WorkflowModalProps & { selectedFile?: string | null }) {
  const [focus, setFocus] = useState({
    grammar: true,
    style: true,
    flow: true,
    dialogue: false,
  });
  const [intensity, setIntensity] = useState(2);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      focus,
      intensity,
      notes,
    });
    onClose();
    // Reset
    setFocus({ grammar: true, style: true, flow: true, dialogue: false });
    setIntensity(2);
    setNotes("");
  };

  const intensityLabels = ["Leggero", "Moderato", "Intenso", "Aggressivo"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Revisiona Testo</h3>
          <p className="text-sm text-gray-500 mt-1">
            {selectedFile ? `Revisione di: ${selectedFile}` : "Seleziona un file prima di revisionare"}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Focus revisione</label>
            <div className="space-y-2">
              {[
                { key: "grammar", label: "Grammatica e ortografia" },
                { key: "style", label: "Stile e scorrevolezza" },
                { key: "flow", label: "Struttura e ritmo" },
                { key: "dialogue", label: "Dialoghi (realismo, tagli)" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={focus[key as keyof typeof focus]}
                    onChange={(e) => setFocus({ ...focus, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Livello di intervento: {intensityLabels[intensity - 1]}
            </label>
            <input
              type="range"
              min={1}
              max={4}
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Leggero</span>
              <span>Aggressivo</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note aggiuntive (opz.)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aspetti specifici su cui concentrarsi..."
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!selectedFile}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Revisiona
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
