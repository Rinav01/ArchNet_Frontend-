import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import * as graphqlClient from '@/lib/graphql/client';

jest.mock('@/lib/graphql/client', () => {
  const original = jest.requireActual('@/lib/graphql/client');
  return {
    ...original,
    graphqlRequest: jest.fn(),
  };
});

describe('canvasStore Zustand Store Tests', () => {
  beforeEach(() => {
    (graphqlClient.graphqlRequest as jest.Mock).mockReset();
    useCanvasStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      logs: [],
    });
    useProjectStore.setState({
      activeProjectId: 'sandbox',
      isOnline: false,
    });
  });

  test('should initialize with empty nodes and edges', () => {
    const state = useCanvasStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
  });

  test('should add a node locally in Sandbox Mode', async () => {
    const store = useCanvasStore.getState();
    const nodeId = await store.addNode('Conv2D', 100, 100);

    const updatedState = useCanvasStore.getState();
    expect(nodeId).toBeDefined();
    expect(updatedState.nodes).toHaveLength(1);
    expect(updatedState.nodes[0].type).toBe('Conv2D');
    expect(updatedState.nodes[0].x).toBe(100);
    expect(updatedState.nodes[0].y).toBe(100);
  });

  test('should remove a node locally in Sandbox Mode', async () => {
    const store = useCanvasStore.getState();
    const nodeId = await store.addNode('Input', 50, 50);
    expect(useCanvasStore.getState().nodes).toHaveLength(1);

    await useCanvasStore.getState().removeNode(nodeId!);
    expect(useCanvasStore.getState().nodes).toHaveLength(0);
  });

  test('should add and remove an edge locally in Sandbox Mode', async () => {
    const store = useCanvasStore.getState();
    const n1 = await store.addNode('Input', 50, 50);
    const n2 = await store.addNode('Conv2D', 200, 50);

    await useCanvasStore.getState().addEdge(n1!, n2!);
    const stateWithEdge = useCanvasStore.getState();
    expect(stateWithEdge.edges).toHaveLength(1);
    expect(stateWithEdge.edges[0].source).toBe(n1);
    expect(stateWithEdge.edges[0].target).toBe(n2);

    const edgeId = stateWithEdge.edges[0].id;
    await useCanvasStore.getState().removeEdge(edgeId);
    expect(useCanvasStore.getState().edges).toHaveLength(0);
  });

  test('should handle template import race condition when loading templates quickly', async () => {
    // Enable online mode
    useProjectStore.setState({
      activeProjectId: 'test-project',
      isOnline: true,
    });

    // Mock WebSocket to be disconnected so it falls back to GraphQL
    useCanvasStore.setState({
      syncStatus: 'disconnected',
      ws: null,
    });

    (graphqlClient.graphqlRequest as jest.Mock).mockImplementation(async (query: string, variables?: any) => {
      if (query.includes('query GetProjectDetails')) {
        const currentNodes = useCanvasStore.getState().nodes;
        const currentEdges = useCanvasStore.getState().edges;
        return {
          project: {
            id: 'test-project',
            name: 'Test Project',
            nodes: currentNodes.map(n => ({
              id: n.id,
              type: n.type,
              label: n.name,
              positionX: n.x,
              positionY: n.y,
              inputShape: n.inputShape,
              outputShape: n.outputShape,
              config: n.config,
            })),
            edges: currentEdges.map(e => ({
              id: e.id,
              fromNodeId: e.source,
              toNodeId: e.target,
            })),
          },
        };
      }
      if (query.includes('mutation AddNode')) {
        return { addNode: { id: variables.config?.presetId || 'new-node-id', type: variables.type, label: variables.label, positionX: variables.position.x, positionY: variables.position.y } };
      }
      if (query.includes('mutation AddEdge')) {
        return { addEdge: { id: 'new-edge-id', fromNodeId: variables.fromNodeId, toNodeId: variables.toNodeId } };
      }
      if (query.includes('mutation DeleteNode')) {
        return { deleteNode: true };
      }
      return {};
    });

    // First template load
    const p1 = useCanvasStore.getState().loadPrebuiltTemplate('LeNet');
    
    // Immediately trigger second template load (should cancel/supersede first load's database sync)
    const p2 = useCanvasStore.getState().loadPrebuiltTemplate('Simple CNN');

    // Wait for both to complete
    await Promise.all([p1, p2]);

    const finalNodes = useCanvasStore.getState().nodes;
    expect(finalNodes.length).toBe(7); // Simple CNN has 7 nodes
    expect(finalNodes.some(n => n.name === 'CONV_1')).toBe(true);
  });

  test('should synchronize selectedNodeIds and selectedNodeId correctly', () => {
    const store = useCanvasStore.getState();
    store.setSelectedNodeIds(['node-1', 'node-2']);

    const state = useCanvasStore.getState();
    expect(state.selectedNodeIds).toEqual(['node-1', 'node-2']);
    expect(state.selectedNodeId).toBe('node-1');

    store.setSelectedNodeIds([]);
    const stateEmpty = useCanvasStore.getState();
    expect(stateEmpty.selectedNodeIds).toEqual([]);
    expect(stateEmpty.selectedNodeId).toBeNull();
  });

  test('should record correct oldX and oldY on moveNode during batch drags', async () => {
    const store = useCanvasStore.getState();
    const nodeId = await store.addNode('Input', 100, 100);
    
    // Clear history stack
    useCanvasStore.setState({ undoStack: [] });
    
    // Simulate drag end with original position (100, 100) and new position (150, 180)
    useCanvasStore.getState().moveNode(nodeId!, 150, 180, false, false, 100, 100);
    
    const state = useCanvasStore.getState();
    expect(state.nodes[0].x).toBe(150);
    expect(state.nodes[0].y).toBe(180);
    expect(state.undoStack).toHaveLength(1);
    expect(state.undoStack[0].type).toBe('MOVE_NODE');
    expect(state.undoStack[0].payload).toEqual({
      nodeId: nodeId,
      oldX: 100,
      oldY: 100,
      newX: 150,
      newY: 180,
    });
  });

  test('should abort loadGraph when templateImportId does not match latestTemplateImportId', async () => {
    useCanvasStore.setState({
      nodes: [{ id: 'keep-me', type: 'Input', name: 'KEEP_ME', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }]
    });

    useProjectStore.setState({ activeProjectId: 'test-project', isOnline: true });
    (graphqlClient.graphqlRequest as jest.Mock).mockImplementation(async () => {
      return {
        project: {
          id: 'test-project',
          name: 'Test Project',
          nodes: [{ id: 'stale-node', type: 'Conv2D', label: 'STALE', positionX: 50, positionY: 50, inputShape: [], outputShape: [], config: {} }],
          edges: [],
        }
      };
    });

    // Start a template load to set the module-level latestTemplateImportId
    const p = useCanvasStore.getState().loadPrebuiltTemplate('LeNet');
    
    // Call loadGraph with a stale ID (should abort and return early without calling set)
    await useCanvasStore.getState().loadGraph('test-project', 'stale-import-id');

    // State should not contain 'STALE'
    const nodes = useCanvasStore.getState().nodes;
    expect(nodes.some(n => n.name === 'STALE')).toBe(false);
  });
});
