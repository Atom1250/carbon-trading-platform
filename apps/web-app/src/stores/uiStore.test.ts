import { renderHook, act } from '@testing-library/react';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      sidebarCollapsed: false,
      activeModal: null,
      breadcrumbs: [],
    });
  });

  describe('sidebar state', () => {
    it('initializes with sidebar expanded', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('collapses sidebar', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      expect(result.current.sidebarCollapsed).toBe(true);
    });

    it('expands sidebar', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      act(() => {
        result.current.setSidebarCollapsed(false);
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('toggles sidebar from expanded to collapsed', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(true);
    });

    it('toggles sidebar from collapsed to expanded', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('persists sidebar state to localStorage', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      const stored = localStorage.getItem('ui-storage');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.state.sidebarCollapsed).toBe(true);
    });
  });

  describe('modal state', () => {
    it('initializes with no active modal', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.activeModal).toBeNull();
    });

    it('opens a modal', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal('create-asset');
      });

      expect(result.current.activeModal).toBe('create-asset');
    });

    it('closes the modal', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal('create-asset');
      });

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.activeModal).toBeNull();
    });

    it('switches between modals', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal('modal-1');
      });

      expect(result.current.activeModal).toBe('modal-1');

      act(() => {
        result.current.openModal('modal-2');
      });

      expect(result.current.activeModal).toBe('modal-2');
    });
  });

  describe('breadcrumbs', () => {
    it('initializes with empty breadcrumbs', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.breadcrumbs).toEqual([]);
    });

    it('sets breadcrumbs', () => {
      const { result } = renderHook(() => useUIStore());
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Assets', href: '/assets' },
        { label: 'Details' },
      ];

      act(() => {
        result.current.setBreadcrumbs(breadcrumbs);
      });

      expect(result.current.breadcrumbs).toEqual(breadcrumbs);
    });

    it('updates breadcrumbs', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setBreadcrumbs([{ label: 'Home', href: '/' }]);
      });

      const newBreadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Trading' },
      ];

      act(() => {
        result.current.setBreadcrumbs(newBreadcrumbs);
      });

      expect(result.current.breadcrumbs).toEqual(newBreadcrumbs);
    });

    it('clears breadcrumbs', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setBreadcrumbs([{ label: 'Home', href: '/' }]);
      });

      act(() => {
        result.current.setBreadcrumbs([]);
      });

      expect(result.current.breadcrumbs).toEqual([]);
    });
  });
});
