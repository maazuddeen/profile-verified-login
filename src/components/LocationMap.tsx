import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Map, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMapView } from './GoogleMapView';

interface LocationShare {
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

interface LocationMapProps {
  selectedProduction: string | null;
}

export const LocationMap = ({ selectedProduction }: LocationMapProps) => {
  const [locations, setLocations] = useState<LocationShare[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTeamLocations = async () => {
    if (!selectedProduction) return;

    setLoading(true);
    try {
      console.log('Fetching team locations for production:', selectedProduction);
      
      const { data: locationData, error: locationError } = await supabase
        .from('location_shares')
        .select('*')
        .eq('production_id', selectedProduction)
        .eq('is_sharing', true);

      if (locationError) throw locationError;

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

      console.log('Team locations with profiles:', locationsWithProfiles);
      setLocations(locationsWithProfiles);
    } catch (error) {
      console.error('Error fetching team locations:', error);
      toast({
        title: "Error",
        description: "Failed to load team locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLocationUpdates = () => {
    if (!selectedProduction) return () => {};

    console.log('Subscribing to location updates for production:', selectedProduction);
    
    const channel = supabase
      .channel('location-updates')
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
          fetchTeamLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (selectedProduction) {
      fetchTeamLocations();
      const unsubscribe = subscribeToLocationUpdates();
      return unsubscribe;
    }
  }, [selectedProduction]);

  // Prepare data for Google Maps
  const mapLocations = locations
    .filter(loc => loc.latitude && loc.longitude && loc.is_sharing)
    .map(loc => ({
      id: loc.id,
      latitude: loc.latitude!,
      longitude: loc.longitude!,
      user_name: loc.user_profile?.full_name || 'Unknown User',
      is_current_user: loc.user_id === user?.id
    }));

  if (!selectedProduction) {
    return (
      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-[#F0B90B] mx-auto mb-4" />
            <p className="text-[#F0B90B]">Select a production to view team locations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0B0E11] border-[#F0B90B]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#F0B90B]">
            <Globe className="h-5 w-5" />
            Team Locations ({mapLocations.length} active)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
            >
              <Map className="h-4 w-4 mr-1" />
              Map
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
            >
              <Users className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F0B90B]"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-[#F0B90B] mx-auto mb-4" />
            <p className="text-[#F0B90B]">No team members are currently sharing their location</p>
            <p className="text-sm text-gray-400 mt-2">
              Enable location sharing to see your team on the map
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'map' ? (
              <GoogleMapView locations={mapLocations} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="p-4 border border-[#2B3139] rounded-lg bg-[#1E2329]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#F0B90B]">
                        {location.user_profile?.full_name || 'Unknown User'}
                      </span>
                      {location.user_id === user?.id && (
                        <Badge variant="secondary" className="bg-[#F0B90B] text-[#0B0E11]">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-300">
                      <p>Grid: {location.grid_reference || 'Unknown'}</p>
                      <p>
                        Last updated: {new Date(location.last_updated).toLocaleTimeString()}
                      </p>
                      {location.latitude && location.longitude && (
                        <p className="text-xs mt-1 text-gray-400">
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
