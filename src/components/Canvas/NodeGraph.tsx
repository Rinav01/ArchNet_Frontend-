'use client';

import React, { useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Path } from 'react-konva';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasNode, CanvasEdge, NodeType } from '@/types/canvas';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

export default function NodeGraph() {
  const {
    nodes,
    edges,
    selectedNodeId,
    zoom,
    pan,
    isConnecting,
    connectingSourceId,
    activeAnimationNodeId,
    activeAnimationEdgeId,
    setSelectedNodeId,
    setPan,
    updateNodeConfig,
    addEdge,
    removeEdge,
  } = useCanvasStore();

  const stageRef = useRef<any>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Handle stage pan dragging
  const handleStageDrag = (e: any) => {
    if (e.target === stageRef.current) {
      setPan({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Handle node drag update
  const handleNodeDragEnd = (nodeId: string, e: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Update node coordinate
    useCanvasStore.setState((state) => ({
      nodes: state.nodes.map((n) => 
        n.id === nodeId ? { ...n, x: e.target.x(), y: e.target.y() } : n
      )
    }));

    setDraggedNodeId(null);
  };

  const handleNodeDragStart = (nodeId: string) => {
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
  };

  // Connection handling
  const handlePortClick = (e: any, nodeId: string, isInput: boolean) => {
    e.cancelBubble = true; // prevent selecting the node

    if (!isInput) {
      // Start connecting from output socket
      useCanvasStore.setState({
        isConnecting: true,
        connectingSourceId: nodeId,
      });
      // Log notification
      useCanvasStore.getState().addLog('info', `Selecting output port from node. Click input socket to connect.`);
    } else {
      // Connecting to input socket
      if (isConnecting && connectingSourceId) {
        if (connectingSourceId !== nodeId) {
          addEdge(connectingSourceId, nodeId);
        }
        // Reset state
        useCanvasStore.setState({
          isConnecting: false,
          connectingSourceId: null,
        });
      }
    }
  };

  // Color mappings for node dots matching Image 2
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'Input': return '#10b981'; // Green emerald
      case 'Conv2D': return '#8b5cf6'; // Violet
      case 'MaxPool2D': return '#3b82f6'; // Blue
      case 'Flatten': return '#ec4899'; // Pink
      case 'Dense': return '#f59e0b'; // Amber yellow
      default: return '#9ca3af';
    }
  };

  return (
    <div className="w-full h-full relative bg-[#090a0f] overflow-hidden">
      {/* Background visual grid matching editor view */}
      <div className="absolute inset-0 dot-grid opacity-30 z-0"></div>

      <Stage
        ref={stageRef}
        width={window.innerWidth - 640} // adjusting space for left & right panels
        height={window.innerHeight - 180}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={!isConnecting}
        onDragEnd={handleStageDrag}
        className="cursor-grab active:cursor-grabbing z-10 relative"
      >
        <Layer>
          {/* 1. RENDER EDGES/CONNECTIONS FIRST SO THEY GO BEHIND NODES */}
          {edges.map((edge) => {
            const srcNode = nodes.find(n => n.id === edge.source);
            const trgNode = nodes.find(n => n.id === edge.target);

            if (!srcNode || !trgNode) return null;

            // Output port position of source node
            const x0 = srcNode.x + NODE_WIDTH;
            const y0 = srcNode.y + NODE_HEIGHT / 2;

            // Input port position of target node
            const x1 = trgNode.x;
            const y1 = trgNode.y + NODE_HEIGHT / 2;

            // Cubic Bezier curve control points
            const cp1x = x0 + 80;
            const cp1y = y0;
            const cp2x = x1 - 80;
            const cp2y = y1;

            const pathData = `M ${x0} ${y0} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`;
            
            const isAnimated = activeAnimationEdgeId === edge.id;
            
            return (
              <Group key={edge.id} onClick={() => {
                if (window.confirm('Delete connection?')) {
                  removeEdge(edge.id);
                }
              }}>
                {/* Visual glow backdrop for connection line */}
                <Path
                  data={pathData}
                  stroke={isAnimated ? '#a855f7' : '#14b8a6'}
                  strokeWidth={isAnimated ? 5 : 2}
                  opacity={isAnimated ? 0.9 : 0.4}
                  shadowColor={isAnimated ? '#a855f7' : '#14b8a6'}
                  shadowBlur={isAnimated ? 12 : 0}
                  className={isAnimated ? 'animated-edge' : ''}
                />
                
                {/* Thick hover zone for easy selection */}
                <Path
                  data={pathData}
                  stroke="transparent"
                  strokeWidth={15}
                  className="cursor-pointer"
                />
              </Group>
            );
          })}

          {/* 2. RENDER DRAG CONNECTION PREVIEW LINE */}
          {isConnecting && connectingSourceId && (() => {
            const srcNode = nodes.find(n => n.id === connectingSourceId);
            if (!srcNode) return null;

            const x0 = srcNode.x + NODE_WIDTH;
            const y0 = srcNode.y + NODE_HEIGHT / 2;

            // Simple line to center or near right side
            const pathData = `M ${x0} ${y0} L ${x0 + 60} ${y0}`;
            
            return (
              <Path
                data={pathData}
                stroke="#a855f7"
                strokeWidth={2}
                dash={[6, 4]}
                opacity={0.8}
              />
            );
          })()}

          {/* 3. RENDER ALL ACTIVE GRAPH NODES */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isAnimating = activeAnimationNodeId === node.id;
            const dotColor = getNodeColor(node.type);

            return (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable={true}
                onDragStart={() => handleNodeDragStart(node.id)}
                onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedNodeId(node.id);
                }}
              >
                {/* Node Box Rectangle */}
                <Rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  fill="#11121d"
                  cornerRadius={12}
                  stroke={isAnimating ? '#a855f7' : isSelected ? '#a855f7' : 'rgba(255, 255, 255, 0.08)'}
                  strokeWidth={isAnimating ? 3 : isSelected ? 2 : 1}
                  shadowColor={isAnimating ? '#a855f7' : isSelected ? '#a855f7' : '#000'}
                  shadowBlur={isAnimating ? 15 : isSelected ? 8 : 4}
                  shadowOpacity={isAnimating ? 0.45 : isSelected ? 0.3 : 0.15}
                  shadowOffset={{ x: 0, y: 4 }}
                />

                {/* Left side input connection port (skip for Input type) */}
                {node.type !== 'Input' && (
                  <Group
                    x={0}
                    y={NODE_HEIGHT / 2}
                    onClick={(e) => handlePortClick(e, node.id, true)}
                    className="cursor-pointer"
                  >
                    <Circle
                      radius={7}
                      fill="#090a0f"
                      stroke={isConnecting && connectingSourceId !== node.id ? '#a855f7' : 'rgba(255,255,255,0.4)'}
                      strokeWidth={2}
                    />
                    <Circle
                      radius={3}
                      fill={isConnecting && connectingSourceId !== node.id ? '#a855f7' : 'rgba(255,255,255,0.8)'}
                    />
                  </Group>
                )}

                {/* Right side output connection port */}
                <Group
                  x={NODE_WIDTH}
                  y={NODE_HEIGHT / 2}
                  onClick={(e) => handlePortClick(e, node.id, false)}
                  className="cursor-pointer"
                >
                  <Circle
                    radius={7}
                    fill="#090a0f"
                    stroke={isConnecting && connectingSourceId === node.id ? '#a855f7' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={2}
                  />
                  <Circle
                    radius={3}
                    fill={isConnecting && connectingSourceId === node.id ? '#a855f7' : 'rgba(255,255,255,0.8)'}
                  />
                </Group>

                {/* Color Dot indicator */}
                <Circle
                  x={18}
                  y={22}
                  radius={5}
                  fill={dotColor}
                  shadowColor={dotColor}
                  shadowBlur={isSelected ? 6 : 0}
                />

                {/* Node Label/Name */}
                <Text
                  x={32}
                  y={16}
                  text={node.name}
                  fill="#f3f4f6"
                  fontSize={12}
                  fontStyle="bold"
                  fontFamily="'Outfit', sans-serif"
                />

                {/* Node Subtitle/Details */}
                {node.type === 'Input' && (
                  <Text
                    x={18}
                    y={48}
                    text={`DIM:   ${node.outputShape.join(', ')}`}
                    fill="#9ca3af"
                    fontSize={10}
                    fontFamily="monospace"
                  />
                )}

                {node.type === 'Conv2D' && (
                  <Group x={18} y={44}>
                    <Text
                      text={`FILTERS`}
                      fill="#6b7280"
                      fontSize={9}
                      fontFamily="'Outfit', sans-serif"
                      fontStyle="bold"
                    />
                    <Text
                      x={65}
                      text={`${node.config.filters || 64}`}
                      fill="#d1d5db"
                      fontSize={9}
                      fontFamily="monospace"
                    />
                    <Text
                      y={14}
                      text={`KERNEL`}
                      fill="#6b7280"
                      fontSize={9}
                      fontFamily="'Outfit', sans-serif"
                      fontStyle="bold"
                    />
                    <Text
                      x={65}
                      y={14}
                      text={`${node.config.kernelSize || 3}x${node.config.kernelSize || 3}`}
                      fill="#d1d5db"
                      fontSize={9}
                      fontFamily="monospace"
                    />
                  </Group>
                )}

                {node.type === 'MaxPool2D' && (
                  <Group x={18} y={48}>
                    <Text
                      text={`STRIDE:   ${node.config.stride || 2}`}
                      fill="#9ca3af"
                      fontSize={10}
                      fontFamily="monospace"
                    />
                  </Group>
                )}

                {node.type === 'Flatten' && (
                  <Group x={18} y={48}>
                    <Text
                      text={`FLATTEN`}
                      fill="#e879f9"
                      fontSize={9}
                      fontStyle="bold"
                      fontFamily="'Outfit', sans-serif"
                    />
                  </Group>
                )}

                {node.type === 'Dense' && (
                  <Group x={18} y={48}>
                    <Text
                      text={`UNITS:   ${node.config.units || 10}`}
                      fill="#9ca3af"
                      fontSize={10}
                      fontFamily="monospace"
                    />
                  </Group>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
