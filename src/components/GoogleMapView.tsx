
import React, { useEffect, useRef } from 'react';

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  user_name: string;
  is_current_user: boolean;
}

interface GoogleMapViewProps {
  locations: Location[];
  center?: { lat: number; lng: number };
}

export const GoogleMapView = ({ locations, center }: GoogleMapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map
    const defaultCenter = center || { lat: 40.7128, lng: -74.0060 }; // NYC default
    
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      zoom: 10,
      center: defaultCenter,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          "elementType": "geometry",
          "stylers": [{"color": "#1d2c4d"}]
        },
        {
          "elementType": "labels.text.fill",
          "stylers": [{"color": "#8ec3b9"}]
        },
        {
          "elementType": "labels.text.stroke",
          "stylers": [{"color": "#1a3646"}]
        }
      ]
    });

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [center]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    locations.forEach(location => {
      const marker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: mapInstanceRef.current,
        title: location.user_name,
        icon: {
          url: location.is_current_user 
            ? 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23F0B90B"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/%3E%3C/svg%3E'
            : 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23FF4444"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="color: #333; padding: 8px;">
            <strong>${location.user_name}</strong>
            ${location.is_current_user ? '<br><span style="color: #F0B90B;">You</span>' : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Adjust map bounds to fit all markers
    if (locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach(location => {
        bounds.extend(new google.maps.LatLng(location.latitude, location.longitude));
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [locations]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-96 rounded-lg border border-[#2B3139]"
      style={{ minHeight: '400px' }}
    />
  );
};
