import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ExternalLink, Calendar, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AddAnnouncementDialog from './AddAnnouncementDialog';
import ContentViewDialog from './ContentViewDialog';

interface Announcement {
  id: string;
  type: 'Broadcast' | 'Webinar';
  title: string;
  description?: string;
  invitation?: string;
  date?: string;
  time?: string;
  meeting_invite_link?: string;
  guest_speaker?: string;
  advisory_services?: string[];
  advisory_speakers?: string[];
  created_at: string;
}

interface KeyAnnouncementsProps {
  filters: {
    searchTerm: string;
    advisoryService: string;
    dateRange: string;
    type: string;
  };
}

const KeyAnnouncements = ({ filters }: KeyAnnouncementsProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [filters]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsAdmin(profile?.role === 'Admin');
    }
  };

  const fetchAnnouncements = async () => {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.searchTerm) {
      query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }
    
    if (filters.type && filters.type !== 'all' && (filters.type === 'Broadcast' || filters.type === 'Webinar')) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch announcements",
        variant: "destructive",
      });
    } else {
      setAnnouncements((data || []) as Announcement[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      fetchAnnouncements();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div>Loading announcements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Key Announcements</h2>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No announcements found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className="group hover:shadow-lg transition-shadow cursor-pointer relative"
              onClick={() => setSelectedAnnouncement(announcement)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant={announcement.type === 'Broadcast' ? 'default' : 'secondary'}>
                    {announcement.type}
                  </Badge>
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAnnouncement(announcement);
                          setShowAddDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(announcement.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg">{announcement.title}</CardTitle>
                {announcement.description && (
                  <CardDescription className="line-clamp-2">
                    {announcement.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  {announcement.type === 'Webinar' && (
                    <>
                      {announcement.date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(announcement.date)}
                        </div>
                      )}
                      {announcement.time && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTime(announcement.time)}
                        </div>
                      )}
                      {announcement.guest_speaker && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {announcement.guest_speaker}
                        </div>
                      )}
                      {announcement.meeting_invite_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(announcement.meeting_invite_link, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Join Meeting
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddAnnouncementDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        editingAnnouncement={editingAnnouncement}
        onSuccess={() => {
          fetchAnnouncements();
          setEditingAnnouncement(null);
        }}
      />

      {selectedAnnouncement && (
        <ContentViewDialog
          open={!!selectedAnnouncement}
          onOpenChange={() => setSelectedAnnouncement(null)}
          content={selectedAnnouncement}
          contentType="announcement"
        />
      )}
    </div>
  );
};

export default KeyAnnouncements;