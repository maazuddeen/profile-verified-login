
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { coordsToGrid } from '@/utils/gridUtils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationToggleProps {
  selectedProduction: string | null;
}

export const LocationToggle = ({ selectedProduction }: LocationToggleProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastKnownLocation, setLastKnownLocation] = useState<{lat: number, lng: number} | null>(null);
  const { user } = useAuth();
  const { latitude, longitude, error: geoError } = useGeolocation();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProduction && user) {
      fetchLocationShareStatus();
    } else {
      setIsSharing(false);
    }
  }, [selectedProduction, user]);

  useEffect(() => {
    if (isSharing && latitude && longitude && selectedProduction) {
      updateLocation();
      setLastKnownLocation({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude, isSharing, selectedProduction]);

  const fetchLocationShareStatus = async () => {
    if (!selectedProduction || !user) return;

    try {
      console.log('Fetching location share status for:', { userId: user.id, productionId: selectedProduction });
      
      const { data, error } = await supabase
        .from('location_shares')
        .select('is_sharing, latitude, longitude')
        .eq('user_id', user.id)
        .eq('production_id', selectedProduction)
        .maybeSingle();

      if (error) {
        console.error('Error fetching location share status:', error);
        return;
      }

      console.log('Location share status:', data);
      setIsSharing(data?.is_sharing || false);
      
      if (data?.latitude && data?.longitude) {
        setLastKnownLocation({ lat: data.latitude, lng: data.longitude });
      }
    } catch (error) {
      console.error('Error in fetchLocationShareStatus:', error);
    }
  };

  const updateLocation = async () => {
    if (!latitude || !longitude || !selectedProduction || !user) return;

    try {
      const gridRef = coordsToGrid(latitude, longitude);
      
      console.log('Updating location:', { 
        userId: user.id, 
        productionId: selectedProduction, 
        lat: latitude, 
        lng: longitude, 
        grid: gridRef 
      });
      
      const { error } = await supabase
        .from('location_shares')
        .upsert({
          user_id: user.id,
          production_id: selectedProduction,
          latitude,
          longitude,
          grid_reference: gridRef,
          is_sharing: isSharing,
          last_updated: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating location:', error);
        throw error;
      }

      console.log('Location updated successfully');
    } catch (error) {
      console.error('Error in updateLocation:', error);
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

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enable location sharing",
        variant: "destructive",
      });
      return;
    }

    if (enabled && geoError) {
      toast({
        title: "Location Error",
        description: geoError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('Toggling location sharing:', enabled);

    try {
      if (enabled) {
        // Enabling location sharing
        if (latitude && longitude) {
          setIsSharing(true);
          await updateLocation();
          toast({
            title: "Location Sharing Enabled",
            description: "Your location is now being shared with the team",
            variant: "default",
          });
        } else {
          throw new Error("Location not available yet. Please wait a moment and try again.");
        }
      } else {
        // Disabling location sharing
        setIsSharing(false);
        
        const { error } = await supabase
          .from('location_shares')
          .upsert({
            user_id: user.id,
            production_id: selectedProduction,
            is_sharing: false,
            last_updated: new Date().toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Location Sharing Disabled",
          description: "Your location is no longer being shared",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('Error toggling location sharing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update location sharing",
        variant: "destructive",
      });
      
      // Revert the state if there was an error
      setIsSharing(!enabled);
    } finally {
      setLoading(false);
    }
  };

  const getLocationStatus = () => {
    if (!selectedProduction) return { icon: AlertTriangle, color: "text-gray-500", text: "No production selected" };
    if (geoError) return { icon: AlertTriangle, color: "text-red-500", text: "Location access denied" };
    if (!latitude || !longitude) return { icon: MapPin, color: "text-yellow-500", text: "Getting location..." };
    if (isSharing) return { icon: CheckCircle, color: "text-green-500", text: "Location sharing active" };
    return { icon: MapPin, color: "text-blue-500", text: "Location ready" };
  };

  const status = getLocationStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border border-[#2B3139] rounded-lg bg-[#1E2329]">
        <div className="flex items-center space-x-3">
          <StatusIcon className={`h-5 w-5 ${status.color}`} />
          <div>
            <Label htmlFor="location-toggle" className="text-base text-[#F0B90B]">
              Share Location
            </Label>
            <p className="text-sm text-gray-400">
              {status.text}
            </p>
          </div>
        </div>
        
        <Switch
          id="location-toggle"
          checked={isSharing}
          onCheckedChange={toggleLocationSharing}
          disabled={!selectedProduction || loading || !!geoError || !user}
        />
      </div>

      {(latitude && longitude) && (
        <div className="text-sm text-gray-400 text-center p-2 bg-[#1E2329] border border-[#2B3139] rounded">
          <span className="text-[#F0B90B]">Current Grid Reference:</span> {coordsToGrid(latitude, longitude)}
          <br />
          <span className="text-xs">Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}</span>
        </div>
      )}

      {isSharing && selectedProduction && (
        <div className="text-sm text-green-400 text-center p-2 bg-[#1E2329] border border-green-500 rounded">
          ✓ Location is being shared with the production team
        </div>
      )}
    </div>
  );
};
