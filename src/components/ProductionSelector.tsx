
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Production {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface ProductionSelectorProps {
  selectedProduction: string | null;
  onProductionChange: (productionId: string | null) => void;
}

export const ProductionSelector = ({ selectedProduction, onProductionChange }: ProductionSelectorProps) => {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProductionName, setNewProductionName] = useState('');
  const [newProductionDescription, setNewProductionDescription] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProductions();
  }, []);

  const fetchProductions = async () => {
    try {
      const { data, error } = await supabase
        .from('productions')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProductions(data || []);
    } catch (error) {
      console.error('Error fetching productions:', error);
      toast({
        title: "Error",
        description: "Failed to load productions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduction = async () => {
    if (!newProductionName.trim()) return;

    try {
      const { data: production, error: productionError } = await supabase
        .from('productions')
        .insert({
          name: newProductionName,
          description: newProductionDescription,
          created_by: user?.id,
        })
        .select()
        .single();

      if (productionError) throw productionError;

      // Add creator as admin
      const { error: membershipError } = await supabase
        .from('user_productions')
        .insert({
          user_id: user?.id,
          production_id: production.id,
          role: 'admin',
        });

      if (membershipError) throw membershipError;

      toast({
        title: "Success",
        description: "Production created successfully",
      });

      setNewProductionName('');
      setNewProductionDescription('');
      setShowCreateDialog(false);
      fetchProductions();
    } catch (error) {
      console.error('Error creating production:', error);
      toast({
        title: "Error",
        description: "Failed to create production",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label>Select Production</Label>
          <Select value={selectedProduction || ''} onValueChange={onProductionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a production..." />
            </SelectTrigger>
            <SelectContent>
              {productions.map((production) => (
                <SelectItem key={production.id} value={production.id}>
                  {production.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="mt-6">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Production</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Production Name</Label>
                <Input
                  id="name"
                  value={newProductionName}
                  onChange={(e) => setNewProductionName(e.target.value)}
                  placeholder="e.g., Film Project A"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={newProductionDescription}
                  onChange={(e) => setNewProductionDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
              <Button onClick={createProduction} className="w-full">
                Create Production
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
