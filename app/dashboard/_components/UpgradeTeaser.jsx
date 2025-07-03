import React from 'react';
import { Crown } from 'lucide-react';

function UpgradeTeaser() {
  return (
    <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden ring-1 ring-amber-500/30">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-amber-400 font-semibold">Go Pro</h3>
          <Crown className="h-6 w-6 text-amber-400" />
        </div>
        
        <p className="text-sm text-gray-400 mb-4">
          Unlock advanced features with our Pro subscription:
        </p>
        
        <ul className="space-y-2 mb-5">
          <li className="flex items-center text-sm text-gray-300"><span className="text-amber-500 mr-3">●</span>Unlimited interviews</li>
          <li className="flex items-center text-sm text-gray-300"><span className="text-amber-500 mr-3">●</span>Advanced AI feedback</li>
          <li className="flex items-center text-sm text-gray-300"><span className="text-amber-500 mr-3">●</span>Performance tracking</li>
        </ul>
        
        <button className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-sm font-bold transition-colors duration-200">
          Upgrade Now
        </button>
      </div>
    </div>
  );
}

export default UpgradeTeaser; 