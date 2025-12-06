import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Filters {
  searchTerm: string;
  advisoryService: string;
  dateRange: string;
  type: string;
}

interface InfoHubFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const InfoHubFilters = ({ filters, onFiltersChange }: InfoHubFiltersProps) => {
  const [advisoryServices, setAdvisoryServices] = useState<any[]>([]);

  useEffect(() => {
    fetchAdvisoryServices();
  }, []);

  const fetchAdvisoryServices = async () => {
    const { data } = await supabase
      .from('advisory_services')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (data) {
      setAdvisoryServices(data);
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      advisoryService: '',
      dateRange: '',
      type: ''
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search titles, descriptions..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Advisory Service</Label>
          <Select value={filters.advisoryService} onValueChange={(value) => updateFilter('advisoryService', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {advisoryServices.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Broadcast">Broadcast</SelectItem>
              <SelectItem value="Webinar">Webinar</SelectItem>
              <SelectItem value="Article">Article</SelectItem>
              <SelectItem value="Event">Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );
};

export default InfoHubFilters;