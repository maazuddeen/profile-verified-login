
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkEntryForm } from './WorkEntryForm';
import { Clock, MapPin, Calendar } from 'lucide-react';

interface WorkEntry {
  id: string;
  date: string;
  location: string | null;
  grid_reference: string | null;
  notes: string | null;
  hours_worked: number | null;
  created_at: string;
  productions: {
    name: string;
  };
}

interface WorkHistoryProps {
  selectedProduction: string | null;
}

export const WorkHistory = ({ selectedProduction }: WorkHistoryProps) => {
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (selectedProduction) {
      fetchWorkEntries();
    }
  }, [selectedProduction]);

  const fetchWorkEntries = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('work_entries')
        .select(`
          *,
          productions!inner(name)
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (selectedProduction) {
        query.eq('production_id', selectedProduction);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorkEntries(data || []);
    } catch (error) {
      console.error('Error fetching work entries:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            My Production Work
          </CardTitle>
          <WorkEntryForm 
            selectedProduction={selectedProduction} 
            onWorkAdded={fetchWorkEntries}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : workEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No work entries found</p>
            <p className="text-sm text-gray-500">Add your first work entry to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workEntries.map((entry) => (
              <div key={entry.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                      <Badge variant="outline">{entry.productions.name}</Badge>
                    </div>
                    {entry.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {entry.location}
                        {entry.grid_reference && ` (${entry.grid_reference})`}
                      </div>
                    )}
                  </div>
                  {entry.hours_worked && (
                    <Badge variant="secondary">
                      {entry.hours_worked}h
                    </Badge>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-sm text-gray-700 mt-2">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
