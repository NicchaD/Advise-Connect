import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface ServiceOfferingsSelectionProps {
  selectedServices: string[];
  advisoryServices: Array<{
    id: string;
    title: string;
    description: string;
    icon: any;
    offerings: Array<{ id: string; name: string; icon: any }>;
  }>;
  onProceedWithRequest: (selectedOfferings: Record<string, string[]>) => void;
  onBack: () => void;
}

export default function ServiceOfferingsSelection({
  selectedServices,
  advisoryServices,
  onProceedWithRequest,
  onBack
}: ServiceOfferingsSelectionProps) {
  const [selectedOfferings, setSelectedOfferings] = useState<Record<string, string[]>>({});

  const handleOfferingToggle = (serviceId: string, offeringId: string) => {
    setSelectedOfferings(prev => ({
      ...prev,
      [serviceId]: prev[serviceId]?.includes(offeringId)
        ? prev[serviceId].filter(id => id !== offeringId)
        : [...(prev[serviceId] || []), offeringId]
    }));
  };

  const canProceed = selectedServices.every(serviceId => 
    selectedOfferings[serviceId] && selectedOfferings[serviceId].length > 0
  );

  const totalSelectedOfferings = Object.values(selectedOfferings).flat().length;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <Card className="mb-8 bg-gradient-card border-0 shadow-colored">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            Select Service Offerings
          </CardTitle>
          <CardDescription className="text-lg">
            Choose specific offerings from each selected advisory service. 
            You must select at least one offering from each service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedServices.map(serviceId => {
                const service = advisoryServices.find(s => s.id === serviceId);
                return (
                  <Badge key={serviceId} variant="secondary" className="text-sm px-3 py-1 bg-gradient-primary text-white">
                    {service?.title}
                  </Badge>
                );
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalSelectedOfferings} offerings selected across {selectedServices.length} services
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Offerings */}
      <div className="space-y-8">
        {selectedServices.map(serviceId => {
          const service = advisoryServices.find(s => s.id === serviceId);
          if (!service) return null;

          const IconComponent = service.icon;
          const serviceOfferings = selectedOfferings[serviceId] || [];
          const hasSelection = serviceOfferings.length > 0;

          return (
            <Card key={serviceId} className={`
              bg-gradient-card border-0 shadow-medium transition-all duration-300
              ${hasSelection ? 'ring-2 ring-primary shadow-colored' : 'shadow-soft'}
            `}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`
                    p-3 rounded-xl
                    ${hasSelection ? 'bg-gradient-primary text-white shadow-colored' : 'bg-muted'}
                  `}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl">{service.title}</h3>
                    <p className="text-sm text-muted-foreground font-normal">{service.description}</p>
                  </div>
                  {hasSelection && (
                    <Badge variant="outline" className="ml-auto bg-success/10 text-success border-success">
                      {serviceOfferings.length} selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {service.offerings.map(offering => {
                    const OfferingIcon = offering.icon;
                    const isSelected = serviceOfferings.includes(offering.id);
                    
                    return (
                      <div key={offering.id} className="relative">
                        <Label
                          htmlFor={`${serviceId}-${offering.id}`}
                          className="cursor-pointer block"
                        >
                          <Card className={`
                            transition-all duration-300 hover:shadow-glow hover:scale-105 h-full
                            ${isSelected ? 'ring-2 ring-primary bg-gradient-hover shadow-colored' : 'hover:bg-gradient-hover shadow-soft'}
                          `}>
                            <CardContent className="p-4 text-center">
                              <div className="flex items-center gap-3 mb-3">
                                <Checkbox
                                  id={`${serviceId}-${offering.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => handleOfferingToggle(serviceId, offering.id)}
                                  className="border-2"
                                />
                                <div className={`
                                  p-2 rounded-lg
                                  ${isSelected ? 'bg-gradient-primary text-white' : 'bg-muted'}
                                `}>
                                  <OfferingIcon className="h-4 w-4" />
                                </div>
                              </div>
                              <h4 className="font-medium text-sm">{offering.name}</h4>
                            </CardContent>
                          </Card>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary and Actions */}
      <Card className="mt-8 bg-gradient-stats text-white border-0 shadow-hero">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold mb-2">Selection Summary</h3>
              <p className="text-white/90">
                {totalSelectedOfferings} offerings selected from {selectedServices.length} advisory services
              </p>
              {!canProceed && (
                <p className="text-orange-200 text-sm mt-1">
                  Please select at least one offering from each service to proceed
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => onProceedWithRequest(selectedOfferings)}
                disabled={!canProceed}
                className="bg-white text-primary hover:bg-white/90 font-semibold px-6"
              >
                Proceed with Request
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}