
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { coordsToGrid } from '@/utils/gridUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkEntryFormProps {
  selectedProduction: string | null;
  onWorkAdded: () => void;
}

export const WorkEntryForm = ({ selectedProduction, onWorkAdded }: WorkEntryFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
    hoursWorked: '',
  });
  
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduction) {
      toast({
        title: "No Production Selected",
        description: "Please select a production first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const gridRef = latitude && longitude ? coordsToGrid(latitude, longitude) : null;
      
      const { error } = await supabase
        .from('work_entries')
        .insert({
          user_id: user?.id,
          production_id: selectedProduction,
          date: formData.date,
          location: formData.location,
          latitude,
          longitude,
          grid_reference: gridRef,
          notes: formData.notes,
          hours_worked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Work entry added successfully",
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        location: '',
        notes: '',
        hoursWorked: '',
      });
      setOpen(false);
      onWorkAdded();
    } catch (error) {
      console.error('Error adding work entry:', error);
      toast({
        title: "Error",
        description: "Failed to add work entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Work Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Work Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Work location description"
            />
            {latitude && longitude && (
              <p className="text-sm text-gray-600 mt-1">
                Current grid: {coordsToGrid(latitude, longitude)}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="hours">Hours Worked</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              value={formData.hoursWorked}
              onChange={(e) => setFormData(prev => ({ ...prev, hoursWorked: e.target.value }))}
              placeholder="8.0"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Work details, accomplishments, etc."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
