import React from 'react';
import { NodeType } from '../types';

interface FilterPanelProps {
  selectedTypes: Set<NodeType>;
  minHeat: number;
  onTypeToggle: (type: NodeType) => void;
  onHeatChange: (heat: number) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  selectedTypes,
  minHeat,
  onTypeToggle,
  onHeatChange,
  isOpen,
  setIsOpen
}) => {
  const types = Object.values(NodeType);

  const getNodeIcon = (type: NodeType): string => {
    switch (type) {
      case NodeType.PERSON: return "👤";
      case NodeType.SOCIAL: return "🌐";
      case NodeType.LOCATION: return "📍";
      case NodeType.ORGANIZATION: return "🏢";
      case NodeType.EVENT: return "📅";
      default: return "❓";
    }
  };

  const getLabel = (type: NodeType): string => {
      switch (type) {
          case NodeType.PERSON: return "Personas";
          case NodeType.SOCIAL: return "Social / Web";
          case NodeType.LOCATION: return "Ubicaciones";
          case NodeType.ORGANIZATION: return "Organizaciones";
          case NodeType.EVENT: return "Eventos";
          case NodeType.UNKNOWN: return "Desconocido";
          default: return type;
      }
  };

  return (
    <div className={`fixed top-24 right-4 z-40 transition-all duration-300 ${isOpen ? 'w-64' : 'w-12 h-12 rounded-full overflow-hidden'}`}>
        {/* Toggle Button (Visible when closed) */}
        {!isOpen && (
             <button 
                onClick={() => setIsOpen(true)}
                className="w-full h-full bg-slate-800 border border-slate-600 hover:bg-slate-700 text-cyan-400 flex items-center justify-center shadow-lg rounded-full"
                title="Abrir Filtros"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
             </button>
        )}

        {/* Panel Content */}
        {isOpen && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Filtros de Red</h3>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Heat Filter */}
                    <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                            <span>RELEVANCIA MÍNIMA (HEAT)</span>
                            <span className="text-cyan-400">{minHeat}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="90"
                            step="10"
                            value={minHeat}
                            onChange={(e) => onHeatChange(Number(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>0%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Node Types */}
                    <div>
                        <div className="text-xs text-slate-400 mb-2 font-mono uppercase">Categorías</div>
                        <div className="space-y-1">
                            {types.map(type => (
                                <button
                                    key={type}
                                    onClick={() => onTypeToggle(type)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all ${
                                        selectedTypes.has(type) 
                                            ? 'bg-slate-700/50 text-slate-200 border border-slate-600' 
                                            : 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{getNodeIcon(type)}</span>
                                        <span>{getLabel(type)}</span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${selectedTypes.has(type) ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-slate-700'}`}></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};