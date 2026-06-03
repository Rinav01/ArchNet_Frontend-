'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Path } from 'react-konva';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { CanvasNode, CanvasEdge, NodeType } from '@/types/canvas';
import { 
  AlignLeft, 
  AlignVerticalJustifyStart, 
  Columns, 
  Rows, 
  FolderPlus, 
  Folder,
  FolderOpen,
  X,
  Sparkles,
  BarChart2
} from 'lucide-react';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

const getBezierPoint = (
  t: number,
  x0: number, y0: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x1: number, y1: number
) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x = mt3 * x0 + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * x1;
  const y = mt3 * y0 + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * y1;
  
  return { x, y };
};

const getNodeStats = (node: CanvasNode) => {
  let flops = 0;
  let params = 0;
  let memory = 0; // weights in bytes
  let actSize = node.outputShape && node.outputShape.length > 0 ? `[${node.outputShape.join(', ')}]` : 'N/A';

  if (node.type === 'Conv2D') {
    const inputChannels = node.inputShape.length >= 3 ? node.inputShape[2] : 3;
    const outputFilters = node.config.filters || 64;
    const kernel = node.config.kernelSize || 3;
    const outH = node.outputShape.length >= 2 ? node.outputShape[0] : 224;
    const outW = node.outputShape.length >= 2 ? node.outputShape[1] : 224;

    flops = 2 * kernel * kernel * inputChannels * outputFilters * outH * outW;
    params = (inputChannels * kernel * kernel + 1) * outputFilters;
  } else if (node.type === 'Dense') {
    const inputFeatures = node.inputShape.length > 0 ? node.inputShape[0] : 0;
    const outputUnits = node.config.units || 10;

    if (inputFeatures > 0) {
      flops = 2 * inputFeatures * outputUnits;
      params = (inputFeatures + 1) * outputUnits;
    }
  }

  memory = params * 4; // float32 memory weight size
  
  const formatNumber = (num: number, label: string) => {
    if (num === 0) return `0 ${label}`;
    if (num < 1000) return `${num} ${label}`;
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K ${label}`;
    return `${(num / 1000000).toFixed(1)}M ${label}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    flops: formatNumber(flops, 'FLOPs'),
    params: formatNumber(params, 'Params'),
    memory: formatBytes(memory),
    actSize
  };
};

