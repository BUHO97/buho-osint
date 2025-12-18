import React from 'react';
import { OsintNode, NodeType } from '../types';

interface InfoPanelProps {
  node: OsintNode | null;
  onClose: () => void;
  onDeepDive: (node: OsintNode) => void;
  onSocialSearch: (node: OsintNode) => void;
  onEnrichNode: (node: OsintNode) => void;
  isDeepDiving: boolean;
  isSocialSearching: boolean;
  isEnriching: boolean;
  isFavorite: boolean;
  onToggleFavorite: (node: OsintNode) => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ 
  node, 
  onClose, 
  onDeepDive, 
  onSocialSearch, 
  onEnrichNode,
  isDeepDiving, 
  isSocialSearching,
  isEnriching,
  isFavorite,
  onToggleFavorite
}) => {
  if (!node) return null;

  const getHeatColor = (heat: number) => {
    if (heat > 80) return "text-red-500";
    if (heat > 50) return "text-yellow-400";
    return "text-blue-400";
  };

  const isBusy = isDeepDiving || isSocialSearching || isEnriching;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-slate-800 border-t md:border border-slate-700 md:rounded-lg shadow-2xl z-50 transform transition-transform duration-300 max-h-[75vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center gap-3 overflow-hidden">
            <button 
                onClick={() => onToggleFavorite(node)}
                className={`shrink-0 focus:outline-none transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                title={isFavorite ? "Quitar de favoritos" : "Marcar como importante"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 truncate">
            <span className="truncate">{node.label}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-600 ${getHeatColor(node.heat)} bg-slate-900 shrink-0`}>
                {node.heat}%
            </span>
            </h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 shrink-0">
          ✕
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Categoría</span>
          <p className="text-slate-200 capitalize bg-slate-700/50 inline-block px-2 py-1 rounded mt-1 text-sm border border-slate-600">
            {node.type}
          </p>
        </div>

        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Inteligencia Básica</span>
          <p className="text-slate-300 mt-1 leading-relaxed text-sm bg-slate-900/30 p-3 rounded border border-slate-700/50">
            {node.description}
          </p>
        </div>

        {/* Extended Details Section */}
        {node.extendedDetails && (
            <div className="mb-4 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs uppercase tracking-wider text-cyan-500 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                    Análisis Detallado
                </span>
                <div className="text-slate-300 mt-1 leading-relaxed text-sm bg-slate-900/50 p-3 rounded border border-cyan-900/50 whitespace-pre-wrap font-sans">
                    {node.extendedDetails}
                </div>
            </div>
        )}

        {node.url && (
          <div className="mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Fuente / Link</span>
            <a 
              href={node.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-1 text-cyan-400 hover:text-cyan-300 text-sm p-2 bg-slate-900/50 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="truncate">{node.url}</span>
            </a>
          </div>
        )}
      </div>
        
      <div className="p-4 border-t border-slate-700 bg-slate-800 space-y-2">
        
        {/* Enrich Data Button (Only show if not already enriched) */}
        {!node.extendedDetails && (
            <button 
            onClick={() => onEnrichNode(node)}
            disabled={isBusy}
            className={`w-full py-2.5 rounded text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 border
                ${isEnriching 
                ? 'bg-purple-900/50 border-purple-800 text-purple-200 cursor-not-allowed' 
                : 'bg-purple-700 border-purple-600 hover:bg-purple-600 text-white shadow-lg'
                } ${isDeepDiving || isSocialSearching ? 'opacity-50 pointer-events-none' : ''}`}
            >
            {isEnriching ? <Spinner /> : <IconEnrich />}
            {isEnriching ? 'ANALIZANDO DATOS...' : 'ENRIQUECER INFORMACIÓN'}
            </button>
        )}

        <div className="grid grid-cols-2 gap-2">
            {/* Deep Dive Button */}
            <button 
            onClick={() => onDeepDive(node)}
            disabled={isBusy}
            className={`w-full py-2.5 rounded text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 border
                ${isDeepDiving 
                ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-white hover:border-slate-500'
                } ${isSocialSearching || isEnriching ? 'opacity-50 pointer-events-none' : ''}`}
            >
            {isDeepDiving ? <Spinner /> : <IconSearch />}
            {isDeepDiving ? 'EXPANDIENDO...' : 'EXPANDIR RED'}
            </button>

            {/* Social Search Button */}
            <button 
            onClick={() => onSocialSearch(node)}
            disabled={isBusy}
            className={`w-full py-2.5 rounded text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 border
                ${isSocialSearching 
                ? 'bg-cyan-900/50 border-cyan-800 text-cyan-200 cursor-not-allowed' 
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 border-transparent hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                } ${isDeepDiving || isEnriching ? 'opacity-50 pointer-events-none' : ''}`}
            >
            {isSocialSearching ? <Spinner /> : <IconSocial />}
            {isSocialSearching ? 'BUSCANDO...' : 'BUSCAR SOCIAL'}
            </button>
        </div>
      </div>
    </div>
  );
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconSocial = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconEnrich = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);