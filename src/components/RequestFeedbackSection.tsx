import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RequestFeedbackSectionProps {
  requestId: string;
  requestorId: string;
  originalAssigneeId: string | null;
  currentUserId: string;
  onFeedbackSubmitted: () => void;
}

interface FeedbackData {
  quality_rating: number;
  response_time_rating: number;
  satisfaction_rating: number;
  communication_rating: number;
  overall_rating: number;
  feedback_text: string;
  benefits_achieved: string;
  suggestions_for_improvement: string;
}

const StarRating = ({ rating, onRatingChange, label, disabled = false }: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  label: string;
  disabled?: boolean;
}) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onRatingChange(star)}
            disabled={disabled}
            className={`transition-colors hover:scale-110 transform duration-200 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : disabled 
                    ? 'text-muted-foreground/50'
                    : 'text-muted-foreground hover:text-amber-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          ({rating}/5)
        </span>
      </div>
    </div>
  );
};

export function RequestFeedbackSection({ 
  requestId, 
  requestorId, 
  originalAssigneeId,
  currentUserId, 
  onFeedbackSubmitted 
}: RequestFeedbackSectionProps) {
  const [feedback, setFeedback] = useState<FeedbackData>({
    quality_rating: 0,
    response_time_rating: 0,
    satisfaction_rating: 0,
    communication_rating: 0,
    overall_rating: 0,
    feedback_text: '',
    benefits_achieved: '',
    suggestions_for_improvement: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<FeedbackData | null>(null);
  const { toast } = useToast();

  // Check if current user is the requestor (only they can edit)
  const isRequestor = currentUserId === requestorId;
  
  // Check if current user should see this section (requestor or original assignee)
  const canViewSection = currentUserId === requestorId || currentUserId === originalAssigneeId;

  useEffect(() => {
    const fetchExistingFeedback = async () => {
      try {
        // Get the current authenticated user first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('User not authenticated');
          return;
        }

        const { data, error } = await supabase
          .from('request_feedback')
          .select('*')
          .eq('request_id', requestId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching existing feedback:', error);
          return;
        }

        if (data) {
          setExistingFeedback(data);
          setFeedback(data);
        }
      } catch (error) {
        console.error('Error fetching existing feedback:', error);
      }
    };

    fetchExistingFeedback();
  }, [requestId, requestorId]);

  // Check if all mandatory fields are filled
  const isMandatoryComplete = 
    feedback.quality_rating > 0 && 
    feedback.response_time_rating > 0 && 
    feedback.satisfaction_rating > 0 && 
    feedback.communication_rating > 0 && 
    feedback.overall_rating > 0 && 
    feedback.feedback_text.trim() !== '' && 
    feedback.benefits_achieved.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isMandatoryComplete) {
      toast({
        title: "Incomplete Feedback",
        description: "Please fill all mandatory fields: all star ratings, feedback text, and benefits achieved",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the current authenticated user to ensure feedback is attributed correctly
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Insert or update feedback
      const { error: feedbackError } = await supabase
        .from('request_feedback')
        .upsert({
          request_id: requestId,
          user_id: user.id, // Use the authenticated user's ID, not the requestor ID
          ...feedback
        });

      if (feedbackError) throw feedbackError;

      // Update request status to "Feedback Received" and assign back to original assignee
      const { error: statusError } = await supabase.rpc('update_request_status_and_assignee', {
        p_request_id: requestId,
        new_status: 'Feedback Received',
        performed_by: currentUserId
      });

      if (statusError) throw statusError;

      toast({
        title: "Feedback Submitted Successfully",
        description: "Thank you for your feedback! The request status has been updated.",
      });

      onFeedbackSubmitted();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canViewSection) {
    return null;
  }

  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback
        </CardTitle>
        <p className="text-purple-100 text-sm">
          {isRequestor 
            ? "Please share your experience and help us improve our service"
            : "Feedback from the requestor"
          }
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {existingFeedback && !isRequestor && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              ✓ Feedback has been submitted by the requestor
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <StarRating
                label="Quality of Service *"
                rating={feedback.quality_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, quality_rating: rating })}
                disabled={!isRequestor}
              />
              
              <StarRating
                label="Response Time *"
                rating={feedback.response_time_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, response_time_rating: rating })}
                disabled={!isRequestor}
              />
              
              <StarRating
                label="Communication *"
                rating={feedback.communication_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, communication_rating: rating })}
                disabled={!isRequestor}
              />
            </div>
            
            <div className="space-y-4">
              <StarRating
                label="Overall Satisfaction *"
                rating={feedback.satisfaction_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, satisfaction_rating: rating })}
                disabled={!isRequestor}
              />
              
              <StarRating
                label="Overall Rating *"
                rating={feedback.overall_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, overall_rating: rating })}
                disabled={!isRequestor}
              />
            </div>
          </div>

          {/* Text Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback_text" className="text-sm font-medium">
                Additional Feedback *
              </Label>
              <Textarea
                id="feedback_text"
                placeholder="Share your thoughts about the service you received..."
                value={feedback.feedback_text}
                onChange={(e) => setFeedback({ ...feedback, feedback_text: e.target.value })}
                className="min-h-[100px] mt-2"
                disabled={!isRequestor}
                required
              />
            </div>

            <div>
              <Label htmlFor="benefits_achieved" className="text-sm font-medium">
                Benefits Achieved *
              </Label>
              <Textarea
                id="benefits_achieved"
                placeholder="What benefits or improvements did you achieve from this service?"
                value={feedback.benefits_achieved}
                onChange={(e) => setFeedback({ ...feedback, benefits_achieved: e.target.value })}
                className="min-h-[80px] mt-2"
                disabled={!isRequestor}
                required
              />
            </div>

            <div>
              <Label htmlFor="suggestions_for_improvement" className="text-sm font-medium">
                Suggestions for Improvement
              </Label>
              <Textarea
                id="suggestions_for_improvement"
                placeholder="How can we improve our service in the future?"
                value={feedback.suggestions_for_improvement}
                onChange={(e) => setFeedback({ ...feedback, suggestions_for_improvement: e.target.value })}
                className="min-h-[80px] mt-2"
                disabled={!isRequestor}
              />
            </div>
          </div>

          {isRequestor && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting || !isMandatoryComplete}
                className={`px-6 ${
                  isMandatoryComplete 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Save Feedback
                  </>
                )}
              </Button>
            </div>
          )}
          
          {isRequestor && !isMandatoryComplete && (
            <p className="text-sm text-muted-foreground text-center">
              * Please complete all mandatory fields to enable the Save Feedback button
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}