import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { SearchInterface } from './components/SearchInterface';
import { NodeGraph } from './components/NodeGraph';
import { InfoPanel } from './components/InfoPanel';
import { FilterPanel } from './components/FilterPanel';
import { LoginPage } from './components/LoginPage';
import { performOsintSearch, performDeepDive, searchSocialMentions, generateAIReportAnalysis, generateAIImage, enrichNodeData } from './services/geminiService';
import { GraphData, OsintNode, NodeType, SearchCriteria } from './types';

// Initial dummy data for visual impact on load
const INITIAL_DATA: GraphData = {
  nodes: [
    { id: '1', label: 'Nexus Core', type: NodeType.ORGANIZATION, description: 'Sistema central de inicialización.', heat: 10, x: 0, y: 0 } as any
  ],
  links: []
};

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // App Logic State
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_DATA);
  const [selectedNode, setSelectedNode] = useState<OsintNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [isSocialSearching, setIsSocialSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Favorites State
  const [favorites, setFavorites] = useState<Record<string, OsintNode>>({});

  // Filter State
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(new Set(Object.values(NodeType)));
  const [minHeat, setMinHeat] = useState<number>(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Check for session persistence (optional)
  useEffect(() => {
    const session = sessionStorage.getItem('nexus_session');
    if (session === 'active') {
        setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
      setIsAuthenticated(true);
      sessionStorage.setItem('nexus_session', 'active');
  };

  // Load favorites on mount
  useEffect(() => {
    const saved = localStorage.getItem('nexus_favorites');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            const favMap: Record<string, OsintNode> = {};
            (parsed as any[]).forEach((n: any) => {
                if (n && typeof n === 'object' && n.id) {
                    favMap[n.id] = n as OsintNode;
                }
            });
            setFavorites(favMap);
        }
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    }
  }, []);

  // Save favorites when updated is handled inside handleToggleFavorite to keep sync
  const handleToggleFavorite = (node: OsintNode) => {
    setFavorites(prev => {
        const next = { ...prev };
        if (next[node.id]) {
            delete next[node.id];
        } else {
            next[node.id] = node;
        }
        localStorage.setItem('nexus_favorites', JSON.stringify(Object.values(next)));
        return next;
    });
  };

  const handleLoadFavorites = () => {
    const favNodes = Object.values(favorites) as OsintNode[];
    if (favNodes.length === 0) return;
    
    // Create a dummy graph with just nodes if links aren't stored, or try to integrate them
    // For simplicity, we just add the nodes. They might be disconnected.
    const newData: GraphData = {
        nodes: favNodes,
        links: []
    };
    setGraphData(prev => mergeData(prev, newData));
  };

  const handleSearch = async (criteria: SearchCriteria) => {
    setIsLoading(true);
    setError(null);
    setSelectedNode(null);

    try {
      const data = await performOsintSearch(criteria);
      setGraphData(data);
      // Reset filters to defaults on new search to show all data
      setMinHeat(0);
      setActiveTypes(new Set(Object.values(NodeType)));
    } catch (err: any) {
      setError(err.message || 'Error desconocido durante el análisis OSINT.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const mergeData = (prev: GraphData, newData: GraphData) => {
      // Create sets of existing IDs for efficient lookup
      const existingNodeIds = new Set(prev.nodes.map(n => n.id));
      const existingLinks = new Set(prev.links.map(l => {
            const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
            return `${s}-${t}`;
      }));

      // Filter out duplicate nodes
      const uniqueNewNodes = newData.nodes.filter(n => !existingNodeIds.has(n.id));
      
      // Filter out duplicate links
      const uniqueNewLinks = newData.links.filter(l => {
          const key = `${l.source}-${l.target}`;
          return !existingLinks.has(key);
      });

      if (uniqueNewNodes.length === 0 && uniqueNewLinks.length === 0) {
          return prev;
      }

      return {
          nodes: [...prev.nodes, ...uniqueNewNodes],
          links: [...prev.links, ...uniqueNewLinks]
      };
  };

  const handleDeepDive = async (node: OsintNode) => {
    setIsDeepDiving(true);
    setError(null);
    try {
        const newData = await performDeepDive(node);
        setGraphData(prev => mergeData(prev, newData));
    } catch (err: any) {
        setError("No se pudo completar la investigación profunda. Intente nuevamente.");
        console.error(err);
    } finally {
        setIsDeepDiving(false);
    }
  };

  const handleSocialSearch = async (node: OsintNode) => {
    setIsSocialSearching(true);
    setError(null);
    try {
        const newData = await searchSocialMentions(node);
        setGraphData(prev => mergeData(prev, newData));
    } catch (err: any) {
        setError("No se pudieron localizar perfiles sociales. Intente nuevamente.");
        console.error(err);
    } finally {
        setIsSocialSearching(false);
    }
  };

  const handleEnrichNode = async (node: OsintNode) => {
      setIsEnriching(true);
      setError(null);
      try {
          const details = await enrichNodeData(node);
          
          // Update the node in the graph data
          setGraphData(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => 
                  n.id === node.id 
                  ? { ...n, extendedDetails: details } 
                  : n
              )
          }));

          // Also update the selected node state to reflect changes immediately
          setSelectedNode(prev => prev && prev.id === node.id ? { ...prev, extendedDetails: details } : prev);

      } catch (err: any) {
          setError("No se pudo enriquecer la información del nodo.");
          console.error(err);
      } finally {
          setIsEnriching(false);
      }
  };

  const handleNodeClick = useCallback((node: OsintNode | null) => {
    setSelectedNode(node);
  }, []);

  const closePanel = () => setSelectedNode(null);

  // Filter Logic
  const handleTypeToggle = (type: NodeType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // PDF Report Generation with AI Analysis
  const downloadReport = async () => {
    if (graphData.nodes.length <= 1) return;
    setIsGeneratingReport(true);

    try {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();

        // --- AI Content Generation Phase ---
        
        // 1. Generate Text Analysis
        const analysisText = await generateAIReportAnalysis(graphData.nodes);
        
        // 2. Generate Cover Image
        const coverPrompt = "A futuristic, cinematic, dark blue and cyan abstract visualization of a digital data network map connecting people and nodes. Cybersecurity and intelligence theme. High contrast.";
        const coverImage = await generateAIImage(coverPrompt);

        // 3. Generate Map Image (if locations exist)
        const locations = graphData.nodes.filter(n => n.type === NodeType.LOCATION);
        let mapImage: string | null = null;
        if (locations.length > 0) {
            const locationNames = locations.map(l => l.label).slice(0, 5).join(", ");
            const mapPrompt = `A stylized, high-tech digital map visualization highlighting the connections between these regions: ${locationNames}. Dark theme, glowing nodes on a world map background.`;
            mapImage = await generateAIImage(mapPrompt);
        }

        // --- PDF Construction Phase ---

        // PAGE 1: COVER & EXECUTIVE SUMMARY
        
        // Title
        doc.setFontSize(24);
        doc.setTextColor(6, 182, 212); // Cyan
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE DE INTELIGENCIA OSINT", 105, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Nexus OSINT Visualizer | Fecha: ${date}`, 105, 28, { align: "center" });

        // Cover Image
        let yPos = 40;
        if (coverImage) {
            try {
                // Determine aspect ratio or fixed size
                doc.addImage(coverImage, 'PNG', 30, yPos, 150, 85); 
                yPos += 95;
            } catch (imgErr) {
                console.error("Failed to add cover image", imgErr);
            }
        } else {
            yPos += 10;
        }

        // AI Analysis Text
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("ANÁLISIS DE INTELIGENCIA ARTIFICIAL", 15, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40);
        
        const splitAnalysis = doc.splitTextToSize(analysisText, 180);
        doc.text(splitAnalysis, 15, yPos);
        
        // --- PAGE 2 (Optional): MAP VISUALIZATION ---
        if (locations.length > 0 && mapImage) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(6, 182, 212);
            doc.setFont("helvetica", "bold");
            doc.text("VISUALIZACIÓN GEOGRÁFICA", 15, 20);
            
            try {
                doc.addImage(mapImage, 'PNG', 15, 30, 180, 100);
                
                // List locations below map
                let mapY = 140;
                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.text("Ubicaciones Detectadas:", 15, mapY);
                mapY += 10;
                doc.setFontSize(10);
                doc.setTextColor(60);
                locations.forEach(loc => {
                    doc.text(`• ${loc.label} (Relevancia: ${loc.heat}%)`, 20, mapY);
                    mapY += 6;
                });

            } catch (mapErr) {
                console.error("Failed to add map image", mapErr);
            }
        }

        // --- PAGE 3+: NODE DETAILS ---
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(6, 182, 212); 
        doc.setFont("helvetica", "bold");
        doc.text("DETALLE DE NODOS Y CONEXIONES", 15, 20);
        
        yPos = 30;

        // Group by Type
        const grouped = graphData.nodes.reduce((acc, node) => {
          if (!acc[node.type]) acc[node.type] = [];
          acc[node.type].push(node);
          return acc;
        }, {} as Record<NodeType, OsintNode[]>);

        (Object.entries(grouped) as [string, OsintNode[]][]).forEach(([type, nodes]) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }

          doc.setFontSize(14);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(`> ${type.toUpperCase()}`, 15, yPos);
          yPos += 8;

          nodes.sort((a, b) => b.heat - a.heat).forEach(node => {
             if (yPos > 260) { doc.addPage(); yPos = 20; }

             doc.setFontSize(11);
             doc.setTextColor(30);
             doc.setFont("helvetica", "bold");
             doc.text(`• ${node.label}`, 20, yPos);
             
             doc.setFontSize(9);
             doc.setFont("helvetica", "normal");
             doc.setTextColor(100);
             doc.text(`ID: ${node.id} | Heat: ${node.heat}%`, 190, yPos, { align: "right" });
             
             yPos += 5;
             
             const descLines = doc.splitTextToSize(node.description, 160);
             doc.setTextColor(60);
             doc.text(descLines, 20, yPos);
             yPos += (descLines.length * 4);

             // Add Extended Details to Report if they exist
             if (node.extendedDetails) {
                 const detailHeader = "Análisis Detallado (AI):";
                 doc.setFont("helvetica", "italic");
                 doc.setTextColor(80);
                 doc.text(detailHeader, 20, yPos);
                 yPos += 5;
                 
                 const detailLines = doc.splitTextToSize(node.extendedDetails, 155);
                 doc.text(detailLines, 25, yPos);
                 yPos += (detailLines.length * 4) + 2;
                 doc.setFont("helvetica", "normal");
             }

             if (node.url) {
                doc.setTextColor(0, 0, 255);
                doc.textWithLink("Fuente Link", 20, yPos, { url: node.url });
                yPos += 6;
             } else {
                yPos += 2;
             }
             
             yPos += 2;
          });
          
          yPos += 5;
        });

        doc.save(`nexus_ai_report_${Date.now()}.pdf`);
    } catch (e) {
        console.error("Error creating PDF", e);
        alert("Error al generar PDF. Verifique la consola.");
    } finally {
        setIsGeneratingReport(false);
    }
  };

  const filteredData = useMemo(() => {
    const validNodeIds = new Set<string>();

    // 1. Filter Nodes
    const nodes = graphData.nodes.filter(n => {
      const isTypeMatch = activeTypes.has(n.type);
      const isHeatMatch = n.heat >= minHeat;
      
      if (isTypeMatch && isHeatMatch) {
        validNodeIds.add(n.id);
        return true;
      }
      return false;
    });

    // 2. Filter Links (only if both source and target exist in filtered nodes)
    const links = graphData.links.filter(l => {
      // Handle both string IDs (raw data) and object references (d3 processed data)
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;

      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });

    return { nodes, links };
  }, [graphData, activeTypes, minHeat]);

  const favoriteIds = useMemo(() => new Set(Object.keys(favorites)), [favorites]);

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden font-sans">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <SearchInterface onSearch={handleSearch} isLoading={isLoading} />
      
      {/* Action Buttons Top Right */}
      <div className="fixed top-24 right-20 z-40 flex flex-col gap-2 pointer-events-none">
        
        {/* Load Favorites Button */}
        {Object.keys(favorites).length > 0 && (
            <button
                onClick={handleLoadFavorites}
                className="pointer-events-auto bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-amber-400 text-amber-400 p-3 rounded-full shadow-lg transition-all transform hover:scale-105 group"
                title="Cargar Nodos Favoritos"
            >
                {/* Star Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black text-amber-400 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    Restaurar Favoritos
                </div>
            </button>
        )}

        {/* Report Button */}
        {graphData.nodes.length > 1 && (
            <button
                onClick={downloadReport}
                disabled={isGeneratingReport}
                className={`pointer-events-auto bg-slate-800 border border-slate-600 p-3 rounded-full shadow-lg transition-all transform hover:scale-105
                    ${isGeneratingReport 
                        ? 'cursor-wait animate-pulse border-cyan-500 text-cyan-500' 
                        : 'hover:bg-slate-700 hover:border-red-500 text-red-400'}`}
                title="Generar Reporte AI Detallado (PDF)"
            >
                {isGeneratingReport ? (
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
                
                {isGeneratingReport && (
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black text-cyan-400 text-xs px-2 py-1 rounded transition whitespace-nowrap">
                        Generando Análisis AI...
                    </div>
                )}
            </button>
        )}
      </div>

      <FilterPanel 
        selectedTypes={activeTypes}
        minHeat={minHeat}
        onTypeToggle={handleTypeToggle}
        onHeatChange={setMinHeat}
        isOpen={isFilterOpen}
        setIsOpen={setIsFilterOpen}
      />

      <main className="w-full h-full">
        {error ? (
          <div className="flex items-center justify-center h-full absolute inset-0 z-30 pointer-events-none">
             <div className="bg-red-900/90 border border-red-500/50 p-6 rounded-lg max-w-md text-center pointer-events-auto shadow-2xl backdrop-blur-sm">
                <h3 className="text-red-400 font-bold mb-2 flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  ERROR DE SISTEMA
                </h3>
                <p className="text-red-200 text-sm mb-4">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wider rounded transition-colors"
                >
                  CERRAR ALERTA
                </button>
             </div>
          </div>
        ) : null}
        
        <NodeGraph 
            data={filteredData} 
            onNodeClick={handleNodeClick} 
            selectedNodeId={selectedNode ? selectedNode.id : null}
            favoriteNodeIds={favoriteIds}
        />
      </main>

      <InfoPanel 
        node={selectedNode} 
        onClose={closePanel} 
        onDeepDive={handleDeepDive}
        onSocialSearch={handleSocialSearch}
        onEnrichNode={handleEnrichNode}
        isDeepDiving={isDeepDiving}
        isSocialSearching={isSocialSearching}
        isEnriching={isEnriching}
        isFavorite={selectedNode ? !!favorites[selectedNode.id] : false}
        onToggleFavorite={handleToggleFavorite}
      />
      
      {/* Branding Overlay */}
      <div className="absolute bottom-4 left-4 pointer-events-none z-10 opacity-50">
        <h1 className="text-2xl font-black text-slate-700 tracking-tighter">
          BUHO <span className="text-cyan-600">OSINT</span>
        </h1>
        <p className="text-[10px] text-slate-600 font-mono">v1.2.0 // ADVANCED TRACING ACTIVE</p>
      </div>
    </div>
  );
};

export default App;