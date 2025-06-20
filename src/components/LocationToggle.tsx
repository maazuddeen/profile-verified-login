
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { coordsToGrid } from '@/utils/gridUtils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationToggleProps {
  selectedProduction: string | null;
}

export const LocationToggle = ({ selectedProduction }: LocationToggleProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { latitude, longitude, error: geoError } = useGeolocation();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProduction) {
      fetchLocationShareStatus();
    }
  }, [selectedProduction]);

  useEffect(() => {
    if (isSharing && latitude && longitude && selectedProduction) {
      updateLocation();
    }
  }, [latitude, longitude, isSharing, selectedProduction]);

  const fetchLocationShareStatus = async () => {
    if (!selectedProduction) return;

    try {
      const { data, error } = await supabase
        .from('location_shares')
        .select('is_sharing')
        .eq('user_id', user?.id)
        .eq('production_id', selectedProduction)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsSharing(data?.is_sharing || false);
    } catch (error) {
      console.error('Error fetching location share status:', error);
    }
  };

  const updateLocation = async () => {
    if (!latitude || !longitude || !selectedProduction) return;

    try {
      const gridRef = coordsToGrid(latitude, longitude);
      
      const { error } = await supabase
        .from('location_shares')
        .upsert({
          user_id: user?.id,
          production_id: selectedProduction,
          latitude,
          longitude,
          grid_reference: gridRef,
          is_sharing: isSharing,
          last_updated: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const toggleLocationSharing = async (enabled: boolean) => {
    if (!selectedProduction) {
      toast({
        title: "No Production Selected",
        description: "Please select a production before enabling location sharing",
        variant: "destructive",
      });
      return;
    }

    if (geoError) {
      toast({
        title: "Location Error",
        description: geoError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setIsSharing(enabled);

    try {
      if (enabled && latitude && longitude) {
        await updateLocation();
        toast({
          title: "Location Sharing Enabled",
          description: "Your location is now being shared with the team",
        });
      } else {
        const { error } = await supabase
          .from('location_shares')
          .upsert({
            user_id: user?.id,
            production_id: selectedProduction,
            is_sharing: false,
            last_updated: new Date().toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Location Sharing Disabled",
          description: "Your location is no longer being shared",
        });
      }
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      toast({
        title: "Error",
        description: "Failed to update location sharing",
        variant: "destructive",
      });
      setIsSharing(!enabled);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          {geoError ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <MapPin className="h-5 w-5 text-green-500" />
          )}
          <div>
            <Label htmlFor="location-toggle" className="text-base">
              Share Location
            </Label>
            <p className="text-sm text-gray-600">
              {selectedProduction ? 'Enable real-time location sharing' : 'Select a production first'}
            </p>
          </div>
        </div>
        
        <Switch
          id="location-toggle"
          checked={isSharing}
          onCheckedChange={toggleLocationSharing}
          disabled={!selectedProduction || loading || !!geoError}
        />
      </div>

      {latitude && longitude && (
        <div className="text-sm text-gray-600 text-center">
          Current position: {coordsToGrid(latitude, longitude)}
        </div>
      )}
    </div>
  );
};
