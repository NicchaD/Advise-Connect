import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, UserPlus } from 'lucide-react';

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginPromptDialog({ open, onOpenChange }: LoginPromptDialogProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onOpenChange(false);
    // Save current URL path to restore after login
    const currentPath = window.location.pathname;
    navigate('/login', { state: { from: { pathname: currentPath } } });
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/signup');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Authentication Required</DialogTitle>
          <DialogDescription className="text-center">
            You need to be logged in to view your request details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleLogin} className="w-full">
            <User className="h-4 w-4 mr-2" />
            Please Login to View Request
          </Button>
          <Button onClick={handleSignUp} variant="outline" className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Not a User? Sign Up to View Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}