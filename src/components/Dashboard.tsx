
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ProductionTracker } from './ProductionTracker';
import { LogOut } from 'lucide-react';

export const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {/* Top Navigation */}
      <header className="bg-[#1E2329] shadow-sm border-b border-[#F0B90B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-[#F0B90B]">TrackVoi</h1>
              <span className="text-gray-300">Production Tracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-[#F0B90B]">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button 
                onClick={signOut} 
                variant="outline" 
                size="sm"
                className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ProductionTracker />
    </div>
  );
};
