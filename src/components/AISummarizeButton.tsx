import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Loader2, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AISummarizeButtonProps {
  text: string;
  className?: string;
}

export const AISummarizeButton: React.FC<AISummarizeButtonProps> = ({ 
  text, 
  className = "" 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

  // Mock AI summarization function - can be replaced with real OpenAI integration later
  const mockAISummarize = (inputText: string): string => {
    // Split text into sentences and pick key points
    const sentences = inputText.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10);
    
    if (sentences.length === 0) return "No content to summarize.";
    
    // Simple mock logic: extract first sentence and last meaningful sentence
    const firstSentence = sentences[0].trim();
    const lastSentence = sentences.length > 1 ? sentences[sentences.length - 1].trim() : '';
    
    // Look for key terms that might indicate important information
    const keyTerms = ['require', 'need', 'implement', 'develop', 'create', 'integrate', 'support', 'manage', 'analyze'];
    const importantSentences = sentences.filter(sentence => 
      keyTerms.some(term => sentence.toLowerCase().includes(term))
    ).slice(0, 2);
    
    let summary = `Summary: ${firstSentence}.`;
    
    if (importantSentences.length > 0 && !importantSentences.includes(firstSentence)) {
      summary += ` Key requirements: ${importantSentences[0].trim()}.`;
    }
    
    if (lastSentence && lastSentence !== firstSentence && !importantSentences.includes(lastSentence)) {
      summary += ` ${lastSentence}.`;
    }
    
    return summary;
  };

  const handleSummarize = async () => {
    if (!text || text.trim().length === 0) {
      toast({
        title: "No content",
        description: "There is no content to summarize.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generatedSummary = mockAISummarize(text);
      setSummary(generatedSummary);
      setShowSummary(true);
      
      toast({
        title: "Summary generated",
        description: "AI summary has been created successfully.",
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (summary) {
      try {
        await navigator.clipboard.writeText(summary);
        toast({
          title: "Copied",
          description: "Summary copied to clipboard.",
        });
      } catch (error) {
        console.error('Failed to copy:', error);
        toast({
          title: "Error",
          description: "Failed to copy summary.",
          variant: "destructive",
        });
      }
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
    setSummary(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Button
        onClick={handleSummarize}
        disabled={isProcessing || !text}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Summary...
          </>
        ) : (
          <>
            <Bot className="h-4 w-4" />
            AI Summarize
          </>
        )}
      </Button>

      {showSummary && summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI Summary</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  onClick={closeSummary}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};