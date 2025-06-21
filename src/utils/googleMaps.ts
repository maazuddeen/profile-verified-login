
let isGoogleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  if (isGoogleMapsLoaded) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // For now, we'll simulate Google Maps being available
    // In a real app, you would load the actual Google Maps script
    console.log('Google Maps would be loaded here with API key');
    
    // Mock Google Maps API for demonstration
    (window as any).google = {
      maps: {
        Map: class MockMap {
          constructor(element: HTMLElement, options: any) {
            console.log('Mock Google Map initialized', options);
            element.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #1E2329; border-radius: 8px;">
                <div style="text-align: center; color: #F0B90B;">
                  <h3>Google Maps Integration Ready</h3>
                  <p style="color: #888; margin-top: 8px;">Add your Google Maps API key to enable real maps</p>
                </div>
              </div>
            `;
          }
          fitBounds() {}
        },
        Marker: class MockMarker {
          constructor(options: any) {
            console.log('Mock marker created', options);
          }
          setMap() {}
          addListener() {}
        },
        InfoWindow: class MockInfoWindow {
          constructor(options: any) {
            console.log('Mock info window created', options);
          }
          open() {}
        },
        LatLngBounds: class MockLatLngBounds {
          extend() {}
        },
        LatLng: class MockLatLng {
          constructor(lat: number, lng: number) {
            console.log('Mock LatLng created', lat, lng);
          }
        },
        Size: class MockSize {
          constructor(width: number, height: number) {
            console.log('Mock Size created', width, height);
          }
        },
        MapTypeId: {
          ROADMAP: 'roadmap'
        }
      }
    };

    isGoogleMapsLoaded = true;
    resolve();
  });

  return googleMapsPromise;
};
