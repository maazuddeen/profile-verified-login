
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Satellite, Map } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationShare {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  grid_reference: string | null;
  is_sharing: boolean;
  last_updated: string;
  profiles: {
    full_name: string;
  };
}

interface LocationMapProps {
  selectedProduction: string | null;
}

export const LocationMap = ({ selectedProduction }: LocationMapProps) => {
  const [locations, setLocations] = useState<LocationShare[]>([]);
  const [viewMode, setViewMode] = useState<'satellite' | 'standard'>('standard');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProduction) {
      fetchTeamLocations();
      subscribeToLocationUpdates();
    }
  }, [selectedProduction]);

  const fetchTeamLocations = async () => {
    if (!selectedProduction) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('location_shares')
        .select(`
          *,
          profiles!location_shares_user_id_fkey(full_name)
        `)
        .eq('production_id', selectedProduction)
        .eq('is_sharing', true);

      if (error) throw error;
      setLocations(data || []);
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
    if (!selectedProduction) return;

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
        () => {
          fetchTeamLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (!selectedProduction) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a production to view team locations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Team Locations
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'standard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('standard')}
            >
              <Map className="h-4 w-4 mr-1" />
              Standard
            </Button>
            <Button
              variant={viewMode === 'satellite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('satellite')}
            >
              <Satellite className="h-4 w-4 mr-1" />
              Satellite
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No team members are currently sharing their location</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{location.profiles.full_name}</span>
                    {location.user_id === user?.id && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Grid: {location.grid_reference || 'Unknown'}</p>
                    <p>
                      Last updated: {new Date(location.last_updated).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Map View ({viewMode})</h4>
              <p className="text-sm text-blue-700">
                Interactive map with {viewMode} view showing all team member locations.
                Real-time updates enabled.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
