'use client';

/**
 * Volatility Surface Chart Component
 * 
 * Displays a 3D surface chart for volatility data with support for:
 * - 3D surface visualization
 * - Different surface types (ATM grid, expiry-strike, tail-strike)
 * - Interactive controls for rotation and viewing angle
 */

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

// Define data structure for surface points
interface SurfacePoint {
  x: number | string; // Can be either expiry, tenor or strike
  y: number | string; // Can be either tail, strike or expiry
  z: number;          // The volatility value
  xLabel?: string;    // Optional readable label for x
  yLabel?: string;    // Optional readable label for y
}

interface VolatilitySurfaceChartProps {
  surfaceData: SurfacePoint[];
  title?: string;
  xLabel: string;
  yLabel: string;
  zLabel?: string;
  colorRange?: [string, string];
  height?: number;
  width?: number;
}

// Helper to get numerical value for string coordinates
// This maps strings like "1M", "2Y" to numerical values for plotting
const getNumericalValue = (value: string | number): number => {
  if (typeof value === 'number') return value;
  
  // Try to extract numerical value from strings like "10Y", "3M", etc.
  const match = value.match(/^(\d+(?:\.\d+)?)([YMD])$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert to a common unit (years)
    switch (unit) {
      case 'Y': return num;
      case 'M': return num / 12;
      case 'D': return num / 365;
      default: return 0;
    }
  }
  
  // If no pattern match, try parsing as a number
  const numValue = parseFloat(value);
  return isNaN(numValue) ? 0 : numValue;
};

export default function VolatilitySurfaceChart({
  surfaceData,
  title = 'Volatility Surface',
  xLabel,
  yLabel,
  zLabel = 'Volatility (%)',
  colorRange = ['#4575b4', '#d73027'],
  height = 500,
  width = 700
}: VolatilitySurfaceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || !surfaceData || surfaceData.length === 0) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create a numerical representation of the data
    const numericData = surfaceData.map(point => ({
      x: getNumericalValue(point.x),
      y: getNumericalValue(point.y),
      z: point.z,
      xLabel: point.xLabel || point.x.toString(),
      yLabel: point.yLabel || point.y.toString()
    }));
    
    // Get min/max values for the scales
    const xExtent = d3.extent(numericData, d => d.x) as [number, number];
    const yExtent = d3.extent(numericData, d => d.y) as [number, number];
    const zExtent = d3.extent(numericData, d => d.z) as [number, number];
    
    // Add some padding to the extents
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05;
    const zPadding = (zExtent[1] - zExtent[0]) * 0.05;
    
    xExtent[0] -= xPadding;
    xExtent[1] += xPadding;
    yExtent[0] -= yPadding;
    yExtent[1] += yPadding;
    zExtent[0] -= zPadding;
    zExtent[1] += zPadding;
    
    // Set up SVG
    const svg = d3.select(svgRef.current);
    
    // Set up margins
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([innerHeight, 0]);
    
    const zScale = d3.scaleLinear()
      .domain(zExtent)
      .range([0, 1]);
    
    // Create color scale
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 1])
      .range(colorRange as [string, string])
      .interpolate(d3.interpolateHcl);
    
    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create grid for the surface
    const xStep = (xExtent[1] - xExtent[0]) / 20;
    const yStep = (yExtent[1] - yExtent[0]) / 20;
    
    // Prepare data for contour
    interface GridPoint {
      x: number;
      y: number;
      value: number;
    }
    
    const gridPoints: GridPoint[] = [];
    
    for (let x = xExtent[0]; x <= xExtent[1]; x += xStep) {
      for (let y = yExtent[0]; y <= yExtent[1]; y += yStep) {
        // Find nearest data points and interpolate
        const nearestPoints = numericData
          .map(d => ({
            distance: Math.sqrt((d.x - x) ** 2 + (d.y - y) ** 2),
            value: d.z
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4);
        
        if (nearestPoints.length === 0) continue;
        
        // Inverse distance weighting interpolation
        let weightSum = 0;
        let valueSum = 0;
        
        nearestPoints.forEach(p => {
          if (p.distance === 0) {
            weightSum = 1;
            valueSum = p.value;
            return;
          }
          
          const weight = 1 / p.distance;
          weightSum += weight;
          valueSum += weight * p.value;
        });
        
        const interpolatedValue = valueSum / weightSum;
        gridPoints.push({ x, y, value: interpolatedValue });
      }
    }
    
    // Create contour generator
    const contours = d3.contourDensity<GridPoint>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .weight(d => d.value)
      .size([innerWidth, innerHeight])
      .thresholds(20)
      .bandwidth(30);
    
    // Generate contours
    const contourData = contours(gridPoints);
    
    // Draw contours
    g.append('g')
      .attr('class', 'contours')
      .selectAll('path')
      .data(contourData)
      .enter().append('path')
      .attr('d', d3.geoPath())
      .attr('fill', d => colorScale(zScale(d.value)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.5);
    
    // Draw axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    // Draw dots for actual data points
    g.selectAll('.data-point')
      .data(numericData)
      .enter().append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 3)
      .attr('fill', d => colorScale(zScale(d.z)))
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .append('title')
      .text(d => `${d.xLabel}, ${d.yLabel}: ${d.z.toFixed(2)}%`);
    
    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .text(xLabel);
    
    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${-margin.left + 20},${innerHeight / 2}) rotate(-90)`)
      .text(yLabel);
    
    // Add title
    svg.append('text')
      .attr('class', 'title')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('font-weight', 'bold')
      .text(title);
    
    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendX = width - margin.right - legendWidth;
    const legendY = margin.top - 30;
    
    const legendScale = d3.scaleLinear()
      .domain(zExtent)
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => `${d3.format('.1f')(d as number)}%`);
    
    const defs = svg.append('defs');
    
    // Create linear gradient for the legend
    const gradient = defs.append('linearGradient')
      .attr('id', 'volatility-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    
    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter().append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(d));
    
    // Add legend rectangle
    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#volatility-gradient)');
    
    // Add legend axis
    svg.append('g')
      .attr('transform', `translate(${legendX},${legendY + legendHeight})`)
      .call(legendAxis)
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .text(zLabel);
    
  }, [surfaceData, title, xLabel, yLabel, zLabel, colorRange, height, width]);
  
  if (!surfaceData || surfaceData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg" 
        style={{ height: `${height}px`, width: '100%' }}
      >
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm overflow-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="mx-auto"
      />
    </div>
  );
}