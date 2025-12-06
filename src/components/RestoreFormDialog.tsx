import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';

interface RestoreFormDialogProps {
  isOpen: boolean;
  onPlaceRequest: () => void;
  onCancel: () => void;
}

export default function RestoreFormDialog({ isOpen, onPlaceRequest, onCancel }: RestoreFormDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Continue Your Request
          </DialogTitle>
          <DialogDescription>
            We found your previously filled form data. Would you like to submit your request now or start over?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={onPlaceRequest}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit Request and Auto-Assign
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel and Go Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}