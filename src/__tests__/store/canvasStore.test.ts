import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';

describe('canvasStore Zustand Store Tests', () => {
  beforeEach(() => {
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
});
