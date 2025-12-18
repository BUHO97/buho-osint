import React, { useState } from 'react';
import { SearchCriteria } from '../types';

interface SearchInterfaceProps {
  onSearch: (criteria: SearchCriteria) => void;
  isLoading: boolean;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ onSearch, isLoading }) => {
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [criteria, setCriteria] = useState<SearchCriteria>({
    query: '',
    country: '',
    ageOrDob: '',
    additionalInfo: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (criteria.query.trim()) {
      onSearch(criteria);
      // Optional: Collapse advanced search on submit for cleaner view
      // setIsAdvanced(false);
    }
  };

  const handleInputChange = (field: keyof SearchCriteria, value: string) => {
    setCriteria(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-4 z-40 bg-gradient-to-b from-slate-900 via-slate-900/90 to-transparent pointer-events-none flex justify-center">
      <div className="w-full max-w-lg pointer-events-auto">
        <form onSubmit={handleSubmit} className="relative group flex flex-col gap-2">
          
          {/* Main Input */}
          <div className="relative z-10">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200 ${isLoading ? 'animate-pulse' : ''}`}></div>
            <div className="relative flex items-center bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
              <input
                type="text"
                value={criteria.query}
                onChange={(e) => handleInputChange('query', e.target.value)}
                placeholder="Objetivo OSINT (Nombre, Usuario, Email)..."
                disabled={isLoading}
                className="w-full bg-transparent text-white px-4 py-3 rounded-l-lg focus:outline-none placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setIsAdvanced(!isAdvanced)}
                className="px-3 py-3 text-slate-400 hover:text-cyan-400 border-l border-slate-700 transition-colors"
                title="Búsqueda Avanzada"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isAdvanced ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 text-cyan-400 hover:text-cyan-300 font-bold tracking-wide rounded-r-lg disabled:opacity-50 hover:bg-slate-800 transition-colors"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'SCAN'
                )}
              </button>
            </div>
          </div>

          {/* Advanced Fields */}
          {isAdvanced && (
            <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600 rounded-lg p-4 grid grid-cols-2 gap-3 shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="col-span-1">
                    <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1 block">País / Región</label>
                    <input 
                        type="text" 
                        value={criteria.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="ej. España, México"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                </div>
                <div className="col-span-1">
                    <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1 block">Edad / Fecha Nac.</label>
                    <input 
                        type="text" 
                        value={criteria.ageOrDob}
                        onChange={(e) => handleInputChange('ageOrDob', e.target.value)}
                        placeholder="ej. 35 años, 12/05/1990"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1 block">Contexto Adicional (Evitar Homónimos)</label>
                    <input 
                        type="text" 
                        value={criteria.additionalInfo}
                        onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                        placeholder="ej. Arquitecto, trabaja en ciberseguridad..."
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                </div>
            </div>
          )}

        </form>
        {isLoading && (
          <p className="text-center text-cyan-400 text-xs mt-2 animate-pulse font-mono bg-slate-900/50 py-1 rounded">
            ESTABLECIENDO CONEXIÓN SEGURA... APLICANDO FILTROS...
          </p>
        )}
      </div>
    </div>
  );
};