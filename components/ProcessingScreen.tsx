// components/ProcessingScreen.tsx
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';

interface ProcessingScreenProps {
  status: string;
  fileCount: number;
}

export function ProcessingScreen({ status, fileCount }: ProcessingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <div className="w-24 h-24 border-4 border-bakery-200 border-t-bakery-600 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Calculator className="w-10 h-10 text-bakery-600" />
        </div>
      </motion.div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-bakery-900">Processing Data...</h2>
        <p className="text-bakery-600 max-w-md">
          {status || `Matching ${fileCount} payout files with sales records...`}
        </p>
      </div>

      <div className="w-72 bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div 
          className="h-full bg-bakery-600"
          animate={{ 
            width: ["0%", "100%"],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      <p className="text-xs text-bakery-400 text-center max-w-sm">
        Analyzing order numbers, calculating category proportions, and generating report...
      </p>
    </div>
  );
}