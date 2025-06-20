
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Star, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  productions?: {
    name: string;
  } | null;
  rated_by_profile?: {
    full_name: string;
  } | null;
}

export const UserProfile = () => {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRatings();
  }, []);

  const fetchUserRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ratings')
        .select(`
          *,
          productions(name),
          profiles!user_ratings_rated_by_fkey(full_name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user ratings:', error);
        // Fallback without profiles join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_ratings')
          .select(`
            *,
            productions(name)
          `)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        setRatings(fallbackData || []);
      } else {
        setRatings(data || []);
      }
    } catch (error) {
      console.error('Error fetching user ratings:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setPasswords({ current: '', new: '', confirm: '' });
      setShowPasswordDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
    : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#F0B90B]">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-[#F0B90B]">Full Name</Label>
              <p className="text-lg text-gray-300">{user?.user_metadata?.full_name || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-[#F0B90B]">Email</Label>
              <p className="text-gray-300">{user?.email}</p>
            </div>
            <div>
              <Label className="text-[#F0B90B]">Phone Number</Label>
              <p className="text-gray-300">{user?.user_metadata?.phone_number || 'Not set'}</p>
            </div>
            
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-[#F0B90B] text-[#F0B90B] hover:bg-[#F0B90B] hover:text-[#0B0E11]"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1E2329] border-[#F0B90B]">
                <DialogHeader>
                  <DialogTitle className="text-[#F0B90B]">Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password" className="text-[#F0B90B]">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                      className="bg-[#0B0E11] border-[#2B3139] text-[#F0B90B]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password" className="text-[#F0B90B]">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                      className="bg-[#0B0E11] border-[#2B3139] text-[#F0B90B]"
                    />
                  </div>
                  <Button 
                    onClick={handlePasswordChange} 
                    disabled={loading} 
                    className="w-full bg-[#F0B90B] text-[#0B0E11] hover:bg-[#F0B90B]/80"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#F0B90B]">
            <Star className="h-5 w-5" />
            My Ratings
            {ratings.length > 0 && (
              <Badge variant="secondary" className="bg-[#F0B90B] text-[#0B0E11]">
                {averageRating.toFixed(1)} ⭐
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-[#F0B90B] mx-auto mb-4" />
              <p className="text-[#F0B90B]">No ratings yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="p-4 border border-[#2B3139] rounded-lg bg-[#1E2329]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="border-[#F0B90B] text-[#F0B90B]"
                      >
                        {rating.productions?.name || 'Unknown Production'}
                      </Badge>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= rating.rating ? 'text-yellow-400 fill-current' : 'text-gray-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">
                      by {rating.rated_by_profile?.full_name || 'Unknown User'}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-gray-300">{rating.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