export default function NodeGraph() {
  const userRole = useProjectStore((state) => state.userRole);
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
    activeAnimationEdgeIds,
    showStatsOverlay,
    toggleStatsOverlay,
    validationErrors,
    highlightedNodeId,
    setSelectedNodeId,
    setPan,
    addEdge,
    removeEdge,
    collaborators,
    sendCursorPosition,
    sendSelection,

    // Advanced Graph Editing UX State & Actions
    selectedNodeIds,
    setSelectedNodeIds,
    nodeGroups,
    addNodeGroup,
    removeNodeGroup,
    toggleGroupCollapse,
    alignSelectedNodes,
    batchMoveNodes,
    triggerAutoLayout
  } = useCanvasStore();

  const stageRef = useRef<any>(null);
  const minimapSvgRef = useRef<SVGSVGElement | null>(null);
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  
  // Dynamic Bezier packet animation time loop
  const [animTime, setAnimTime] = useState(0);
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setAnimTime((prev) => (prev + 0.012) % 1);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Local interaction states
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  
  // Drag Selection Marquee states
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMarqueeDragging, setIsMarqueeDragging] = useState(false);

  const dragStartPosRef = useRef<{ [nodeId: string]: { x: number; y: number } }>({});
  const lastCursorSendRef = useRef<number>(0);

  // Interactive Minimap coordinate mapping calculations
  const padX = 200;
  const padY = 200;
  const nodeXCoords = nodes.map(n => n.x);
  const nodeYCoords = nodes.map(n => n.y);
  
  const minX = nodes.length > 0 ? Math.min(...nodeXCoords) - padX : -200;
  const maxX = nodes.length > 0 ? Math.max(...nodeXCoords) + padX + NODE_WIDTH : 1400;
  const minY = nodes.length > 0 ? Math.min(...nodeYCoords) - padY : -200;
  const maxY = nodes.length > 0 ? Math.max(...nodeYCoords) + padY + NODE_HEIGHT : 1000;
  
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);

  // SVG viewport dimension limits
  const svgWidth = 156;
  const svgHeight = 84;

  const handleMinimapPointer = (clientX: number, clientY: number) => {
    const svg = minimapSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    
    // Convert to relative coordinates inside the SVG viewport
    const mx = Math.max(0, Math.min(svgWidth, ((clientX - rect.left) / rect.width) * svgWidth));
    const my = Math.max(0, Math.min(svgHeight, ((clientY - rect.top) / rect.height) * svgHeight));
    
    // Map to actual canvas stage dimensions
    const cx = minX + (mx / svgWidth) * rangeX;
    const cy = minY + (my / svgHeight) * rangeY;
    
    const stageWidth = stageRef.current?.width() || window.innerWidth;
    const stageHeight = stageRef.current?.height() || window.innerHeight;
    
    const targetX = stageWidth / 2 - cx * zoom;
    const targetY = stageHeight / 2 - cy * zoom;
    
    setPan({ x: targetX, y: targetY });
  };

  const handleMinimapMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsMinimapDragging(true);
    handleMinimapPointer(e.clientX, e.clientY);
  };

  // Capture global window pointer movements during active minimap drag
  useEffect(() => {
    if (!isMinimapDragging) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMinimapPointer(e.clientX, e.clientY);
    };
    
    const handleGlobalMouseUp = () => {
      setIsMinimapDragging(false);
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isMinimapDragging, minX, minY, rangeX, rangeY, zoom]);


  // Sync back to single selectedNodeId when selectedNodeIds array changes
  useEffect(() => {
    if (selectedNodeIds.length > 0 && selectedNodeId !== selectedNodeIds[0]) {
      setSelectedNodeId(selectedNodeIds[0]);
    }
  }, [selectedNodeIds, selectedNodeId, setSelectedNodeId]);

  // Track global stage cursor movement and broadcast cursor presences
  const handleStageMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Translate to visual canvas coordinates relative to current stage zoom & pan
    const canvasX = parseFloat(((pointer.x - stage.x()) / stage.scaleX()).toFixed(1));
    const canvasY = parseFloat(((pointer.y - stage.y()) / stage.scaleY()).toFixed(1));

    // Update marquee coordinates during marquee drag-select
    if (isMarqueeDragging && marqueeStart) {
      setMarqueeEnd({ x: canvasX, y: canvasY });
    }

    const now = Date.now();
    const throttleInterval = 80; // 80ms socket / CPU overhead throttle savings
    if (now - lastCursorSendRef.current >= throttleInterval) {
      lastCursorSendRef.current = now;
      sendCursorPosition(canvasX, canvasY);
    }
  };

  // Handle stage pan dragging
  const handleStageDrag = (e: any) => {
    if (e.target === stageRef.current) {
      setPan({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Handle advanced Stage Zoom Centered on Mouse Pointer (zoom polish)
  const handleStageWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate original coordinates pointing to mouse location
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.15;
    let newScale = e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;
    
    // Zoom range boundaries: 0.25x to 2.0x
    newScale = Math.max(0.25, Math.min(2.0, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    useCanvasStore.setState({
      zoom: newScale,
      pan: newPos
    });
  };

  // Drag Start for Multi-Selection Snapping nodes
  const handleNodeDragStart = (nodeId: string) => {
    if (userRole === 'Viewer') return;
    let targets = [...selectedNodeIds];
    
    // If clicking a non-selected node, select only that node (clearing others)
    if (!targets.includes(nodeId)) {
      targets = [nodeId];
      setSelectedNodeIds([nodeId]);
    }
    
    const positions: { [id: string]: { x: number; y: number } } = {};
    nodes.forEach(n => {
      if (targets.includes(n.id)) {
        positions[n.id] = { x: n.x, y: n.y };
      }
    });

    dragStartPosRef.current = positions;
    setDraggedNodeId(nodeId);
  };

  // Multi-Selection dragging Offset & 20px Grid Snapping
  const handleNodeDragMove = (nodeId: string, e: any) => {
    if (userRole === 'Viewer') return;
    const startPositions = dragStartPosRef.current;
    const triggerStart = startPositions[nodeId];
    if (!triggerStart) return;

    // Calculate relative offsets of the node being dragged
    let dx = e.target.x() - triggerStart.x;
    let dy = e.target.y() - triggerStart.y;

    // Apply snapping to 20px layout grid unless Alt key is active (agreement: yes)
    const isAltBypassed = e.evt && e.evt.altKey;
    if (!isAltBypassed) {
      dx = Math.round(dx / 20) * 20;
      dy = Math.round(dy / 20) * 20;
    }

    // Translate coordinates of all other selected layers concurrently
    const targetNodePositions = Object.keys(startPositions).map(id => {
      let targetX = startPositions[id].x + dx;
      let targetY = startPositions[id].y + dy;
      
      if (!isAltBypassed) {
        targetX = Math.round(targetX / 20) * 20;
        targetY = Math.round(targetY / 20) * 20;
      }
      return { id, x: targetX, y: targetY };
    });

    batchMoveNodes(targetNodePositions);
  };

  const handleNodeDragEnd = (nodeId: string, e: any) => {
    if (userRole === 'Viewer') return;
    // Commit batch positions to undo stack
    const startPositions = dragStartPosRef.current;
    const targets = Object.keys(startPositions);
    
    targets.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (node) {
        useCanvasStore.getState().moveNode(id, node.x, node.y);
      }
    });

    setDraggedNodeId(null);
  };

  // Handle stage marquee selection start
  const handleStageMouseDown = (e: any) => {
    if (e.target === stageRef.current) {
      // Only initiate marquee selection drag if Shift key is pressed
      if (e.evt && e.evt.shiftKey) {
        const stage = stageRef.current;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        
        const canvasX = (pointer.x - stage.x()) / stage.scaleX();
        const canvasY = (pointer.y - stage.y()) / stage.scaleY();
        
        setMarqueeStart({ x: canvasX, y: canvasY });
        setMarqueeEnd({ x: canvasX, y: canvasY });
        setIsMarqueeDragging(true);
      } else {
        // Clear selection array when clicking empty stage without Shift
        setSelectedNodeIds([]);
        sendSelection(null);
      }
    }
  };

  // Handle stage marquee selection end
  const handleStageMouseUp = () => {
    if (isMarqueeDragging && marqueeStart && marqueeEnd) {
      setIsMarqueeDragging(false);
      
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y);
      
      const width = x2 - x1;
      const height = y2 - y1;
      
      // Check node intersection if marquee drag bounds are meaningful (>10px)
      if (width > 10 && height > 10) {
        const boundedNodeIds: string[] = [];
        nodes.forEach(node => {
          const centerX = node.x + NODE_WIDTH / 2;
          const centerY = node.y + NODE_HEIGHT / 2;
          if (
            centerX >= x1 && 
            centerX <= x2 && 
            centerY >= y1 && 
            centerY <= y2
          ) {
            boundedNodeIds.push(node.id);
          }
        });
        
        // Concat to existing selected array if shift key is active
        setSelectedNodeIds(boundedNodeIds);
      }
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
  };

  // Connection handling
  const handlePortClick = (e: any, nodeId: string, isInput: boolean) => {
    e.cancelBubble = true; // prevent selecting the node

    if (userRole === 'Viewer') return;

    if (!isInput) {
      useCanvasStore.setState({
        isConnecting: true,
        connectingSourceId: nodeId,
      });
      useCanvasStore.getState().addLog('info', `Selecting output port from node. Click input socket to connect.`);
    } else {
      if (isConnecting && connectingSourceId) {
        if (connectingSourceId !== nodeId) {
          addEdge(connectingSourceId, nodeId);
        }
        useCanvasStore.setState({
          isConnecting: false,
          connectingSourceId: null,
        });
      }
    }
  };

  // Color mappings for Google Material Dark indicators
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'Input': return '#81c784';     /* Emerald Green */
      case 'Conv2D': return '#8ab4f8';    /* Material Blue */
      case 'BatchNorm2D': return '#f48fb1'; /* Rose Pink */
      case 'MaxPool2D': return '#80cbc4'; /* Dark Cyan Teal */
      case 'Dropout': return '#ffab91';   /* Soft Orange */
      case 'Flatten': return '#c5a3ff';   /* Soft Purple */
      case 'Dense': return '#ffe082';     /* Amber Yellow */
      default: return '#9aa0a6';
    }
  };

  // Helper checking if a node is visually collapsed inside a group container
  const isNodeCollapsed = (nodeId: string) => {
    return nodeGroups.some(g => g.isCollapsed && g.nodeIds.includes(nodeId));
  };

  // Render edge logic
  const renderConnectionCurve = (edge: CanvasEdge) => {
    const srcNode = nodes.find(n => n.id === edge.source);
    const trgNode = nodes.find(n => n.id === edge.target);

    if (!srcNode || !trgNode) return null;
    
    // Reroute edges if nodes are collapsed
    const sourceGroup = nodeGroups.find(g => g.isCollapsed && g.nodeIds.includes(edge.source));
    const targetGroup = nodeGroups.find(g => g.isCollapsed && g.nodeIds.includes(edge.target));

    if (sourceGroup && targetGroup && sourceGroup.id === targetGroup.id) {
      return null;
    }

    let x0 = 0, y0 = 0;
    if (sourceGroup) {
      const srcGroupNodes = nodes.filter(n => sourceGroup.nodeIds.includes(n.id));
      const posX = srcGroupNodes.length > 0 ? srcGroupNodes[0].x : 0;
      const posY = srcGroupNodes.length > 0 ? srcGroupNodes[0].y : 0;
      x0 = posX + NODE_WIDTH;
      y0 = posY + NODE_HEIGHT / 2;
    } else {
      x0 = srcNode.x + NODE_WIDTH;
      y0 = srcNode.y + NODE_HEIGHT / 2;
    }

    let x1 = 0, y1 = 0;
    if (targetGroup) {
      const trgGroupNodes = nodes.filter(n => targetGroup.nodeIds.includes(n.id));
      const posX = trgGroupNodes.length > 0 ? trgGroupNodes[0].x : 0;
      const posY = trgGroupNodes.length > 0 ? trgGroupNodes[0].y : 0;
      x1 = posX;
      y1 = posY + NODE_HEIGHT / 2;
    } else {
      x1 = trgNode.x;
      y1 = trgNode.y + NODE_HEIGHT / 2;
    }

    const cp1x = x0 + 80;
    const cp1y = y0;
    const cp2x = x1 - 80;
    const cp2y = y1;

    const pathData = `M ${x0} ${y0} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`;
    
    // Check if animated (supporting branching activeAnimationEdgeIds array)
    const isAnimated = (activeAnimationEdgeIds || []).includes(edge.id) || activeAnimationEdgeId === edge.id;
    
    const hasBroadcastError = validationErrors.some(err => 
      err.nodeId === edge.target && 
      err.category === 'broadcast' && 
      err.message.includes(`'${srcNode.name}'`)
    );
    
    // Dynamic throughput indicators
    const shape = srcNode.outputShape || [];
    const numElements = shape.reduce((a, b) => a * b, 1);
    const formatBytes = (elements: number) => {
      const bytes = elements * 4; // float32 size
      if (bytes === 0) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const sizeText = shape.length > 0 ? `${shape.join('x')} (${formatBytes(numElements)})` : '';
    
    // Modulate execution intensity (packet size & speed scale with tensor dimensions)
    const packetRadius = Math.max(3, Math.min(6.5, Math.log10(Math.max(1, numElements)) - 1));
    const speedFactor = Math.max(0.6, Math.min(1.8, Math.log10(Math.max(1, numElements)) / 3));
    
    // Animate multiple moving packets along active edges
    const t1 = (animTime * speedFactor) % 1;
    const t2 = ((animTime * speedFactor) + 0.5) % 1;
    
    const p1 = getBezierPoint(t1, x0, y0, cp1x, cp1y, cp2x, cp2y, x1, y1);
    const p2 = getBezierPoint(t2, x0, y0, cp1x, cp1y, cp2x, cp2y, x1, y1);
    const centerPoint = getBezierPoint(0.5, x0, y0, cp1x, cp1y, cp2x, cp2y, x1, y1);
    
    return (
      <Group key={edge.id}>
        {/* Interaction Group */}
        <Group onClick={() => {
          if (window.confirm('Delete connection?')) {
            removeEdge(edge.id);
          }
        }}>
          {/* Edge Bezier Line */}
          <Path
            data={pathData}
            stroke={hasBroadcastError ? '#f28b82' : isAnimated ? '#c5a3ff' : '#8ab4f8'}
            strokeWidth={hasBroadcastError ? 3 : isAnimated ? 4 : 2}
            opacity={hasBroadcastError ? 0.95 : isAnimated ? 0.95 : 0.6}
            dash={hasBroadcastError ? [6, 4] : undefined}
          />
          <Path
            data={pathData}
            stroke="transparent"
            strokeWidth={15}
            className="cursor-pointer"
          />
        </Group>

        {/* Dynamic Throughput Indicator label above center */}
        {sizeText && (
          <Group x={centerPoint.x - 50} y={centerPoint.y - 6}>
            <Rect
              width={100}
              height={12}
              fill="#1e1f22"
              opacity={0.85}
              cornerRadius={3}
              stroke="#3f4046"
              strokeWidth={0.5}
            />
            <Text
              text={sizeText}
              fill="#9aa0a6"
              fontSize={7}
              fontFamily="monospace"
              align="center"
              width={100}
              y={2}
            />
          </Group>
        )}

        {/* Animated Tensor Packets */}
        {isAnimated && (
          <Group>
            <Circle
              x={p1.x}
              y={p1.y}
              radius={packetRadius}
              fill="#c5a3ff"
              shadowColor="#c5a3ff"
              shadowBlur={6}
              opacity={0.9}
            />
            <Circle
              x={p2.x}
              y={p2.y}
              radius={packetRadius}
              fill="#c5a3ff"
              shadowColor="#c5a3ff"
              shadowBlur={6}
              opacity={0.9}
            />
          </Group>
        )}
      </Group>
    );
  };

  return (
    <div className="w-full h-full relative bg-[#1e1f22] overflow-hidden select-none">
      {/* Background dot grid */}
      <div className="absolute inset-0 dot-grid opacity-50 z-0"></div>

      <Stage
        ref={stageRef}
        width={window.innerWidth - 640}
        height={window.innerHeight - 180}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={!isConnecting && !isMarqueeDragging}
        onDragMove={handleStageDrag}
        onDragEnd={handleStageDrag}
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onWheel={handleStageWheel}
        onClick={(e) => {
          if (e.target === stageRef.current) {
            setSelectedNodeIds([]);
            sendSelection(null);
          }
        }}
        className="cursor-grab active:cursor-grabbing z-10 relative"
      >
        <Layer>
          {/* 1. RENDER EXPANDED NODE GROUPS BOUNDARY CONTAINERS */}
          {nodeGroups.map((group) => {
            const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
            if (groupNodes.length === 0 || group.isCollapsed) return null;

            // Calculate bounding box enclosing all nodes in the group
            const minX = Math.min(...groupNodes.map(n => n.x)) - 25;
            const minY = Math.min(...groupNodes.map(n => n.y)) - 35;
            const maxX = Math.max(...groupNodes.map(n => n.x + NODE_WIDTH)) + 25;
            const maxY = Math.max(...groupNodes.map(n => n.y + NODE_HEIGHT)) + 25;
            const width = maxX - minX;
            const height = maxY - minY;

            const isHovered = hoveredGroupId === group.id;

            return (
              <Group 
                key={group.id}
                onMouseEnter={() => setHoveredGroupId(group.id)}
                onMouseLeave={() => setHoveredGroupId(null)}
              >
                {/* Bounding box Rect */}
                <Rect
                  x={minX}
                  y={minY}
                  width={width}
                  height={height}
                  fill={group.color}
                  opacity={isHovered ? 0.08 : 0.04}
                  stroke={group.color}
                  strokeWidth={1.5}
                  dash={[6, 4]}
                  cornerRadius={12}
                />
                
                {/* Group label name */}
                <Text
                  x={minX + 12}
                  y={minY + 12}
                  text={group.name.toUpperCase()}
                  fill={group.color}
                  fontSize={9.5}
                  fontStyle="bold"
                  fontFamily="'Outfit', sans-serif"
                />

                {/* Collapse visual trigger */}
                <Group 
                  x={maxX - 62} 
                  y={minY + 10}
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="cursor-pointer"
                >
                  <Rect
                    width={50}
                    height={16}
                    fill="#1e1f22"
                    stroke={group.color}
                    strokeWidth={0.5}
                    cornerRadius={4}
                  />
                  <Text
                    text="COLLAPSE"
                    fill={group.color}
                    fontSize={7.5}
                    fontStyle="bold"
                    align="center"
                    width={50}
                    y={4.5}
                  />
                </Group>

                {/* Ungroup visual trigger */}
                <Group 
                  x={maxX - 110} 
                  y={minY + 10}
                  onClick={() => removeNodeGroup(group.id)}
                  className="cursor-pointer"
                >
                  <Rect
                    width={42}
                    height={16}
                    fill="#1e1f22"
                    stroke="#ffe082"
                    strokeWidth={0.5}
                    cornerRadius={4}
                  />
                  <Text
                    text="UNPACK"
                    fill="#ffe082"
                    fontSize={7.5}
                    fontStyle="bold"
                    align="center"
                    width={42}
                    y={4.5}
                  />
                </Group>
              </Group>
            );
          })}

          {/* 2. RENDER CONNECTIONS */}
          {edges.map(renderConnectionCurve)}

          {/* 3. RENDER DRAG CONNECTION PREVIEW LINE */}
          {isConnecting && connectingSourceId && (() => {
            const srcNode = nodes.find(n => n.id === connectingSourceId);
            if (!srcNode) return null;

            const x0 = srcNode.x + NODE_WIDTH;
            const y0 = srcNode.y + NODE_HEIGHT / 2;
            const pathData = `M ${x0} ${y0} L ${x0 + 60} ${y0}`;
            
            return (
              <Path
                data={pathData}
                stroke="#8ab4f8"
                strokeWidth={2}
                dash={[6, 4]}
                opacity={0.8}
              />
            );
          })()}

          {/* 4. RENDER COLLAPSED NODE GROUPS (Rendered as single folder blocks) */}
          {nodeGroups.filter(g => g.isCollapsed).map((group) => {
            const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
            if (groupNodes.length === 0) return null;

            // Folders are rendered at coordinates of the first packed node
            const posX = groupNodes[0].x;
            const posY = groupNodes[0].y;

            return (
              <Group
                key={group.id}
                x={posX}
                y={posY}
                draggable={userRole !== 'Viewer'}
                onDragStart={() => {
                  if (userRole === 'Viewer') return;
                  const positions: { [id: string]: { x: number; y: number } } = {};
                  groupNodes.forEach(n => {
                    positions[n.id] = { x: n.x, y: n.y };
                  });
                  dragStartPosRef.current = positions;
                }}
                onDragMove={(e) => {
                  if (userRole === 'Viewer') return;
                  const startPositions = dragStartPosRef.current;
                  const firstNodeId = group.nodeIds[0];
                  const triggerStart = startPositions[firstNodeId];
                  if (!triggerStart) return;

                  let dx = e.target.x() - triggerStart.x;
                  let dy = e.target.y() - triggerStart.y;

                  const isAltBypassed = e.evt && e.evt.altKey;
                  if (!isAltBypassed) {
                    dx = Math.round(dx / 20) * 20;
                    dy = Math.round(dy / 20) * 20;
                  }

                  const targetNodePositions = Object.keys(startPositions).map(id => {
                    let targetX = startPositions[id].x + dx;
                    let targetY = startPositions[id].y + dy;
                    if (!isAltBypassed) {
                      targetX = Math.round(targetX / 20) * 20;
                      targetY = Math.round(targetY / 20) * 20;
                    }
                    return { id, x: targetX, y: targetY };
                  });

                  batchMoveNodes(targetNodePositions);
                }}
                onDragEnd={(e) => {
                  if (userRole === 'Viewer') return;
                  const startPositions = dragStartPosRef.current;
                  const targets = Object.keys(startPositions);
                  
                  targets.forEach(id => {
                    const node = nodes.find(n => n.id === id);
                    if (node) {
                      useCanvasStore.getState().moveNode(id, node.x, node.y);
                    }
                  });
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedNodeIds(group.nodeIds);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  toggleGroupCollapse(group.id);
                  setSelectedNodeIds([]);
                }}
              >
                {/* Folder container Rect */}
                <Rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  fill="#1b1c1f"
                  cornerRadius={8}
                  stroke={group.color}
                  strokeWidth={1.5}
                />
                {/* Visual Folder Icon backdrop */}
                <Rect
                  x={12}
                  y={22}
                  width={28}
                  height={22}
                  fill={group.color}
                  opacity={0.15}
                  cornerRadius={3}
                />
                
                {/* Folder Text */}
                <Text
                  x={50}
                  y={20}
                  text={group.name}
                  fill="#e3e3e3"
                  fontSize={11.5}
                  fontStyle="bold"
                  fontFamily="'Outfit', sans-serif"
                />
                <Text
                  x={50}
                  y={38}
                  text={`${group.nodeIds.length} grouped layers packed`}
                  fill={group.color}
                  fontSize={8.5}
                  fontFamily="'Outfit', sans-serif"
                />
                <Text
                  x={50}
                  y={52}
                  text="Double click to expand layers"
                  fill="gray"
                  fontSize={8}
                  fontStyle="italic"
                  fontFamily="'Outfit', sans-serif"
                />
              </Group>
            );
          })}

          {/* 5. RENDER ALL ACTIVE GRAPH NODES */}
          {nodes.filter(node => !isNodeCollapsed(node.id)).map((node) => {
            const isSelected = selectedNodeIds.includes(node.id);
            const isAnimating = activeAnimationNodeId === node.id;
            const dotColor = getNodeColor(node.type);

            const selectingCollaborators = Object.values(collaborators).filter(c => c.selection === node.id);
            const isSelectedByOther = selectingCollaborators.length > 0;
            const otherSelectorColor = isSelectedByOther ? selectingCollaborators[0].color : null;
            const otherSelectorName = isSelectedByOther ? selectingCollaborators[0].username : null;

            const nodeErrors = validationErrors.filter(err => err.nodeId === node.id);
            const hasError = nodeErrors.some(err => err.type === 'error');
            const hasWarning = nodeErrors.some(err => err.type === 'warning');
            const badgeColor = hasError ? '#f28b82' : hasWarning ? '#ffe082' : null;

            return (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable={userRole !== 'Viewer'}
                onDragStart={() => handleNodeDragStart(node.id)}
                onDragMove={(e) => handleNodeDragMove(node.id, e)}
                onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  
                  // Support Shift-Click Multi-selection
                  if (e.evt.shiftKey) {
                    if (selectedNodeIds.includes(node.id)) {
                      setSelectedNodeIds(selectedNodeIds.filter(id => id !== node.id));
                    } else {
                      setSelectedNodeIds([...selectedNodeIds, node.id]);
                    }
                  } else {
                    setSelectedNodeIds([node.id]);
                    sendSelection(node.id);
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Shared Selection dashed outline */}
                {isSelectedByOther && otherSelectorColor && (
                  <Group>
                    <Rect
                      x={-4}
                      y={-4}
                      width={NODE_WIDTH + 8}
                      height={NODE_HEIGHT + 8}
                      fill="transparent"
                      stroke={otherSelectorColor}
                      strokeWidth={1.5}
                      dash={[6, 4]}
                      cornerRadius={10}
                    />
                    {/* Floating tag indicating selector */}
                    <Group x={NODE_WIDTH - 90} y={-21}>
                      <Rect
                        width={90}
                        height={14}
                        fill={otherSelectorColor}
                        cornerRadius={3}
                      />
                      <Text
                        text={`${otherSelectorName} selecting`}
                        fill="#1e1f22"
                        fontSize={8}
                        fontStyle="bold"
                        fontFamily="'Outfit', sans-serif"
                        align="center"
                        width={90}
                        y={3}
                      />
                    </Group>
                  </Group>
                )}

                {/* Visual Jump focus pulsing highlight */}
                {highlightedNodeId === node.id && (
                  <Rect
                    x={-5}
                    y={-5}
                    width={NODE_WIDTH + 10}
                    height={NODE_HEIGHT + 10}
                    fill="transparent"
                    stroke="#ffe082"
                    strokeWidth={2}
                    cornerRadius={10}
                    opacity={0.5 + 0.4 * Math.sin(animTime * 30)}
                  />
                )}

                {/* Node Box container */}
                <Rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  fill="#232428"
                  cornerRadius={8}
                  stroke={badgeColor ? badgeColor : isAnimating ? '#8ab4f8' : isSelected ? '#8ab4f8' : '#3f4046'}
                  strokeWidth={badgeColor ? 1.8 : isAnimating ? 2.5 : isSelected ? 2.2 : 1}
                />

                {/* Warning / Error Badge */}
                {badgeColor && (
                  <Group x={NODE_WIDTH - 8} y={-8}>
                    <Circle
                      radius={8.5}
                      fill={badgeColor}
                      stroke="#232428"
                      strokeWidth={1.5}
                    />
                    <Text
                      text={nodeErrors.length.toString()}
                      fill="#1e1f22"
                      fontSize={9}
                      fontStyle="bold"
                      align="center"
                      width={16}
                      x={-8}
                      y={-4.5}
                    />
                  </Group>
                )}

                {/* Elegant Hover Tooltip */}
                {hoveredNodeId === node.id && nodeErrors.length > 0 && (
                  <Group x={0} y={-45}>
                    <Rect
                      width={220}
                      height={38}
                      fill="#2b2d31"
                      cornerRadius={6}
                      stroke={badgeColor || '#3f4046'}
                      strokeWidth={1}
                    />
                    <Text
                      text={nodeErrors[0].message}
                      fill="#e3e3e3"
                      fontSize={8.5}
                      fontFamily="'Outfit', sans-serif"
                      width={210}
                      x={5}
                      y={5}
                    />
                  </Group>
                )}

                {/* Left input socket */}
                {node.type !== 'Input' && (
                  <Group
                    x={0}
                    y={NODE_HEIGHT / 2}
                    onClick={(e) => handlePortClick(e, node.id, true)}
                    className="cursor-pointer"
                  >
                    <Circle
                      radius={6}
                      fill="#1e1f22"
                      stroke={isConnecting && connectingSourceId !== node.id ? '#8ab4f8' : '#3f4046'}
                      strokeWidth={1.5}
                    />
                    <Circle
                      radius={2.5}
                      fill={isConnecting && connectingSourceId !== node.id ? '#8ab4f8' : '#9aa0a6'}
                    />
                  </Group>
                )}

                {/* Right output socket */}
                <Group
                  x={NODE_WIDTH}
                  y={NODE_HEIGHT / 2}
                  onClick={(e) => handlePortClick(e, node.id, false)}
                  className="cursor-pointer"
                >
                  <Circle
                    radius={6}
                    fill="#1e1f22"
                    stroke={isConnecting && connectingSourceId === node.id ? '#8ab4f8' : '#3f4046'}
                    strokeWidth={1.5}
                  />
                  <Circle
                    radius={2.5}
                    fill={isConnecting && connectingSourceId === node.id ? '#8ab4f8' : '#9aa0a6'}
                  />
                </Group>

                {/* Color Dot indicator */}
                <Circle
                  x={18}
                  y={22}
                  radius={4.5}
                  fill={dotColor}
                />

                {/* Node Label/Name */}
                <Text
                  x={30}
                  y={16}
                  text={node.name}
                  fill="#e3e3e3"
                  fontSize={11.5}
                  fontStyle="bold"
                  fontFamily="'Outfit', sans-serif"
                />

                {/* Node Subtitle dimensions breakdown */}
                {node.type === 'Input' && (
                  <Text
                    x={18}
                    y={48}
                    text={`DIM:   ${node.outputShape.join(', ')}`}
                    fill="#9aa0a6"
                    fontSize={9.5}
                    fontFamily="monospace"
                  />
                )}

                {node.type === 'Conv2D' && (
                  <Group x={18} y={44}>
                    <Text
                      text={`FILTERS`}
                      fill="#5f6368"
                      fontSize={8.5}
                      fontFamily="'Outfit', sans-serif"
                      fontStyle="bold"
                    />
                    <Text
                      x={65}
                      text={`${node.config.filters || 64}`}
                      fill="#9aa0a6"
                      fontSize={8.5}
                      fontFamily="monospace"
                    />
                    <Text
                      y={14}
                      text={`KERNEL`}
                      fill="#5f6368"
                      fontSize={8.5}
                      fontFamily="'Outfit', sans-serif"
                      fontStyle="bold"
                    />
                    <Text
                      x={65}
                      y={14}
                      text={`${node.config.kernelSize || 3}x${node.config.kernelSize || 3}`}
                      fill="#9aa0a6"
                      fontSize={8.5}
                      fontFamily="monospace"
                    />
                  </Group>
                )}

                {node.type === 'MaxPool2D' && (
                  <Group x={18} y={48}>
                    <Text
                      text={`STRIDE:   ${node.config.stride || 2}`}
                      fill="#9aa0a6"
                      fontSize={9.5}
                      fontFamily="monospace"
                    />
                  </Group>
                )}

                {node.type === 'Flatten' && (
                  <Group x={18} y={48}>
                    <Text
                      text={`FLATTEN`}
                      fill="#c5a3ff"
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
                      fill="#9aa0a6"
                      fontSize={9.5}
                      fontFamily="monospace"
                    />
                  </Group>
                )}

                {/* Layer Statistics Overlay */}
                {showStatsOverlay && (() => {
                  const stats = getNodeStats(node);
                  return (
                    <Group y={NODE_HEIGHT + 4}>
                      <Rect
                        width={NODE_WIDTH}
                        height={34}
                        fill="#1b1c1e"
                        opacity={0.92}
                        cornerRadius={6}
                        stroke="#c5a3ff"
                        strokeWidth={0.8}
                      />
                      <Text
                        x={8}
                        y={5}
                        text={`${stats.params}  |  ${stats.flops}\nvRAM: ${stats.memory}  |  Act: ${stats.actSize}`}
                        fill="#e3e3e3"
                        fontSize={8.2}
                        fontFamily="monospace"
                        lineHeight={1.4}
                      />
                    </Group>
                  );
                })()}
              </Group>
            );
          })}

          {/* 6. RENDER DRAG-SELECT MARQUEE DASHER BOX */}
          {isMarqueeDragging && marqueeStart && marqueeEnd && (
            <Rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="#8ab4f8"
              opacity={0.06}
              stroke="#8ab4f8"
              strokeWidth={1.5}
              dash={[6, 4]}
              cornerRadius={4}
            />
          )}

          {/* 7. RENDER LIVE COLLABORATIVE CURSORS */}
          {Object.values(collaborators)
            .filter((c) => c.cursor !== null)
            .map((c) => (
              <Group key={c.clientId} x={c.cursor!.x} y={c.cursor!.y}>
                <Path
                  data="M0,0 L0,15 L4,11 L9,11 Z"
                  fill={c.color}
                  stroke="#1e1f22"
                  strokeWidth={1.5}
                />
                <Group x={12} y={10}>
                  <Rect
                    width={c.username.length * 7 + 12}
                    height={18}
                    fill={c.color}
                    cornerRadius={4}
                  />
                  <Text
                    text={c.username}
                    fill="#1e1f22"
                    fontSize={9}
                    fontStyle="bold"
                    fontFamily="'Outfit', sans-serif"
                    x={6}
                    y={4.5}
                  />
                </Group>
              </Group>
            ))}
        </Layer>
      </Stage>

      {/* Viewport Minimap Corner Overlay (minimap) */}
      <div className="absolute top-4 right-4 w-44 h-32 bg-[#1e1f22]/95 border border-[#3f4046] rounded-2xl shadow-2xl z-30 select-none overflow-hidden flex flex-col justify-between p-2.5">
        <span className="text-[8.5px] font-extrabold text-gray-500 uppercase tracking-widest block border-b border-[#2b2d31]/80 pb-1 mb-1 font-sans">
          Workspace Minimap
        </span>
        <div className="flex-1 w-full relative">
          <svg 
            ref={minimapSvgRef}
            className="w-full h-full bg-[#101113]/40 rounded-lg overflow-hidden cursor-crosshair"
            onMouseDown={handleMinimapMouseDown}
          >
            {/* Draw miniature nodes */}
            {nodes.map(n => {
              const rx = ((n.x - minX) / rangeX) * svgWidth;
              const ry = ((n.y - minY) / rangeY) * svgHeight;
              const rw = (NODE_WIDTH / rangeX) * svgWidth;
              const rh = (NODE_HEIGHT / rangeY) * svgHeight;
              const isSelected = selectedNodeIds.includes(n.id);
              return (
                <rect
                  key={n.id}
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx={1.5}
                  fill={getNodeColor(n.type)}
                  stroke={isSelected ? "#8ab4f8" : "none"}
                  strokeWidth={isSelected ? 1 : 0}
                  opacity={isSelected ? 1.0 : 0.6}
                />
              );
            })}
            
            {/* Draw active collaborator cursors for collaboration awareness */}
            {Object.values(collaborators)
              .filter(c => c.cursor !== null)
              .map(c => {
                const cx = ((c.cursor!.x - minX) / rangeX) * svgWidth;
                const cy = ((c.cursor!.y - minY) / rangeY) * svgHeight;
                return (
                  <circle
                    key={c.clientId}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={c.color}
                    stroke="#1e1f22"
                    strokeWidth={0.5}
                  />
                );
              })}

            {/* Viewport frame box mapping stage zoom/pan */}
            {(() => {
              const stageWidth = stageRef.current?.width() || window.innerWidth;
              const stageHeight = stageRef.current?.height() || window.innerHeight;
              const x0 = -pan.x / zoom;
              const y0 = -pan.y / zoom;
              const w = stageWidth / zoom;
              const h = stageHeight / zoom;

              const viewX = ((x0 - minX) / rangeX) * svgWidth;
              const viewY = ((y0 - minY) / rangeY) * svgHeight;
              const viewW = (w / rangeX) * svgWidth;
              const viewH = (h / rangeY) * svgHeight;
              
              return (
                <rect
                  x={viewX}
                  y={viewY}
                  width={viewW}
                  height={viewH}
                  fill="none"
                  stroke="#8ab4f8"
                  strokeWidth="1.25"
                  rx={1}
                  opacity={0.8}
                />
              );
            })()}
          </svg>
        </div>
      </div>


    </div>
  );
}
