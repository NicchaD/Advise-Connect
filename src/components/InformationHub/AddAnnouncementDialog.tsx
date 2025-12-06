import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
}

interface AddAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAnnouncement?: Announcement | null;
  onSuccess: () => void;
}

const AddAnnouncementDialog = ({ open, onOpenChange, editingAnnouncement, onSuccess }: AddAnnouncementDialogProps) => {
  const [formData, setFormData] = useState({
    type: '' as 'Broadcast' | 'Webinar' | '',
    title: '',
    description: '',
    invitation: '',
    date: undefined as Date | undefined,
    time: '',
    meeting_invite_link: '',
    guest_speaker: '',
    advisory_services: [] as string[],
    advisory_service: '' as string,
    advisory_speakers: [] as string[]
  });

  const [advisoryServices, setAdvisoryServices] = useState<any[]>([]);
  const [advisoryTeamMembers, setAdvisoryTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        type: editingAnnouncement.type,
        title: editingAnnouncement.title,
        description: editingAnnouncement.description || '',
        invitation: editingAnnouncement.invitation || '',
        date: editingAnnouncement.date ? new Date(editingAnnouncement.date) : undefined,
        time: editingAnnouncement.time || '',
        meeting_invite_link: editingAnnouncement.meeting_invite_link || '',
        guest_speaker: editingAnnouncement.guest_speaker || '',
        advisory_services: editingAnnouncement.advisory_services || [],
        advisory_service: editingAnnouncement.advisory_speakers?.[0] || '',
        advisory_speakers: editingAnnouncement.advisory_speakers?.slice(1) || []
      });
    } else {
      resetForm();
    }
  }, [editingAnnouncement, open]);

  const fetchDropdownData = async () => {
    const [servicesResult, teamResult] = await Promise.all([
      supabase.from('advisory_services').select('*').eq('is_active', true).order('display_order'),
      supabase.rpc('get_team_members_basic_info')
    ]);

    if (servicesResult.data) setAdvisoryServices(servicesResult.data);
    if (teamResult.data && Array.isArray(teamResult.data)) setAdvisoryTeamMembers(teamResult.data);
  };

  const resetForm = () => {
    setFormData({
      type: '',
      title: '',
      description: '',
      invitation: '',
      date: undefined,
      time: '',
      meeting_invite_link: '',
      guest_speaker: '',
      advisory_services: [],
      advisory_service: '',
      advisory_speakers: []
    });
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      advisory_services: prev.advisory_services.includes(serviceId)
        ? prev.advisory_services.filter(id => id !== serviceId)
        : [...prev.advisory_services, serviceId]
    }));
  };

  const handleServiceSelect = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      advisory_service: serviceId,
      advisory_speakers: [] // Reset speakers when service changes
    }));
  };

  const handleSpeakerToggle = (speakerId: string) => {
    setFormData(prev => ({
      ...prev,
      advisory_speakers: prev.advisory_speakers.includes(speakerId)
        ? prev.advisory_speakers.filter(id => id !== speakerId)
        : [...prev.advisory_speakers, speakerId]
    }));
  };

  // Filter team members based on selected advisory service
  const filteredTeamMembers = advisoryTeamMembers.filter(member => 
    formData.advisory_service && member.advisory_services?.includes(formData.advisory_service)
  );

  const isFormValid = () => {
    if (!formData.type || !formData.title) return false;
    
    if (formData.type === 'Broadcast') {
      return formData.description && formData.advisory_services.length > 0;
    }
    
    if (formData.type === 'Webinar') {
      return formData.invitation && formData.date && formData.time && 
             formData.advisory_service && formData.meeting_invite_link;
    }
    
    return false;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create announcements",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const submissionData = {
      type: formData.type,
      title: formData.title,
      description: formData.type === 'Broadcast' ? formData.description : null,
      invitation: formData.type === 'Webinar' ? formData.invitation : null,
      date: formData.type === 'Webinar' && formData.date ? formData.date.toISOString().split('T')[0] : null,
      time: formData.type === 'Webinar' ? formData.time : null,
      meeting_invite_link: formData.type === 'Webinar' ? formData.meeting_invite_link : null,
      guest_speaker: formData.type === 'Webinar' ? formData.guest_speaker : null,
      advisory_services: formData.type === 'Broadcast' ? formData.advisory_services : null,
      advisory_speakers: formData.type === 'Webinar' ? [formData.advisory_service, ...formData.advisory_speakers].filter(Boolean) : null,
      created_by: user.id
    };

    const { error } = editingAnnouncement
      ? await supabase.from('announcements').update(submissionData).eq('id', editingAnnouncement.id)
      : await supabase.from('announcements').insert([submissionData]);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Announcement ${editingAnnouncement ? 'updated' : 'created'} successfully`,
      });
      
      // Create calendar event for webinars
      if (formData.type === 'Webinar' && formData.date && !editingAnnouncement) {
        await supabase.from('calendar_events').insert([{
          event_title: formData.title,
          event_date: formData.date.toISOString().split('T')[0],
          created_by: user.id
        }]);
      }
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    }

    setLoading(false);
  };

  const renderTimeSelector = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    return (
      <div className="flex gap-2">
        <Select value={formData.time.split(':')[0] || ''} onValueChange={(hour) => {
          const minute = formData.time.split(':')[1] || '00';
          setFormData(prev => ({ ...prev, time: `${hour}:${minute}` }));
        }}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="Hr" />
          </SelectTrigger>
          <SelectContent>
            {hours.map(hour => (
              <SelectItem key={hour} value={hour}>{hour}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center">:</span>
        <Select value={formData.time.split(':')[1] || ''} onValueChange={(minute) => {
          const hour = formData.time.split(':')[0] || '00';
          setFormData(prev => ({ ...prev, time: `${hour}:${minute}` }));
        }}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map(minute => (
              <SelectItem key={minute} value={minute}>{minute}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type of Announcement *</Label>
            <Select value={formData.type} onValueChange={(value: 'Broadcast' | 'Webinar') => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Broadcast">Broadcast</SelectItem>
                <SelectItem value="Webinar">Webinar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter title"
            />
          </div>

          {formData.type === 'Broadcast' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>

              <div className="space-y-2">
                <Label>Advisory Services *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {advisoryServices.map((service) => (
                    <label key={service.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.advisory_services.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="rounded"
                      />
                      <span>{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {formData.type === 'Webinar' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="invitation">Invitation *</Label>
                <Textarea
                  id="invitation"
                  value={formData.invitation}
                  onChange={(e) => setFormData(prev => ({ ...prev, invitation: e.target.value }))}
                  placeholder="Enter invitation text"
                />
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, date }));
                        setIsDatePickerOpen(false);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Time *</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {renderTimeSelector()}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Advisory Service *</Label>
                <Select value={formData.advisory_service} onValueChange={handleServiceSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select advisory service" />
                  </SelectTrigger>
                  <SelectContent>
                    {advisoryServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Advisory Speaker</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {filteredTeamMembers.length > 0 ? (
                    filteredTeamMembers.map((member) => (
                      <label key={member.id} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.advisory_speakers.includes(member.id)}
                          onChange={() => handleSpeakerToggle(member.id)}
                          className="rounded"
                        />
                        <span>{member.name}</span>
                      </label>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {formData.advisory_service ? "No team members available for this service" : "Select advisory service first"}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_speaker">Guest Speaker</Label>
                <Input
                  id="guest_speaker"
                  value={formData.guest_speaker}
                  onChange={(e) => setFormData(prev => ({ ...prev, guest_speaker: e.target.value }))}
                  placeholder="Enter guest speaker name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_invite_link">Meeting Invite Link *</Label>
                <Input
                  id="meeting_invite_link"
                  value={formData.meeting_invite_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_invite_link: e.target.value }))}
                  placeholder="Enter meeting URL"
                  type="url"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid() || loading}
            >
              {loading ? 'Saving...' : editingAnnouncement ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAnnouncementDialog;