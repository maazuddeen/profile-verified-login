
// Convert lat/lng to grid reference (A:1, B:2, etc.)
export const coordsToGrid = (lat: number, lng: number): string => {
  // Simple grid system - adjust these values based on your area
  const latBase = Math.floor(lat * 1000) % 26;
  const lngBase = Math.floor(lng * 1000) % 99;
  
  const letter = String.fromCharCode(65 + latBase); // A-Z
  const number = lngBase + 1; // 1-99
  
  return `${letter}:${number}`;
};

// Convert grid reference back to approximate coords
export const gridToCoords = (grid: string): { lat: number; lng: number } | null => {
  const match = grid.match(/^([A-Z]):(\d+)$/);
  if (!match) return null;
  
  const letter = match[1];
  const number = parseInt(match[2]);
  
  const latBase = letter.charCodeAt(0) - 65;
  const lngBase = number - 1;
  
  return {
    lat: latBase / 1000,
    lng: lngBase / 1000,
  };
};
