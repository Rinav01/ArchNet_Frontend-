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

  test('should allow standard templates to load directly', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const loadTemplateSpy = jest.spyOn(useCanvasStore.getState(), 'loadPrebuiltTemplate').mockImplementation(async () => {});

    render(<LayerLibrary />);

    // Sentiment Classifier is a free template
    const sentimentCard = screen.getByText('Sentiment Classifier');
    expect(sentimentCard).toBeInTheDocument();

    fireEvent.click(sentimentCard);

    expect(confirmSpy).toHaveBeenCalled();
    expect(loadTemplateSpy).toHaveBeenCalledWith('Sentiment Classifier');
    expect(useLayoutStore.getState().isLoginPromoOpen).toBe(false);

    confirmSpy.mockRestore();
    loadTemplateSpy.mockRestore();
  });
});
