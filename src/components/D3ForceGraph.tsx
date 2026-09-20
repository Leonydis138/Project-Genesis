import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraph } from '../types';

interface D3ForceGraphProps {
  graph: KnowledgeGraph;
  selectedConcept: string;
  onSelectNode: (nodeId: string) => void;
}

interface ForceNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: string;
}

interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  id?: string;
  relation: string;
}

export const D3ForceGraph: React.FC<D3ForceGraphProps> = ({
  graph,
  selectedConcept,
  onSelectNode,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return;

    const width = svgRef.current.clientWidth || 700;
    const height = 360;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', height);

    // Prepare deep clones of nodes and links for simulation
    const nodes: ForceNode[] = graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      category: n.category,
    }));

    const nodeMap = new Map(nodes.map(n => [n.id.toLowerCase(), n]));

    const links: ForceLink[] = [];
    graph.edges.forEach(e => {
      const sourceNode = nodeMap.get(e.source.toLowerCase());
      const targetNode = nodeMap.get(e.target.toLowerCase());
      if (sourceNode && targetNode) {
        links.push({
          source: sourceNode.id,
          target: targetNode.id,
          relation: e.relation,
        });
      }
    });

    // Create container group for zoom/pan
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Defs for arrow markers and glow filters
    const defs = svg.append('defs');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#06b6d4');

    // Force Simulation setup
    const simulation = d3.forceSimulation<ForceNode>(nodes)
      .force('link', d3.forceLink<ForceNode, ForceLink>(links).id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(35));

    // Render Links (Edges)
    const link = g.append('g')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    // Render Link Labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', '#06b6d4')
      .attr('text-anchor', 'middle')
      .text(d => d.relation);

    // Drag behaviour
    const drag = (simulation: d3.Simulation<ForceNode, undefined>) => {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, ForceNode, ForceNode>) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, ForceNode, ForceNode>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, ForceNode, ForceNode>) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag<SVGGElement, ForceNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    };

    // Render Nodes (Group containing Circle & Text)
    const targetNorm = selectedConcept.toLowerCase().trim().replace(/\s+/g, '_');

    const node = g.append('g')
      .selectAll<SVGGElement, ForceNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .call(drag(simulation) as any)
      .on('click', (_event, d) => {
        onSelectNode(d.id);
      });

    node.append('circle')
      .attr('r', d => (d.id.toLowerCase() === targetNorm ? 16 : 12))
      .attr('fill', d => (d.id.toLowerCase() === targetNorm ? '#06b6d4' : '#1e293b'))
      .attr('stroke', d => (d.id.toLowerCase() === targetNorm ? '#67e8f9' : '#0ea5e9'))
      .attr('stroke-width', d => (d.id.toLowerCase() === targetNorm ? 3 : 2));

    node.append('text')
      .attr('dy', 24)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', d => (d.id.toLowerCase() === targetNorm ? 'bold' : 'normal'))
      .attr('fill', d => (d.id.toLowerCase() === targetNorm ? '#67e8f9' : '#e2e8f0'))
      .text(d => d.label);

    // Simulation Ticks
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as ForceNode).x || 0)
        .attr('y1', d => (d.source as ForceNode).y || 0)
        .attr('x2', d => (d.target as ForceNode).x || 0)
        .attr('y2', d => (d.target as ForceNode).y || 0);

      linkLabel
        .attr('x', d => (((d.source as ForceNode).x || 0) + ((d.target as ForceNode).x || 0)) / 2)
        .attr('y', d => (((d.source as ForceNode).y || 0) + ((d.target as ForceNode).y || 0)) / 2 - 4);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, selectedConcept, onSelectNode]);

  return (
    <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 relative overflow-hidden p-2">
      <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800 pointer-events-none z-10">
        D3.js Force Simulation • Drag nodes • Scroll to zoom
      </div>
      <svg ref={svgRef} className="w-full h-[360px] block" />
    </div>
  );
};
