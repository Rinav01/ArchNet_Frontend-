import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LayerLibrary from '@/components/Panels/LayerLibrary';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { useLayoutStore } from '@/store/layoutStore';

describe('LayerLibrary Component Sandbox Gating Tests', () => {
  beforeEach(() => {
    useProjectStore.setState({
      activeProjectId: 'sandbox',
      userRole: 'Admin',
    });
    useLayoutStore.setState({
      isLoginPromoOpen: false,
      loginPromoReason: '',
    });
  });

  test('should render layer library header', () => {
    render(<LayerLibrary />);
    expect(screen.getByText('Layer Library')).toBeInTheDocument();
  });

  test('should show lock icons and trigger login promo modal on premium templates', () => {
    render(<LayerLibrary />);
    
    // Mini-GPT is a premium template
    const gptCard = screen.getByText('Mini-GPT');
    expect(gptCard).toBeInTheDocument();

    fireEvent.click(gptCard);

    // Verify it opened the promo instead of prompt
    expect(useLayoutStore.getState().isLoginPromoOpen).toBe(true);
    expect(useLayoutStore.getState().loginPromoReason).toContain('Mini-GPT template is an advanced production-grade architecture');
  });

  test('should allow standard templates to load directly via confirmation modal', () => {
    const loadTemplateSpy = jest.spyOn(useCanvasStore.getState(), 'loadPrebuiltTemplate').mockImplementation(async () => {});

    render(<LayerLibrary />);

    // Sentiment Classifier is a free template
    const sentimentCard = screen.getByText('Sentiment Classifier');
    expect(sentimentCard).toBeInTheDocument();

    fireEvent.click(sentimentCard);

    // Verify modal is visible
    expect(screen.getByText('Replace Workspace Layout')).toBeInTheDocument();

    // Click "Load Template" button
    const loadBtn = screen.getByText('Load Template');
    fireEvent.click(loadBtn);

    expect(loadTemplateSpy).toHaveBeenCalledWith('Sentiment Classifier');
    expect(useLayoutStore.getState().isLoginPromoOpen).toBe(false);

    loadTemplateSpy.mockRestore();
  });

  test('should allow custom blocks to be deleted via custom confirmation modal', () => {
    const deleteBlockSpy = jest.spyOn(useCanvasStore.getState(), 'deleteCustomBlock').mockImplementation(() => {});
    
    useCanvasStore.setState({
      customBlocks: [
        {
          id: 'block-1',
          name: 'My Custom Block',
          nodes: [{ 
            id: 'n1', 
            type: 'Conv2D', 
            name: 'Conv2D_1',
            x: 0, 
            y: 0, 
            inputShape: [], 
            outputShape: [], 
            config: {} 
          }],
          edges: [],
        }
      ]
    });

    render(<LayerLibrary />);

    // Check custom block is rendered
    expect(screen.getByText('My Custom Block')).toBeInTheDocument();

    // Find and click delete button (the trash icon with specific title)
    const deleteBtn = screen.getByTitle('Delete Custom Block');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    // Verify modal is visible
    expect(screen.getByText('Remove Saved Component')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete the custom block/)).toBeInTheDocument();

    // Click "Delete" button inside modal
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);

    expect(deleteBlockSpy).toHaveBeenCalledWith('block-1');

    deleteBlockSpy.mockRestore();
  });
});
