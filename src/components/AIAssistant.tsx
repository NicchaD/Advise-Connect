import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Sparkles, 
  RefreshCw, 
  Lightbulb,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getActivitiesForServiceOffering } from '@/data/serviceActivities';

interface AIAssistantProps {
  onTextUpdate: (text: string) => void;
  currentText: string;
  selectedServiceId?: string;
  selectedOfferings?: string[];
  placeholder?: string;
}

export default function AIAssistant({ 
  onTextUpdate, 
  currentText, 
  selectedServiceId,
  selectedOfferings = [],
  placeholder = "Describe your requirements..." 
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak your requirements clearly",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Call voice-to-text edge function (you'll need to implement this)
      const response = await fetch('/api/voice-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (response.ok) {
        const { text } = await response.json();
        onTextUpdate(currentText + (currentText ? '\n\n' : '') + text);
        toast({
          title: "Speech converted",
          description: "Text has been added to your requirements",
        });
      } else {
        throw new Error('Voice conversion failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert speech to text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const improveDescription = async () => {
    if (!currentText.trim()) {
      toast({
        title: "No text to improve",
        description: "Please add some content first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate AI improvement (replace with actual AI service call)
      const improvedText = await simulateAIImprovement(currentText);
      setGeneratedText(improvedText);
      
      toast({
        title: "Description improved",
        description: "Review the enhanced version below",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to improve description",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const autoRewrite = async () => {
    if (!currentText.trim()) {
      toast({
        title: "No text to rewrite",
        description: "Please add some content first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate AI rewrite (replace with actual AI service call)
      const rewrittenText = await simulateAIRewrite(currentText);
      setGeneratedText(rewrittenText);
      
      toast({
        title: "Text rewritten",
        description: "Review the new version below",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rewrite text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const autoSuggest = () => {
    if (!selectedServiceId) {
      toast({
        title: "No service selected",
        description: "Please select a service first",
        variant: "destructive",
      });
      return;
    }

    // Get activities for the selected service offering
    const activities = getActivitiesForServiceOffering(selectedServiceId);
    
    if (activities.length === 0) {
      toast({
        title: "No suggestions available",
        description: "No activities found for this service",
        variant: "destructive",
      });
      return;
    }

    // Generate suggestions based on activities
    const suggestions = activities.map(activity => {
      const subActivities = activity.subActivities?.slice(0, 3) || [];
      return `${activity.name}${subActivities.length > 0 ? ' including ' + subActivities.map(sub => sub.name).join(', ') : ''}`;
    }).join('\n• ');

    const suggestedText = `Based on the selected service offering, here are recommended activities:

• ${suggestions}

Please specify which of these activities are relevant to your project and provide additional details about your specific requirements.`;

    setGeneratedText(suggestedText);
    
    toast({
      title: "AI suggestions generated",
      description: "Activity suggestions based on your service selection",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy text",
        variant: "destructive",
      });
    }
  };

  const applyGeneratedText = () => {
    onTextUpdate(generatedText);
    setGeneratedText('');
    setIsOpen(false);
    toast({
      title: "Text applied",
      description: "Generated text has been applied to your requirements",
    });
  };

  // Simulate AI service calls (replace with actual implementations)
  const simulateAIImprovement = async (text: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `Enhanced Requirements:

${text}

Additional Technical Considerations:
- Ensure compliance with enterprise security standards
- Consider scalability requirements for future growth
- Include performance benchmarks and success metrics
- Define clear acceptance criteria and testing procedures
- Establish timeline milestones and deliverable checkpoints`;
  };

  const simulateAIRewrite = async (text: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `Professional Requirements Document:

Objective: ${text.split('.')[0] || text.substring(0, 100)}...

Scope of Work:
- Primary deliverables and expected outcomes
- Technical specifications and implementation approach
- Resource requirements and timeline expectations
- Quality assurance and validation criteria

Success Metrics:
- Measurable performance indicators
- Business value demonstration
- Risk mitigation strategies
- Post-implementation support requirements`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          className="gap-2 hover:bg-primary hover:text-white transition-colors"
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4 text-primary" />
            AI Assistant Features
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className="gap-2"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 text-red-500" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Voice to Text
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={improveDescription}
              disabled={isProcessing || !currentText.trim()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Improve
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={autoRewrite}
              disabled={isProcessing || !currentText.trim()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Auto Rewrite
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={autoSuggest}
              disabled={isProcessing || !selectedServiceId}
              className="gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              Auto Suggest
            </Button>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          )}

          {generatedText && (
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedText)}
                    className="h-6 w-6 p-0"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                
                <Textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  className="min-h-[120px] text-sm"
                  placeholder="Generated content will appear here..."
                />
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={applyGeneratedText}
                    className="flex-1"
                  >
                    Apply to Form
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratedText('')}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedServiceId && (
            <div className="text-xs text-muted-foreground">
              <strong>Service:</strong> {selectedServiceId}
              {selectedOfferings.length > 0 && (
                <div className="mt-1">
                  <strong>Offerings:</strong> {selectedOfferings.length} selected
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}