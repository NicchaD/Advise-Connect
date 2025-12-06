import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import ContentViewDialog from './ContentViewDialog';

interface CalendarEvent {
  id: string;
  event_title: string;
  event_date: string;
  announcement_id?: string;
  created_at: string;
}

interface Announcement {
  id: string;
  type: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  meeting_invite_link?: string;
  guest_speaker?: string;
}

interface TrainingCalendarProps {
  filters: {
    searchTerm: string;
    advisoryService: string;
    dateRange: string;
    type: string;
  };
}

const TrainingCalendar = ({ filters }: TrainingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchEvents();
    fetchWebinarAnnouncements();
  }, []);

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

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch calendar events",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
  };

  const fetchWebinarAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('type', 'Webinar')
      .not('date', 'is', null)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching webinar announcements:', error);
    } else {
      setAnnouncements(data || []);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (isAdmin) {
      setShowAddEventDialog(true);
    }
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create events",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('calendar_events')
      .insert([{
        event_title: newEventTitle.trim(),
        event_date: selectedDate.toISOString().split('T')[0],
        created_by: user.id
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      fetchEvents();
      setShowAddEventDialog(false);
      setNewEventTitle('');
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const regularEvents = events.filter(event => event.event_date === dateStr);
    const webinarEvents = announcements.filter(announcement => 
      announcement.date === dateStr
    );
    
    return { regularEvents, webinarEvents };
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
  };

  const eventDates = [
    ...events.map(event => new Date(event.event_date)),
    ...announcements.filter(a => a.date).map(a => new Date(a.date!))
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Training Calendar</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendar View
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'Click on a date to add events' : 'View upcoming training events'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              onDayClick={isAdmin ? handleDateClick : undefined}
              modifiers={{
                hasEvent: eventDates
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: '50%'
                }
              }}
              className="pointer-events-auto"
            />
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? `Events for ${format(selectedDate, 'PPP')}` : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3">
                {(() => {
                  const { regularEvents, webinarEvents } = getEventsForDate(selectedDate);
                  
                  if (regularEvents.length === 0 && webinarEvents.length === 0) {
                    return (
                      <p className="text-muted-foreground text-center py-4">
                        No events scheduled for this date
                      </p>
                    );
                  }

                  return (
                    <>
                      {/* Regular Events */}
                      {regularEvents.map((event) => (
                        <div key={event.id} className="border rounded-lg p-3">
                          <h4 className="font-medium">{event.event_title}</h4>
                          <Badge variant="outline" className="mt-1">
                            Event
                          </Badge>
                        </div>
                      ))}

                      {/* Webinar Events */}
                      {webinarEvents.map((announcement) => (
                        <div 
                          key={announcement.id} 
                          className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleAnnouncementClick(announcement)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <Badge variant="secondary">Webinar</Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {announcement.time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {announcement.time}
                              </div>
                            )}
                            {announcement.guest_speaker && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {announcement.guest_speaker}
                              </div>
                            )}
                            {announcement.meeting_invite_link && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(announcement.meeting_invite_link, '_blank');
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Join Meeting
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Select a date to view events
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Event for {selectedDate && format(selectedDate, 'PPP')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddEventDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddEvent} 
                disabled={!newEventTitle.trim()}
              >
                Save Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement View Dialog */}
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

export default TrainingCalendar;