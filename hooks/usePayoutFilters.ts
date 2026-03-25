// hooks/usePayoutFilters.ts
import { useState, useMemo } from 'react';
import { PayoutRecord } from '@/types';

export function usePayoutFilters(results: PayoutRecord[] | null) {
  const [expandedPayouts, setExpandedPayouts] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(() => {
    if (!results) return ['all'];
    const categorySet = new Set<string>();
    results.forEach(payout => {
      payout.data.forEach(item => categorySet.add(item.Category));
    });
    return ['all', ...Array.from(categorySet)];
  }, [results]);

  const filterData = useMemo(() => {
    if (!results) return [];
    
    return results.map(payout => ({
      ...payout,
      data: payout.data.filter(item => {
        const matchesSearch = searchTerm === '' || 
          item.Order_Number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.Category?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = categoryFilter === 'all' || item.Category === categoryFilter;
        
        return matchesSearch && matchesCategory;
      })
    }));
  }, [results, searchTerm, categoryFilter]);

  const totalMatched = useMemo(() => {
    if (!filterData) return 0;
    return filterData.reduce((sum, payout) => sum + payout.data.length, 0);
  }, [filterData]);

  const totalUnmatched = useMemo(() => {
    if (!results) return 0;
    return results.reduce((sum, payout) => sum + payout.uncategorized.length, 0);
  }, [results]);

  const togglePayout = (index: number) => {
    setExpandedPayouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (!results) return;
    setExpandedPayouts(new Set(results.map((_, idx) => idx)));
  };

  const collapseAll = () => {
    setExpandedPayouts(new Set());
  };

  return {
    expandedPayouts,
    searchTerm,
    categoryFilter,
    categories,
    filterData,
    totalMatched,
    totalUnmatched,
    setSearchTerm,
    setCategoryFilter,
    togglePayout,
    expandAll,
    collapseAll,
  };
}