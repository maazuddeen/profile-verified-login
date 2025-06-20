
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductionSelector } from './ProductionSelector';
import { LocationToggle } from './LocationToggle';
import { LocationMap } from './LocationMap';
import { WorkHistory } from './WorkHistory';
import { UserProfile } from './UserProfile';
import { TeamChat } from './TeamChat';
import { UserTrackingPage } from './UserTrackingPage';
import { MapPin, Clock, User, MessageCircle, Navigation } from 'lucide-react';

export const ProductionTracker = () => {
  const [selectedProduction, setSelectedProduction] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {/* Header */}
      <div className="bg-[#1E2329] shadow-sm border-b border-[#F0B90B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-[#F0B90B]">Production Location Tracker</h1>
              <p className="text-gray-300">Track your work, share location, and collaborate with your team</p>
            </div>
            
            {/* Production Selection */}
            <ProductionSelector 
              selectedProduction={selectedProduction}
              onProductionChange={setSelectedProduction}
            />
            
            {/* Location Toggle */}
            <LocationToggle selectedProduction={selectedProduction} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-[#1E2329] border border-[#F0B90B]">
            <TabsTrigger 
              value="tracking" 
              className="flex items-center gap-2 data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0B0E11] text-[#F0B90B]"
            >
              <Navigation className="h-4 w-4" />
              User Tracking
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="flex items-center gap-2 data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0B0E11] text-[#F0B90B]"
            >
              <MapPin className="h-4 w-4" />
              Location Map
            </TabsTrigger>
            <TabsTrigger 
              value="work" 
              className="flex items-center gap-2 data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0B0E11] text-[#F0B90B]"
            >
              <Clock className="h-4 w-4" />
              Work History
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0B0E11] text-[#F0B90B]"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 data-[state=active]:bg-[#F0B90B] data-[state=active]:text-[#0B0E11] text-[#F0B90B]"
            >
              <MessageCircle className="h-4 w-4" />
              Team Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracking" className="space-y-6">
            <UserTrackingPage selectedProduction={selectedProduction} />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <LocationMap selectedProduction={selectedProduction} />
            
            {selectedProduction && (
              <Card className="bg-[#0B0E11] border-[#F0B90B]">
                <CardHeader>
                  <CardTitle className="text-[#F0B90B]">Quick Actions</CardTitle>
                  <CardDescription className="text-gray-300">
                    Manage your location sharing and view team locations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      View Full Map
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
                    >
                      Export Locations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="work">
            <WorkHistory selectedProduction={selectedProduction} />
          </TabsContent>

          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>

          <TabsContent value="chat">
            <TeamChat selectedProduction={selectedProduction} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
