import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, RefreshCw } from 'lucide-react';
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
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProductionName, setNewProductionName] = useState('');
  const [newProductionDescription, setNewProductionDescription] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProductions();
    }
  }, [user]);

  const fetchProductions = async () => {
    if (!user) {
      console.log('No user found, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching productions for user:', user.id);
      
      // Get all active productions (simplified to avoid RLS issues)
      const { data: allProductions, error: allError } = await supabase
        .from('productions')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (allError) {
        console.error('Error fetching productions:', allError);
        throw allError;
      }

      console.log('Fetched productions:', allProductions);
      setProductions(allProductions || []);
    } catch (error) {
      console.error('Error in fetchProductions:', error);
      toast({
        title: "Error",
        description: "Failed to load productions. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduction = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a production",
        variant: "destructive",
      });
      return;
    }

    if (!newProductionName.trim()) {
      toast({
        title: "Error",
        description: "Production name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      console.log('Creating production with user:', user.id);
      
      // Create the production with proper record keeping
      const { data: production, error: productionError } = await supabase
        .from('productions')
        .insert({
          name: newProductionName.trim(),
          description: newProductionDescription.trim() || null,
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (productionError) {
        console.error('Production creation error:', productionError);
        throw productionError;
      }

      console.log('Production created successfully:', production);

      // Create user_productions record for proper membership tracking
      const { error: membershipError } = await supabase
        .from('user_productions')
        .insert({
          user_id: user.id,
          production_id: production.id,
          role: 'admin',
        });

      if (membershipError) {
        console.error('Membership creation error:', membershipError);
        // Don't throw here, production was created successfully
      }

      toast({
        title: "Success",
        description: `Production "${production.name}" created successfully! You can now enable location sharing.`,
      });

      // Reset form and close dialog
      setNewProductionName('');
      setNewProductionDescription('');
      setShowCreateDialog(false);
      
      // Refresh the productions list
      await fetchProductions();
      
      // Auto-select the new production
      onProductionChange(production.id);

      // Log for debugging
      console.log('Production created and selected:', production.id);
    } catch (error: any) {
      console.error('Error creating production:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create production. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-2">
        <Label className="text-[#F0B90B]">Select Production</Label>
        <div className="p-4 bg-[#1E2329] border border-[#F0B90B] rounded-lg text-center">
          <p className="text-[#F0B90B]">Please log in to access productions</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-[#F0B90B]">Select Production</Label>
        <div className="animate-pulse bg-[#2B3139] h-10 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-[#F0B90B]">Select Production</Label>
          <Select value={selectedProduction || ''} onValueChange={onProductionChange}>
            <SelectTrigger className="bg-[#0B0E11] border-[#2B3139] text-[#F0B90B]">
              <SelectValue placeholder={
                productions.length === 0 
                  ? "No productions available - create one first" 
                  : "Choose a production..."
              } />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2329] border-[#2B3139]">
              {productions.map((production) => (
                <SelectItem key={production.id} value={production.id} className="text-[#F0B90B] focus:bg-[#F0B90B] focus:text-[#0B0E11]">
                  {production.name}
                  {production.description && (
                    <span className="text-xs text-gray-400 ml-2">
                      - {production.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="mt-6 border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
          onClick={fetchProductions}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="mt-6 border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1E2329] border-[#F0B90B]">
            <DialogHeader>
              <DialogTitle className="text-[#F0B90B]">Create New Production</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#F0B90B]">Production Name *</Label>
                <Input
                  id="name"
                  value={newProductionName}
                  onChange={(e) => setNewProductionName(e.target.value)}
                  placeholder="e.g., Film Project A"
                  disabled={creating}
                  className="bg-[#0B0E11] border-[#2B3139] text-[#F0B90B]"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-[#F0B90B]">Description (Optional)</Label>
                <Input
                  id="description"
                  value={newProductionDescription}
                  onChange={(e) => setNewProductionDescription(e.target.value)}
                  placeholder="Brief description..."
                  disabled={creating}
                  className="bg-[#0B0E11] border-[#2B3139] text-[#F0B90B]"
                />
              </div>
              <Button 
                onClick={createProduction} 
                className="w-full bg-[#F0B90B] text-[#0B0E11] hover:bg-[#F0B90B]/80"
                disabled={creating || !newProductionName.trim()}
              >
                {creating ? 'Creating...' : 'Create Production'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {productions.length === 0 && !loading && (
        <div className="text-center p-4 bg-[#1E2329] border border-[#F0B90B] rounded-lg">
          <p className="text-sm text-[#F0B90B]">
            No productions found. Create your first production to get started!
          </p>
        </div>
      )}
    </div>
  );
};
