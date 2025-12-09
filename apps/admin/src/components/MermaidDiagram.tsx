import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#e2e8f0',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#94a3b8',
        lineColor: '#64748b',
        secondaryColor: '#f8fafc',
        tertiaryColor: '#ffffff',
      },
      securityLevel: 'loose',
    });

    const renderChart = async () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const { svg } = await mermaid.render(id, chart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = '<div class="text-destructive">Failed to render diagram</div>';
          }
        }
      }
    };

    renderChart();
  }, [chart]);

  return <div ref={containerRef} className="w-full overflow-x-auto flex justify-center p-4" />;
};

export default MermaidDiagram;
