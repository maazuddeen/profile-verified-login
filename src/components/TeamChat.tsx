
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Users, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  production_id: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    full_name: string;
  } | null;
  location_shares?: any[];
}

interface TeamChatProps {
  selectedProduction: string | null;
}

export const TeamChat = ({ selectedProduction }: TeamChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProduction) {
      fetchMessages();
      fetchTeamMembers();
      subscribeToMessages();
    }
  }, [selectedProduction]);

  const fetchMessages = async () => {
    if (!selectedProduction) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_user_id_fkey(full_name)
        `)
        .eq('production_id', selectedProduction)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        // Fallback without profiles join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('production_id', selectedProduction)
          .order('created_at', { ascending: true });

        if (fallbackError) throw fallbackError;
        setMessages(fallbackData || []);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!selectedProduction) return;

    try {
      const { data, error } = await supabase
        .from('user_productions')
        .select(`
          *,
          profiles!user_productions_user_id_fkey(full_name)
        `)
        .eq('production_id', selectedProduction);

      if (error) {
        console.error('Error fetching team members:', error);
        // Fallback without profiles join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_productions')
          .select('*')
          .eq('production_id', selectedProduction);

        if (fallbackError) throw fallbackError;
        setTeamMembers(fallbackData || []);
      } else {
        setTeamMembers(data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedProduction) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `production_id=eq.${selectedProduction}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProduction || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          production_id: selectedProduction,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!selectedProduction) {
    return (
      <Card className="bg-[#0B0E11] border-[#F0B90B]">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-[#F0B90B] mx-auto mb-4" />
            <p className="text-[#F0B90B]">Select a production to chat with your team</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat Messages */}
      <div className="lg:col-span-2">
        <Card className="bg-[#0B0E11] border-[#F0B90B]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#F0B90B]">
              <MessageCircle className="h-5 w-5" />
              Team Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-96 overflow-y-auto space-y-3 p-4 bg-[#1E2329] rounded-lg border border-[#2B3139]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F0B90B]"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[#F0B90B]">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg max-w-xs ${
                        message.user_id === user?.id
                          ? 'ml-auto bg-[#F0B90B] text-[#0B0E11]'
                          : 'bg-[#2B3139] text-[#F0B90B]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.user_id === user?.id 
                            ? 'You' 
                            : message.profiles?.full_name || 'Unknown User'
                          }
                        </span>
                        <span className="text-xs opacity-70">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1 bg-[#1E2329] border-[#2B3139] text-[#F0B90B] placeholder-gray-400"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-[#F0B90B] text-[#0B0E11] hover:bg-[#F0B90B]/80"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <div>
        <Card className="bg-[#0B0E11] border-[#F0B90B]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#F0B90B]">
              <Users className="h-5 w-5" />
              Team Members ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-[#1E2329] rounded-lg border border-[#2B3139]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#F0B90B]">
                        {member.profiles?.full_name || 'Unknown User'}
                      </span>
                      {member.user_id === user?.id && (
                        <Badge variant="secondary" className="bg-[#F0B90B] text-[#0B0E11]">
                          You
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-xs border-[#F0B90B] text-[#F0B90B]"
                    >
                      {member.role}
                    </Badge>
                  </div>
                  <MapPin className="h-4 w-4 text-[#F0B90B]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
