import { Shield, Zap } from 'lucide-react';
import Link from 'next/link';

function UpgradeTeaser() {
  return (
    <div className="p-6 bg-gray-800 rounded-xl shadow-sm text-white">
      <div className="flex items-center gap-4 mb-3">
        <Shield className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-semibold">Go Pro</h2>
      </div>
      <p className="text-sm text-gray-300 mb-4">
        Unlock unlimited interviews, custom roles, and advanced performance analytics.
      </p>
      <Link href="/dashboard/upgrade">
        <button className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors">
            <Zap className="h-4 w-4" />
            Upgrade Now
        </button>
      </Link>
    </div>
  );
}

export default UpgradeTeaser; 