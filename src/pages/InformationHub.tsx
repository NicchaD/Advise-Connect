import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KeyAnnouncements from '@/components/InformationHub/KeyAnnouncements';
import KnowledgeArticles from '@/components/InformationHub/KnowledgeArticles';
import TrainingCalendar from '@/components/InformationHub/TrainingCalendar';
import InfoHubFilters from '@/components/InformationHub/InfoHubFilters';

const InformationHub = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('announcements');
  const [filters, setFilters] = useState({
    searchTerm: '',
    advisoryService: 'all',
    dateRange: 'all',
    type: 'all'
  });

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Information Hub</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Filters Section */}
          <div className="w-64 shrink-0">
            <InfoHubFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="announcements">Key Announcements</TabsTrigger>
                <TabsTrigger value="articles">Knowledge Articles</TabsTrigger>
                <TabsTrigger value="calendar">Training Calendar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="announcements" className="mt-6">
                <KeyAnnouncements filters={filters} />
              </TabsContent>
              
              <TabsContent value="articles" className="mt-6">
                <KnowledgeArticles filters={filters} />
              </TabsContent>
              
              <TabsContent value="calendar" className="mt-6">
                <TrainingCalendar filters={filters} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationHub;