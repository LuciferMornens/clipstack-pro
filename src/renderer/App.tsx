// src/renderer/App.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import './styles.css';

interface ClipboardItem {
  id: number;
  content: string;
  timestamp: number;
  type: string;
  category: string | null;
  source: string | null;
  is_code: boolean;
  language: string | null;
}

interface FilterState {
  type?: string;
  category?: string;
  isCode?: boolean;
  language?: string;
  search?: string;
}

type FilterKey = keyof FilterState;
type FilterValueType<K extends FilterKey> = NonNullable<FilterState[K]>;

declare global {
  interface Window {
    electron: {
      writeToClipboard: (text: string) => void;
      hideWindow: () => void;
    };
  }
}

const App: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Prevent "dragEvent is not defined" error
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', handleDragOver);
    return () => window.removeEventListener('dragover', handleDragOver);
  }, []);

  // Listen for real-time clipboard updates.
  useEffect(() => {
    const handleClipboardUpdate = (_: any, newItems: ClipboardItem[]) => {
      if (Object.keys(filters).length === 0) {
        // No filters active; update items with the full list.
        setItems(newItems);
      } else {
        // Re-fetch filtered items using current filters.
        ipcRenderer.invoke('get-clipboard-history', filters)
          .then((filteredItems: ClipboardItem[]) => {
            setItems(filteredItems);
          })
          .catch((error) => console.error('Error re-fetching filtered items:', error));
      }
    };
    ipcRenderer.on('clipboard-updated', handleClipboardUpdate);
    return () => {
      ipcRenderer.removeListener('clipboard-updated', handleClipboardUpdate);
    };
  }, [filters]);

  const updateFilters = useCallback(
    (newFilters: Partial<FilterState> | ((prev: FilterState) => Partial<FilterState>)) => {
      setFilters((prev) => {
        const updatedFilters = typeof newFilters === 'function' ? newFilters(prev) : { ...prev, ...newFilters };
        const cleanFilters = Object.fromEntries(
          Object.entries(updatedFilters).filter(([_, value]) => value != null && value !== '')
        ) as Partial<FilterState>;
        
        ipcRenderer.invoke('get-clipboard-history', cleanFilters)
          .then((items: ClipboardItem[]) => {
            setItems(items);
          })
          .catch((error) => console.error('Error updating filters:', error));
        return updatedFilters;
      });
    },
    []
  );

  const handleFilterClick = <K extends FilterKey>(filterType: K, value: FilterValueType<K>) => {
    updateFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[filterType] === value) {
        delete newFilters[filterType];
      } else {
        newFilters[filterType] = value;
      }
      return newFilters;
    });
    setSelectedId(null);
  };

  useEffect(() => {
    ipcRenderer.invoke('get-clipboard-history', {})
      .then((items: ClipboardItem[]) => {
        setItems(items);
      })
      .catch((error) => console.error('Error fetching clipboard history:', error));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = items.findIndex((item) => item.id === selectedId);
        const newIndex =
          e.key === 'ArrowUp'
            ? Math.max(0, currentIndex - 1)
            : Math.min(items.length - 1, currentIndex + 1);
        
        if (newIndex !== currentIndex) {
          setSelectedId(items[newIndex]?.id ?? null);
          const element = document.querySelector(`[data-id="${items[newIndex]?.id}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else if (e.key === 'Enter' && selectedId !== null) {
        e.preventDefault();
        const selectedItem = items.find((item) => item.id === selectedId);
        if (selectedItem) {
          handleItemClick(selectedItem.content);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        ipcRenderer.invoke('hide-window');
      }
    },
    [items, selectedId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ search: e.target.value });
    setSelectedId(null);
  };

  const handleItemClick = (content: string) => {
    ipcRenderer.invoke('copy-to-clipboard', content);
  };

  const handleSelect = (item: ClipboardItem) => {
    setSelectedId(item.id);
    handleItemClick(item.content);
  };

  const categories = Array.from(
    new Set(items.map((item) => item.category).filter((cat): cat is string => cat !== null))
  );
  const languages = Array.from(
    new Set(items.map((item) => item.language).filter((lang): lang is string => lang !== null))
  );
  const types = Array.from(new Set(items.map((item) => item.type)));

  const formatContent = (content: string) => {
    const trimmed = content.replace(/^[\s\n]{2,}|[\s\n]{2,}$/g, '\n');
    const normalizedNewlines = trimmed.replace(/\n{3,}/g, '\n\n');
    return normalizedNewlines;
  };

  const renderItemContent = (item: ClipboardItem) => {
    const formattedContent = formatContent(item.content);
    const hasOverflow = formattedContent.length > 300;
    
    if (item.is_code) {
      return (
        <pre className={`code-content ${hasOverflow ? 'overflow' : ''}`}>
          <code className={item.language ? `language-${item.language}` : ''}>
            {formattedContent}
          </code>
        </pre>
      );
    }

    if (item.type === 'url') {
      return (
        <a
          href="#"
          className="url-content"
          onClick={(e) => {
            e.preventDefault();
            ipcRenderer.invoke('open-url', formattedContent);
          }}
        >
          {formattedContent}
        </a>
      );
    }

    return (
      <div className={`text-content ${hasOverflow ? 'overflow' : ''}`}>
        <pre className="text-pre">{formattedContent}</pre>
      </div>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const columns =
        window.innerWidth <= 640 ? '1' :
        window.innerWidth <= 1024 ? '2' : '3';
      document.documentElement.style.setProperty('--grid-columns', columns);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
  };

  return (
    <div className="app">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search clipboard history..."
          value={filters.search || ''}
          onChange={handleSearch}
          ref={searchInputRef}
          autoFocus
        />
      </div>
      <div className="filters">
        {types.length > 0 && (
          <div className="filter-group">
            <span className="filter-label">Types:</span>
            <div className="filter-buttons">
              {types.map((type) => (
                <button
                  key={type}
                  className={`filter-button ${filters.type === type ? 'active' : ''}`}
                  onClick={() => handleFilterClick('type', type)}
                  title={`Filter by ${type}`}
                >
                  {type}
                  {filters.type === type && <span className="filter-active-indicator">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {categories.length > 0 && (
          <div className="filter-group">
            <span className="filter-label">Categories:</span>
            <div className="filter-buttons">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`filter-button ${filters.category === category ? 'active' : ''}`}
                  onClick={() => handleFilterClick('category', category)}
                  title={`Filter by ${category}`}
                >
                  {category}
                  {filters.category === category && <span className="filter-active-indicator">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {languages.length > 0 && (
          <div className="filter-group">
            <span className="filter-label">Languages:</span>
            <div className="filter-buttons">
              {languages.map((language) => (
                <button
                  key={language}
                  className={`filter-button ${filters.language === language ? 'active' : ''}`}
                  onClick={() => handleFilterClick('language', language)}
                  title={`Filter by ${language}`}
                >
                  {language}
                  {filters.language === language && <span className="filter-active-indicator">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="items-list">
        {items.map((item) => (
          <div
            key={item.id}
            data-id={item.id}
            className={`item ${selectedId === item.id ? 'selected' : ''}`}
            onClick={() => handleSelect(item)}
            data-type={item.type}
          >
            <div className="item-content">{renderItemContent(item)}</div>
            <div className="item-meta">
              <span className="item-time">{formatTime(item.timestamp)}</span>
              <div className="item-tags">
                <span className="tag" data-type={item.type}>{item.type}</span>
                {item.category && (
                  <span className="tag" data-type={item.category.toLowerCase()}>{item.category}</span>
                )}
                {item.language && (
                  <span className="tag" data-type={item.language.toLowerCase()}>{item.language}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;