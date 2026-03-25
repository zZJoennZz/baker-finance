// components/ResultsScreen.tsx
import { PayoutRecord, Stats } from '@/types';
import { usePayoutFilters } from '@/hooks/usePayoutFilters';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Download, AlertCircle, Calendar, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { UnmatchedSection } from './UnmatchedSection';
import { StatsHeader } from './StatsHeader';
import { PayoutSection } from './PayoutSection';

interface ResultsScreenProps {
  result: {
    results: PayoutRecord[];
    stats: Stats;
  };
  onDownloadExcel: () => void;
  onReset: () => void;
}

export function ResultsScreen({ result, onDownloadExcel, onReset }: ResultsScreenProps) {
  const {
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
  } = usePayoutFilters(result.results);

  const formatPayoutDateRange = (payout: PayoutRecord) => {
    if (!payout.payout_dates) return 'No date available';
    const { min, max } = payout.payout_dates;
    if (min === max || !max) {
      return formatDate(min);
    }
    return `${formatDate(min)} - ${formatDate(max)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <StatsHeader 
        stats={result.stats} 
        totalMatched={totalMatched}
        totalUnmatched={totalUnmatched}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onDownload={onDownloadExcel}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bakery-500"
            />
          </div>
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bakery-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payout Tables */}
      <div className="space-y-6">
        {filterData.map((payout, idx) => {
          const isExpanded = expandedPayouts.has(idx);
          const unmatchedCount = payout.uncategorized?.length || 0;
          
          return (
            <PayoutSection
              key={idx}
              payout={payout}
              index={idx}
              isExpanded={isExpanded}
              dateRange={formatPayoutDateRange(payout)}
              unmatchedCount={unmatchedCount}
              onToggle={() => togglePayout(idx)}
            />
          );
        })}
      </div>

      {/* Unmatched Records Section */}
      <UnmatchedSection 
        results={result.results} 
        totalUnmatched={totalUnmatched} 
      />

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <button onClick={onReset} className="btn-secondary">
          Start Over
        </button>
        <button onClick={onDownloadExcel} className="btn-primary">
          <Download className="w-4 h-4 mr-2" />
          Download Full Report (Excel)
        </button>
      </div>
    </div>
  );
}