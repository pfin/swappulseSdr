"use client";

/**
 * Correlation Heatmap Chart Component
 *
 * Displays a heatmap of correlations between different assets, metrics, or time periods.
 * Uses dynamic scaling to show the strength of relationships.
 * Optimized for performance with useMemo and responsive canvas sizing.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Parse RGB color string into components
const parseRgbColor = (rgbStr: string): RGBColor => {
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10)
    };
  }
  // Fallback
  return { r: 0, g: 0, b: 0 };
};

export default function CorrelationHeatmapChart({
  data,
  title = 'Correlation Analysis',
  height = 400,
  colorScheme = 'blue-red',
  showValues = true
}: CorrelationHeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
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

  // Memoized color schemes to prevent recreation on each render
  const colorSchemes = useMemo(() => ({
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
  }), []);

  // Memoized color calculation functions
  const getColor = useCallback((value: number) => {
    // Get selected color scheme
    const scheme = colorSchemes[colorScheme];

    if (value > 0) {
      // Positive correlation (0 to 1)
      const intensity = Math.min(1, Math.abs(value));
      const positiveRgb = parseRgbColor(scheme.positiveColor);
      const r = Math.round(255 - (255 - positiveRgb.r) * intensity);
      const g = Math.round(255 - (255 - positiveRgb.g) * intensity);
      const b = Math.round(255 - (255 - positiveRgb.b) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (value < 0) {
      // Negative correlation (0 to -1)
      const intensity = Math.min(1, Math.abs(value));
      const negativeRgb = parseRgbColor(scheme.negativeColor);
      const r = Math.round(255 - (255 - negativeRgb.r) * intensity);
      const g = Math.round(255 - (255 - negativeRgb.g) * intensity);
      const b = Math.round(255 - (255 - negativeRgb.b) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // No correlation (exactly 0)
      return scheme.neutralColor;
    }
  }, [colorSchemes, colorScheme]);

  // Memoized text color function
  const getTextColor = useCallback((value: number) => {
    // Get selected color scheme
    const scheme = colorSchemes[colorScheme];

    if (value > 0.3) {
      return scheme.textPositiveColor;
    } else if (value < -0.3) {
      return scheme.textNegativeColor;
    } else {
      return scheme.textNeutralColor;
    }
  }, [colorSchemes, colorScheme]);

  // Make canvas responsive to container width
  useEffect(() => {
    const updateCanvasWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Set canvas width to container width, minus some padding
        setCanvasWidth(Math.max(300, containerWidth - 40));
      }
    };

    // Initial update
    updateCanvasWidth();

    // Add resize listener
    window.addEventListener('resize', updateCanvasWidth);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateCanvasWidth);
    };
  }, []);

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
    const padding = Math.min(80, Math.floor(canvas.width * 0.15)); // Responsive padding
    const cellSize = Math.min(
      (canvas.width - padding * 2) / n,
      (canvas.height - padding * 2) / n
    );
    const offsetX = padding;
    const offsetY = padding;

    // Adjust font size based on canvas size
    const fontSizeLabels = Math.max(8, Math.min(10, Math.floor(canvas.width / 80)));
    const fontSizeValues = Math.max(7, Math.min(10, Math.floor(cellSize / 3)));

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = `${fontSizeLabels}px Arial`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Draw row labels (y-axis)
    data.labels.forEach((label, i) => {
      // Truncate long labels
      const displayLabel = label.length > 15 ? label.substring(0, 12) + '...' : label;
      ctx.fillText(
        displayLabel,
        offsetX - 10,
        offsetY + i * cellSize + cellSize / 2
      );
    });

    // Draw column labels (x-axis)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.labels.forEach((label, i) => {
      // Truncate long labels
      const displayLabel = label.length > 15 ? label.substring(0, 12) + '...' : label;
      ctx.save();
      ctx.translate(
        offsetX + i * cellSize + cellSize / 2,
        offsetY - 10
      );
      ctx.rotate(-Math.PI / 4); // Rotate labels for better readability
      ctx.fillText(displayLabel, 0, 0);
      ctx.restore();
    });

    // Draw heatmap cells
    data.correlationMatrix.forEach((row, i) => {
      row.forEach((value, j) => {
        // Handle NaN values safely
        const safeValue = isNaN(value) ? 0 : value;

        // Fill cell with color based on correlation value
        ctx.fillStyle = getColor(safeValue);
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
        if (showValues && cellSize > 15) {
          ctx.fillStyle = getTextColor(safeValue);
          ctx.font = `${fontSizeValues}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            isNaN(value) ? 'N/A' : value.toFixed(2),
            offsetX + j * cellSize + cellSize / 2,
            offsetY + i * cellSize + cellSize / 2
          );
        }
      });
    });

    // Draw color legend
    const legendWidth = Math.min(200, canvas.width * 0.3);
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
    ctx.font = `${fontSizeLabels}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('-1', legendX, legendY + legendHeight + 5);
    ctx.fillText('0', legendX + legendWidth / 2, legendY + legendHeight + 5);
    ctx.fillText('+1', legendX + legendWidth, legendY + legendHeight + 5);
    ctx.fillText('Correlation', legendX + legendWidth / 2, legendY + legendHeight + 20);

  }, [data, colorScheme, showValues, canvasWidth, getColor, getTextColor]);

  // Setup event listeners for tooltips
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!data.labels.length || !data.correlationMatrix.length) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate dimensions (must match drawing code)
      const n = data.labels.length;
      const padding = Math.min(80, Math.floor(canvas.width * 0.15));
      const cellSize = Math.min(
        (canvas.width - padding * 2) / n,
        (canvas.height - padding * 2) / n
      );
      const offsetX = padding;
      const offsetY = padding;

      // Check if mouse is over a cell
      if (x > offsetX && x < offsetX + n * cellSize &&
          y > offsetY && y < offsetY + n * cellSize) {

        const cellX = Math.floor((x - offsetX) / cellSize);
        const cellY = Math.floor((y - offsetY) / cellSize);

        if (cellX >= 0 && cellX < n && cellY >= 0 && cellY < n) {
          // Calculate tooltip position to keep it on screen
          const value = data.correlationMatrix[cellY][cellX];

          // Ensure tooltip doesn't go off screen
          const tooltipX = Math.min(e.clientX + 10, window.innerWidth - 200);
          const tooltipY = Math.min(Math.max(e.clientY - 70, 10), window.innerHeight - 100);

          setTooltipData({
            visible: true,
            x: tooltipX,
            y: tooltipY,
            value: value,
            label1: data.labels[cellY],
            label2: data.labels[cellX]
          });
          return;
        }
      }

      setTooltipData(prev => ({ ...prev, visible: false }));
    };

    // Add keyboard navigation for accessibility
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're focused and we have a visible tooltip
      if (!tooltipData.visible) return;

      const n = data.labels.length;
      let cellX = data.labels.indexOf(tooltipData.label2);
      let cellY = data.labels.indexOf(tooltipData.label1);

      switch (e.key) {
        case 'ArrowUp':
          cellY = Math.max(0, cellY - 1);
          e.preventDefault();
          break;
        case 'ArrowDown':
          cellY = Math.min(n - 1, cellY + 1);
          e.preventDefault();
          break;
        case 'ArrowLeft':
          cellX = Math.max(0, cellX - 1);
          e.preventDefault();
          break;
        case 'ArrowRight':
          cellX = Math.min(n - 1, cellX + 1);
          e.preventDefault();
          break;
      }

      if (cellX >= 0 && cellY >= 0) {
        setTooltipData({
          visible: true,
          x: tooltipData.x,
          y: tooltipData.y,
          value: data.correlationMatrix[cellY][cellX],
          label1: data.labels[cellY],
          label2: data.labels[cellX]
        });
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.tabIndex = 0; // Make canvas focusable
    canvas.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [data, tooltipData]);

  return (
    <div
      ref={containerRef}
      className="bg-white p-4 rounded-lg shadow-sm relative"
      style={{ height: `${height}px` }}
      aria-label="Correlation heatmap visualization"
    >
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height - 40}
        className="w-full h-full"
        aria-label="Correlation matrix heatmap"
        role="img"
        tabIndex={0}
      />

      {tooltipData.visible && (
        <div
          className="absolute bg-gray-800 text-white py-2 px-4 rounded shadow-lg z-10"
          style={{
            top: tooltipData.y,
            left: tooltipData.x,
          }}
          role="tooltip"
          aria-live="polite"
        >
          <div className="font-medium">{tooltipData.label1} ↔ {tooltipData.label2}</div>
          <div className="text-sm">
            Correlation: {isNaN(tooltipData.value) ? 'N/A' : tooltipData.value.toFixed(3)}
          </div>
        </div>
      )}
    </div>
  );
}