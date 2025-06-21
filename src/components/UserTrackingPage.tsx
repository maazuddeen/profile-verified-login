
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Clock, RefreshCw, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserLocation {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  grid_reference: string | null;
  is_sharing: boolean;
  last_updated: string;
  user_profile?: {
    full_name: string;
  } | null;
}

interface UserTrackingPageProps {
  selectedProduction: string | null;
}

export const UserTrackingPage = ({ selectedProduction }: UserTrackingPageProps) => {
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProduction) {
      fetchUserLocations();
      const interval = setInterval(fetchUserLocations, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [selectedProduction]);

  useEffect(() => {
    if (selectedProduction) {
      subscribeToLocationUpdates();
    }
  }, [selectedProduction]);

  const fetchUserLocations = async () => {
    if (!selectedProduction) return;

    setLoading(true);
    try {
      // First get location shares
      const { data: locationData, error: locationError } = await supabase
        .from('location_shares')
        .select('*')
        .eq('production_id', selectedProduction)
        .order('last_updated', { ascending: false });

      if (locationError) throw locationError;

      // Then get profiles for each user
      const locationsWithProfiles = await Promise.all(
        (locationData || []).map(async (location) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', location.user_id)
            .single();

          return {
            ...location,
            user_profile: profileData
          };
        })
      );

      setUserLocations(locationsWithProfiles);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching user locations:', error);
      toast({
        title: "Error",
        description: "Failed to load user locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLocationUpdates = () => {
    if (!selectedProduction) return;

    const channel = supabase
      .channel('user-tracking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_shares',
          filter: `production_id=eq.${selectedProduction}`,
        },
        (payload) => {
          console.log('Real-time location update:', payload);
          fetchUserLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (location: UserLocation) => {
    if (!location.is_sharing) return 'bg-gray-500';
    
    const lastUpdate = new Date(location.last_updated);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff < 5) return 'bg-green-500'; // Online
    if (minutesDiff < 30) return 'bg-yellow-500'; // Recently active
    return 'bg-red-500'; // Offline
  };

  const getStatusText = (location: UserLocation) => {
    if (!location.is_sharing) return 'Not sharing';
    
    const lastUpdate = new Date(location.last_updated);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff < 5) return 'Online';
    if (minutesDiff < 30) return 'Recently active';
    return 'Offline';
  };

  const formatLastSeen = (timestamp: string) => {
    const lastUpdate = new Date(timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    const hoursDiff = Math.floor(minutesDiff / 60);

    if (minutesDiff < 1) return 'Just now';
    if (minutesDiff < 60) return `${minutesDiff}m ago`;
    if (hoursDiff < 24) return `${hoursDiff}h ago`;
    return lastUpdate.toLocaleDateString();
  };

  if (!selectedProduction) {
    return (
      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Users className="h-12 w-12 text-[#F0B90B] mx-auto mb-4" />
            <p className="text-[#F0B90B]">Select a production to track team members</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[#F0B90B]">
              <Navigation className="h-5 w-5" />
              Real-Time User Tracking
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#F0B90B]">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUserLocations}
                disabled={loading}
                className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && userLocations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F0B90B]"></div>
            </div>
          ) : userLocations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-[#F0B90B] mx-auto mb-4" />
              <p className="text-[#F0B90B]">No team members found in this production</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userLocations.map((location) => (
                <Card key={location.id} className="bg-[#1E2329] border-[#2B3139]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(location)}`}
                        />
                        <span className="font-medium text-[#F0B90B]">
                          {location.user_profile?.full_name || 'Unknown User'}
                        </span>
                      </div>
                      {location.user_id === user?.id && (
                        <Badge variant="secondary" className="bg-[#F0B90B] text-[#0B0E11]">
                          You
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-[#F0B90B]">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(location)}`} />
                        <span>{getStatusText(location)}</span>
                      </div>
                      
                      {location.grid_reference && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="h-4 w-4" />
                          <span>Grid: {location.grid_reference}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4" />
                        <span>Last seen: {formatLastSeen(location.last_updated)}</span>
                      </div>
                      
                      {location.latitude && location.longitude && (
                        <div className="text-xs text-gray-400 mt-2">
                          Lat: {location.latitude.toFixed(6)}, 
                          Lng: {location.longitude.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardHeader>
          <CardTitle className="text-[#F0B90B]">Tracking Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-[#1E2329] p-4 rounded-lg border border-[#2B3139]">
              <div className="text-2xl font-bold text-green-500">
                {userLocations.filter(l => l.is_sharing && getStatusColor(l) === 'bg-green-500').length}
              </div>
              <div className="text-sm text-[#F0B90B]">Online</div>
            </div>
            <div className="bg-[#1E2329] p-4 rounded-lg border border-[#2B3139]">
              <div className="text-2xl font-bold text-yellow-500">
                {userLocations.filter(l => l.is_sharing && getStatusColor(l) === 'bg-yellow-500').length}
              </div>
              <div className="text-sm text-[#F0B90B]">Recently Active</div>
            </div>
            <div className="bg-[#1E2329] p-4 rounded-lg border border-[#2B3139]">
              <div className="text-2xl font-bold text-red-500">
                {userLocations.filter(l => l.is_sharing && getStatusColor(l) === 'bg-red-500').length}
              </div>
              <div className="text-sm text-[#F0B90B]">Offline</div>
            </div>
            <div className="bg-[#1E2329] p-4 rounded-lg border border-[#2B3139]">
              <div className="text-2xl font-bold text-gray-500">
                {userLocations.filter(l => !l.is_sharing).length}
              </div>
              <div className="text-sm text-[#F0B90B]">Not Sharing</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
