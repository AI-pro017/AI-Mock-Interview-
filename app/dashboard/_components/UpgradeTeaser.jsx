import { Shield, Zap } from 'lucide-react';
import Link from 'next/link';

function UpgradeTeaser() {
  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-sm text-white">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-yellow-400/20 p-2 rounded-md">
          <Shield className="h-5 w-5 text-yellow-400" />
        </div>
        <h2 className="text-lg font-semibold">Go Pro</h2>
      </div>
      
      <p className="text-sm text-gray-300 mb-5">
        Unlock unlimited interviews, custom roles, and advanced performance analytics.
      </p>
      
      <Link href="/dashboard/upgrade">
        <button className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-gray-900 font-medium py-3 px-4 rounded-lg hover:bg-yellow-500 transition-colors">
          <Zap className="h-4 w-4" />
          Upgrade Now
        </button>
      </Link>
    </div>
  );
}

export default UpgradeTeaser; 