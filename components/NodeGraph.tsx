import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphData, OsintNode, OsintLink, NodeType } from '../types';

interface NodeGraphProps {
  data: GraphData;
  onNodeClick: (node: OsintNode) => void;
  selectedNodeId: string | null;
  favoriteNodeIds?: Set<string>;
}

export const NodeGraph: React.FC<NodeGraphProps> = ({ data, onNodeClick, selectedNodeId, favoriteNodeIds = new Set() }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const simulationRef = useRef<d3.Simulation<OsintNode, OsintLink> | null>(null);

  // Store references to D3 selections to update them without re-rendering everything
  const linkRef = useRef<d3.Selection<SVGLineElement, OsintLink, SVGGElement, unknown> | null>(null);
  const nodeRef = useRef<d3.Selection<SVGGElement, OsintNode, SVGGElement, unknown> | null>(null);

  // Tooltip State
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; node: OsintNode | null }>({
    visible: false,
    x: 0,
    y: 0,
    node: null
  });

  // Helper to calculate node radius consistently
  const getNodeRadius = useCallback((node: OsintNode) => {
    return 12 + (node.heat / 6); 
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Visuals based on Selection (Highlighting & Tracing) AND Favorites
  useEffect(() => {
    if (!linkRef.current || !nodeRef.current) return;

    const linkedNodeIds = new Set<string>();
    if (selectedNodeId) linkedNodeIds.add(selectedNodeId);

    // Identify connected links and nodes for selection highlighting
    if (selectedNodeId) {
        const queue = [selectedNodeId];
        const visited = new Set<string>([selectedNodeId]);
        
        const traverse = (currentId: string) => {
            data.links.forEach(l => {
                const sId = typeof l.source === 'object' ? (l.source as OsintNode).id : l.source as string;
                const tId = typeof l.target === 'object' ? (l.target as OsintNode).id : l.target as string;
                
                if (sId === currentId || tId === currentId) {
                    const otherId = sId === currentId ? tId : sId;
                    
                    if (!visited.has(otherId)) {
                        visited.add(otherId);
                        linkedNodeIds.add(otherId);
                        traverse(otherId); 
                    }
                }
            });
        };
        traverse(selectedNodeId);
    }

    // --- NODE STYLING UPDATE ---
    nodeRef.current.each(function(d) {
        const el = d3.select(this);
        const circle = el.select('circle');
        
        const isSel = d.id === selectedNodeId;
        const isFav = favoriteNodeIds.has(d.id);
        const isDimmed = selectedNodeId && !linkedNodeIds.has(d.id);

        // Store selected state in DOM for hover handlers
        el.attr("data-selected", isSel ? "true" : null);

        // Radius Logic: Selected nodes are larger
        const baseRadius = getNodeRadius(d);
        const targetRadius = isSel ? baseRadius * 1.3 : baseRadius;

        // Stroke & Visuals Logic
        let stroke = "#fff";
        let strokeWidth = 1.5;
        let filter = null;

        if (isFav) {
            stroke = "#f59e0b"; // Gold for favorites takes precedence for color
            strokeWidth = 3;
        } else if (isSel) {
            stroke = "#06b6d4"; // Cyan for selected
            strokeWidth = 3;
        } else if (d.heat > 80) {
            stroke = "#ef4444"; // Red for high heat
        }

        // Apply Glow to Selected Node
        if (isSel) {
            filter = "url(#glow-selected)";
            // Even if favorite, maybe bump stroke width more if selected
            strokeWidth = 4;
        }

        // Transition visuals
        circle.transition().duration(300)
            .attr("r", targetRadius)
            .attr("stroke", stroke)
            .attr("stroke-width", strokeWidth)
            .attr("opacity", isDimmed ? 0.3 : 1) // Only dim circles, not the whole group if we want text visible? No, usually whole group.
            .style("filter", filter);
            
        // Dim the whole group (text included)
        el.transition().duration(300).attr("opacity", isDimmed ? 0.2 : 1);
    });

    // --- LINK STYLING UPDATE ---
    linkRef.current.each(function(d) {
        const sId = typeof d.source === 'object' ? (d.source as OsintNode).id : d.source as string;
        const tId = typeof d.target === 'object' ? (d.target as OsintNode).id : d.target as string;
        
        const isConnected = (linkedNodeIds.has(sId) && linkedNodeIds.has(tId));
        
        const el = d3.select(this);
        if (!selectedNodeId) {
             // Reset to default if no selection
            el.transition().duration(300)
              .attr("opacity", 0.6)
              .attr("stroke", "#475569")
              .attr("stroke-width", 1.5);
            el.attr("marker-end", "url(#arrow-default)")
              .classed("link-flow", false);
        } else if (isConnected) {
            // Highlight path
            el.transition().duration(300)
              .attr("opacity", 1)
              .attr("stroke", "#06b6d4") // Cyan
              .attr("stroke-width", 2.5);
            el.attr("marker-end", "url(#arrow-highlight)")
              .classed("link-flow", true); 
        } else {
            // Dim others
            el.transition().duration(300)
              .attr("opacity", 0.1)
              .attr("stroke", "#475569");
            el.attr("marker-end", "url(#arrow-default)")
              .classed("link-flow", false);
        }
    });

  }, [selectedNodeId, data, favoriteNodeIds, getNodeRadius]);

  // D3 Logic - Initialization & Simulation
  useEffect(() => {
    if (!data || !svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;

    // --- DEFS for Markers and Filters ---
    const defs = svg.append("defs");

    // Glow Filter for Selected Nodes
    const filter = defs.append("filter")
        .attr("id", "glow-selected")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

    filter.append("feGaussianBlur")
        .attr("stdDeviation", "4")
        .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Default Arrow
    defs.append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20) 
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569")
      .attr("opacity", 0.6);

    // Highlight Arrow
    defs.append("marker")
      .attr("id", "arrow-highlight")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#06b6d4");

    // Zoom behavior
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Deep copy data
    const nodes: OsintNode[] = data.nodes.map(d => ({ ...d }));
    const links: OsintLink[] = data.links.map(d => ({ ...d }));

    // Simulation Setup
    const simulation = d3.forceSimulation<OsintNode>(nodes)
      .force("link", d3.forceLink<OsintNode, OsintLink>(links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => getNodeRadius(d) + 15)); 
    
    simulationRef.current = simulation;

    // Color Scale for Heatmap
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateTurbo);

    // Render Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow-default)") as d3.Selection<SVGLineElement, OsintLink, SVGGElement, unknown>;
    
    linkRef.current = link; 

    // Node Group
    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      // HOVER EFFECTS & TOOLTIP
      .on("mouseover", function(event, d) {
          const el = d3.select(this);
          const isSel = el.attr("data-selected") === "true";
          const baseR = getNodeRadius(d);
          const currentR = isSel ? baseR * 1.3 : baseR;
          
          // Scale up slightly for tactile feedback
          el.select("circle")
            .transition().duration(200)
            .attr("r", currentR * 1.15);
            
          el.raise(); 

          // Show Tooltip
          setTooltip({ visible: true, x: event.clientX, y: event.clientY, node: d });
      })
      .on("mousemove", function(event) {
          // Update Tooltip Position
          setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
      })
      .on("mouseout", function(event, d) {
          const el = d3.select(this);
          const isSel = el.attr("data-selected") === "true";
          const baseR = getNodeRadius(d);
          // Return to target size (1.3x if selected, 1x if not)
          const targetR = isSel ? baseR * 1.3 : baseR;
          
          el.select("circle")
            .transition().duration(200)
            .attr("r", targetR);

          // Hide Tooltip
          setTooltip(prev => ({ ...prev, visible: false }));
      }) as d3.Selection<SVGGElement, OsintNode, SVGGElement, unknown>;
    
    nodeRef.current = node;

    // Node Shapes/Circles
    node.append("circle")
      .attr("r", d => getNodeRadius(d)) 
      .attr("fill", d => colorScale(d.heat))
      .attr("stroke", "#fff") 
      .attr("stroke-opacity", 0.9)
      .attr("class", "shadow-lg"); 

    // Icons/Text inside nodes
    node.append("text")
      .text(d => getNodeIcon(d.type))
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "white")
      .attr("stroke", "none")
      .attr("font-size", d => Math.max(10, getNodeRadius(d) * 0.8) + "px")
      .attr("font-family", "Arial, sans-serif")
      .style("pointer-events", "none"); 

    // Labels below nodes
    node.append("text")
      .text(d => d.label)
      .attr("x", 0)
      .attr("y", d => getNodeRadius(d) + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("stroke", "none")
      .attr("font-size", "10px")
      .attr("class", "pointer-events-none select-none bg-black/50 px-1 rounded");

    // Drag Logic
    node.call(d3.drag<SVGGElement, OsintNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

    // Ticker
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as OsintNode).x!)
        .attr("y1", d => (d.source as OsintNode).y!)
        .attr("x2", d => {
            const source = d.source as OsintNode;
            const target = d.target as OsintNode;
            
            const dx = target.x! - source.x!;
            const dy = target.y! - source.y!;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist === 0) return target.x!;

            const targetRadius = getNodeRadius(target);
            const shortenBy = targetRadius + 5; 

            return target.x! - (dx * shortenBy / dist);
        })
        .attr("y2", d => {
            const source = d.source as OsintNode;
            const target = d.target as OsintNode;
            const dx = target.x! - source.x!;
            const dy = target.y! - source.y!;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return target.y!;
            
            const targetRadius = getNodeRadius(target);
            const shortenBy = targetRadius + 5; 

            return target.y! - (dy * shortenBy / dist);
        });

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, onNodeClick, getNodeRadius]); 

  const handleBgClick = () => {
    onNodeClick(null as any); 
  };

  const getHeatColor = (heat: number) => {
    if (heat > 80) return "text-red-500";
    if (heat > 50) return "text-yellow-400";
    return "text-blue-400";
  };

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-slate-900" onClick={handleBgClick}>
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="flex flex-col space-y-1 bg-slate-900/50 p-2 rounded backdrop-blur-sm border border-slate-700/50">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div> <span>Info</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full bg-green-500"></div> <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div> <span>Relevante</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full bg-red-600"></div> <span>Crítico</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-amber-400 pt-1 border-t border-slate-700">
                <div className="w-3 h-3 rounded-full border-2 border-amber-500"></div> <span>Favorito</span>
            </div>
        </div>
      </div>
      
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip.visible && tooltip.node && (
          <div 
            className="fixed z-50 pointer-events-none bg-slate-900/90 border border-slate-600 p-3 rounded shadow-xl backdrop-blur-md"
            style={{ 
                left: tooltip.x + 15, 
                top: tooltip.y + 15,
                transform: 'translate(0, 0)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getNodeIcon(tooltip.node.type)}</span>
                <span className="font-bold text-white text-sm whitespace-nowrap">{tooltip.node.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs border-t border-slate-700 pt-1 mt-1">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">{tooltip.node.type}</span>
                <span className={`font-mono font-bold ${getHeatColor(tooltip.node.heat)}`}>
                    HEAT: {tooltip.node.heat}%
                </span>
            </div>
          </div>
      )}
    </div>
  );
};

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