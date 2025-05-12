"use client";

/**
 * Correlation Heatmap Chart Component
 * 
 * Displays a heatmap of correlations between different assets, metrics, or time periods.
 * Uses dynamic scaling to show the strength of relationships.
 */

import { useEffect, useRef, useState } from 'react';
import { DTCCTrade } from '@/types/dtcc';

interface CorrelationData {
  labels: string[];
  correlationMatrix: number[][];
}

interface CorrelationHeatmapChartProps {
  data: CorrelationData;
  title?: string;
  height?: number;
  colorScheme?: 'blue-red' | 'purple-green' | 'red-green';
  showValues?: boolean;
}

export default function CorrelationHeatmapChart({
  data,
  title = 'Correlation Analysis',
  height = 400,
  colorScheme = 'blue-red',
  showValues = true
}: CorrelationHeatmapChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: number;
    label1: string;
    label2: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    label1: '',
    label2: ''
  });

  // Color schemes for different correlation visualizations
  const colorSchemes = {
    'blue-red': {
      positiveColor: 'rgb(0, 123, 255)',
      negativeColor: 'rgb(220, 53, 69)',
      neutralColor: 'rgb(248, 249, 250)',
      textPositiveColor: 'white',
      textNegativeColor: 'white',
      textNeutralColor: 'black',
    },
    'purple-green': {
      positiveColor: 'rgb(111, 66, 193)',
      negativeColor: 'rgb(40, 167, 69)',
      neutralColor: 'rgb(248, 249, 250)',
      textPositiveColor: 'white',
      textNegativeColor: 'white',
      textNeutralColor: 'black',
    },
    'red-green': {
      positiveColor: 'rgb(40, 167, 69)',
      negativeColor: 'rgb(220, 53, 69)',
      neutralColor: 'rgb(248, 249, 250)',
      textPositiveColor: 'white',
      textNegativeColor: 'white',
      textNeutralColor: 'black',
    }
  };

  // Get color based on correlation value
  const getColor = (value: number) => {
    // Get selected color scheme
    const scheme = colorSchemes[colorScheme];
    
    if (value > 0) {
      // Positive correlation (0 to 1)
      const intensity = Math.min(1, Math.abs(value));
      const r = Math.round(255 - (255 - parseInt(scheme.positiveColor.slice(4, 7))) * intensity);
      const g = Math.round(255 - (255 - parseInt(scheme.positiveColor.slice(9, 12))) * intensity);
      const b = Math.round(255 - (255 - parseInt(scheme.positiveColor.slice(14, 17))) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (value < 0) {
      // Negative correlation (0 to -1)
      const intensity = Math.min(1, Math.abs(value));
      const r = Math.round(255 - (255 - parseInt(scheme.negativeColor.slice(4, 7))) * intensity);
      const g = Math.round(255 - (255 - parseInt(scheme.negativeColor.slice(9, 12))) * intensity);
      const b = Math.round(255 - (255 - parseInt(scheme.negativeColor.slice(14, 17))) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // No correlation (exactly 0)
      return scheme.neutralColor;
    }
  };

  // Get text color based on background color for readability
  const getTextColor = (value: number) => {
    // Get selected color scheme
    const scheme = colorSchemes[colorScheme];
    
    if (value > 0.3) {
      return scheme.textPositiveColor;
    } else if (value < -0.3) {
      return scheme.textNegativeColor;
    } else {
      return scheme.textNeutralColor;
    }
  };

  // Draw the heatmap when data changes
  useEffect(() => {
    if (!canvasRef.current || !data.labels.length || !data.correlationMatrix.length) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const n = data.labels.length;
    const padding = 80; // Padding for labels
    const cellSize = Math.min(
      (canvas.width - padding * 2) / n,
      (canvas.height - padding * 2) / n
    );
    const offsetX = padding;
    const offsetY = padding;

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Draw row labels (y-axis)
    data.labels.forEach((label, i) => {
      ctx.fillText(
        label,
        offsetX - 10,
        offsetY + i * cellSize + cellSize / 2
      );
    });

    // Draw column labels (x-axis)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.labels.forEach((label, i) => {
      ctx.save();
      ctx.translate(
        offsetX + i * cellSize + cellSize / 2,
        offsetY - 10
      );
      ctx.rotate(-Math.PI / 4); // Rotate labels for better readability
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    // Draw heatmap cells
    data.correlationMatrix.forEach((row, i) => {
      row.forEach((value, j) => {
        // Fill cell with color based on correlation value
        ctx.fillStyle = getColor(value);
        ctx.fillRect(
          offsetX + j * cellSize,
          offsetY + i * cellSize,
          cellSize,
          cellSize
        );

        // Draw cell borders
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          offsetX + j * cellSize,
          offsetY + i * cellSize,
          cellSize,
          cellSize
        );

        // Draw correlation values
        if (showValues) {
          ctx.fillStyle = getTextColor(value);
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            value.toFixed(2),
            offsetX + j * cellSize + cellSize / 2,
            offsetY + i * cellSize + cellSize / 2
          );
        }
      });
    });

    // Draw color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = canvas.width - legendWidth - 20;
    const legendY = canvas.height - legendHeight - 20;

    // Create gradient for legend
    const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
    gradient.addColorStop(0, colorSchemes[colorScheme].negativeColor);
    gradient.addColorStop(0.5, colorSchemes[colorScheme].neutralColor);
    gradient.addColorStop(1, colorSchemes[colorScheme].positiveColor);

    // Draw gradient bar
    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend border
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('-1', legendX, legendY + legendHeight + 5);
    ctx.fillText('0', legendX + legendWidth / 2, legendY + legendHeight + 5);
    ctx.fillText('+1', legendX + legendWidth, legendY + legendHeight + 5);
    ctx.fillText('Correlation', legendX + legendWidth / 2, legendY + legendHeight + 20);

    // Setup event listeners for tooltips
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if mouse is over a cell
      if (x > offsetX && x < offsetX + n * cellSize && 
          y > offsetY && y < offsetY + n * cellSize) {
        
        const cellX = Math.floor((x - offsetX) / cellSize);
        const cellY = Math.floor((y - offsetY) / cellSize);
        
        if (cellX >= 0 && cellX < n && cellY >= 0 && cellY < n) {
          setTooltipData({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            value: data.correlationMatrix[cellY][cellX],
            label1: data.labels[cellY],
            label2: data.labels[cellX]
          });
          return;
        }
      }
      
      setTooltipData(prev => ({ ...prev, visible: false }));
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [data, colorScheme, showValues]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm relative" style={{ height: `${height}px` }}>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      
      <canvas 
        ref={canvasRef}
        width={800}
        height={height - 40}
        className="w-full h-full"
      />
      
      {tooltipData.visible && (
        <div
          className="absolute bg-gray-800 text-white py-2 px-4 rounded shadow-lg z-10"
          style={{
            top: tooltipData.y - 70,
            left: tooltipData.x + 10,
          }}
        >
          <div className="font-medium">{tooltipData.label1} ↔ {tooltipData.label2}</div>
          <div className="text-sm">Correlation: {tooltipData.value.toFixed(3)}</div>
        </div>
      )}
    </div>
  );
}