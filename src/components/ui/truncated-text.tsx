import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TruncatedTextProps {
  text: string;
  maxWords?: number;
  className?: string;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({ 
  text, 
  maxWords = 50, 
  className = "" 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text) return null;
  
  const words = text.split(' ');
  const shouldTruncate = words.length > maxWords;
  
  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }
  
  const truncatedText = words.slice(0, maxWords).join(' ');
  
  return (
    <div className={cn("space-y-2", className)}>
      <span>
        {isExpanded ? text : `${truncatedText}...`}
      </span>
      <Button
        variant="link"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-0 text-primary underline hover:no-underline"
      >
        {isExpanded ? 'Show less' : 'View more'}
      </Button>
    </div>
  );
};