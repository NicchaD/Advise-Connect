import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RequestFeedbackFormProps {
  requestId: string;
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

const StarRating = ({ rating, onRatingChange, label }: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  label: string;
}) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="transition-colors hover:scale-110 transform duration-200"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
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

export default function RequestFeedbackForm({ requestId, onFeedbackSubmitted }: RequestFeedbackFormProps) {
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
  const [feedbackExists, setFeedbackExists] = useState(false);
  const { toast } = useToast();

  // Load existing feedback on component mount
  useEffect(() => {
    const fetchExistingFeedback = async () => {
      try {
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
          setFeedback(data);
          setFeedbackExists(true);
        }
      } catch (error) {
        console.error('Error fetching existing feedback:', error);
      }
    };

    fetchExistingFeedback();
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all ratings are provided
    if (feedback.quality_rating === 0 || feedback.response_time_rating === 0 || 
        feedback.satisfaction_rating === 0 || feedback.communication_rating === 0 || 
        feedback.overall_rating === 0) {
      toast({
        title: "Incomplete Ratings",
        description: "Please provide ratings for all categories",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('request_feedback')
        .upsert({
          request_id: requestId,
          user_id: user.id,
          ...feedback
        });

      if (error) throw error;

      // Update request status to "Feedback Received" and assign to original assignee
      const { error: statusError } = await supabase.rpc('update_request_status_and_assignee', {
        p_request_id: requestId,
        new_status: 'Feedback Received',
        performed_by: user.id
      });

      if (statusError) {
        console.error('Error updating request status:', statusError);
        // Don't throw error here to avoid blocking feedback submission
      }

      setFeedbackExists(true);

      toast({
        title: feedbackExists ? "Feedback Updated" : "Feedback Submitted",
        description: feedbackExists ? "Your feedback has been updated successfully!" : "Thank you for your feedback!",
        variant: "default"
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

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Request Feedback
        </CardTitle>
        <p className="text-blue-100 text-sm">
          {feedbackExists ? "Modify your feedback as needed" : "Help us improve our service by sharing your experience"}
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <StarRating
                label="Quality of Service"
                rating={feedback.quality_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, quality_rating: rating })}
              />
              
              <StarRating
                label="Response Time"
                rating={feedback.response_time_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, response_time_rating: rating })}
              />
              
              <StarRating
                label="Communication"
                rating={feedback.communication_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, communication_rating: rating })}
              />
            </div>
            
            <div className="space-y-4">
              <StarRating
                label="Overall Satisfaction"
                rating={feedback.satisfaction_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, satisfaction_rating: rating })}
              />
              
              <StarRating
                label="Overall Rating"
                rating={feedback.overall_rating}
                onRatingChange={(rating) => setFeedback({ ...feedback, overall_rating: rating })}
              />
            </div>
          </div>

          {/* Text Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback_text" className="text-sm font-medium">
                Additional Feedback
              </Label>
              <Textarea
                id="feedback_text"
                placeholder="Share any additional thoughts about the service you received..."
                value={feedback.feedback_text}
                onChange={(e) => setFeedback({ ...feedback, feedback_text: e.target.value })}
                className="min-h-[100px] mt-2"
              />
            </div>

            <div>
              <Label htmlFor="benefits_achieved" className="text-sm font-medium">
                Benefits Achieved
              </Label>
              <Textarea
                id="benefits_achieved"
                placeholder="What benefits or improvements did you achieve from this service?"
                value={feedback.benefits_achieved}
                onChange={(e) => setFeedback({ ...feedback, benefits_achieved: e.target.value })}
                className="min-h-[80px] mt-2"
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
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {feedbackExists ? "Update Feedback" : "Submit Feedback"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}