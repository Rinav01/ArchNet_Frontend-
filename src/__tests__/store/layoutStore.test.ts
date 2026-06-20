import { useLayoutStore } from '@/store/layoutStore';

describe('layoutStore Confirm Dialog Actions', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      confirmDialog: null,
    });
  });

  test('should initialize with confirmDialog as null', () => {
    const state = useLayoutStore.getState();
    expect(state.confirmDialog).toBeNull();
  });

  test('should open confirm dialog with correct options and resolve promise on confirm', async () => {
    const store = useLayoutStore.getState();

    const confirmPromise = store.confirm({
      title: 'Test Title',
      message: 'Test Message',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      isDestructive: true,
    });

    const activeDialog = useLayoutStore.getState().confirmDialog;
    expect(activeDialog).not.toBeNull();
    expect(activeDialog?.isOpen).toBe(true);
    expect(activeDialog?.title).toBe('Test Title');
    expect(activeDialog?.message).toBe('Test Message');
    expect(activeDialog?.confirmLabel).toBe('Yes');
    expect(activeDialog?.cancelLabel).toBe('No');
    expect(activeDialog?.isDestructive).toBe(true);

    // Call closeConfirm to resolve as true
    useLayoutStore.getState().closeConfirm(true);

    const result = await confirmPromise;
    expect(result).toBe(true);
    expect(useLayoutStore.getState().confirmDialog).toBeNull();
  });

  test('should open confirm dialog and resolve promise as false on cancel', async () => {
    const store = useLayoutStore.getState();

    const confirmPromise = store.confirm({
      title: 'Another Title',
      message: 'Another Message',
    });

    // Call closeConfirm to resolve as false
    useLayoutStore.getState().closeConfirm(false);

    const result = await confirmPromise;
    expect(result).toBe(false);
    expect(useLayoutStore.getState().confirmDialog).toBeNull();
  });
});
