import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Request, AssigneeInfo, FeedbackSectionProps } from '@/types/shared';

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

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({
  request,
  assigneeInfo,
  currentUserId,
  currentUserRole,
  isCollapsible = true,
  isExpanded = false,
  onToggle,
  onFeedbackSubmitted,
  className,
  variant = 'default'
}) => {
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

  // Determine user permissions and edit capabilities
  const isRequestor = currentUserId === request.requestor_id;
  const isOriginalAssignee = currentUserId === request.original_assignee_id;
  const isAdvisoryServiceHead = currentUserRole === 'Advisory Service Head';
  const isAdmin = currentUserRole === 'Admin';

  // Check if current user should see this section
  const canViewSection = 
    isRequestor || 
    isOriginalAssignee ||
    isAdmin ||
    isAdvisoryServiceHead;

  // Determine if user can edit feedback based on status and role
  const canEditFeedback = () => {
    // Only requestor can edit feedback
    if (!isRequestor) return false;
    
    // Can only edit during "Awaiting Feedback" status
    return request.status === 'Awaiting Feedback';
  };

  // Check if feedback section should be visible based on status
  const shouldShowSection = () => {
    return ['Awaiting Feedback', 'Feedback Received', 'Closed'].includes(request.status || '');
  };

  // Determine if section should be expanded by default
  const shouldExpandByDefault = () => {
    // Auto-expand for requestors when status is "Awaiting Feedback" and no feedback exists yet
    return request.status === 'Awaiting Feedback' && isRequestor && !existingFeedback;
  };

  // Get the actual expanded state - either from props or auto-expand logic
  const actualIsExpanded = shouldExpandByDefault() || isExpanded;

  useEffect(() => {
    const fetchExistingFeedback = async () => {
      if (!shouldShowSection()) return;
      
      try {
        // Get the current authenticated user first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('User not authenticated');
          return;
        }

        // Determine whose feedback to fetch based on user role
        let feedbackUserId;
        if (isRequestor) {
          // If current user is requestor, fetch their own feedback
          feedbackUserId = user.id;
        } else {
          // If current user is assignee/advisory head, fetch the requestor's feedback
          feedbackUserId = request.requestor_id;
        }

        const { data, error } = await supabase
          .from('request_feedback')
          .select('*')
          .eq('request_id', request.id)
          .eq('user_id', feedbackUserId)
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
  }, [request.id, request.requestor_id, request.status, isRequestor]);

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
    
    if (!canEditFeedback()) {
      toast({
        title: "Cannot Edit Feedback",
        description: "Feedback can only be edited during 'Awaiting Feedback' status by the requestor.",
        variant: "destructive"
      });
      return;
    }

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
          request_id: request.id,
          user_id: user.id, // Use the authenticated user's ID
          ...feedback
        });

      if (feedbackError) throw feedbackError;

      // Update request status to "Feedback Received" and assign back to original assignee
      const { error: statusError } = await supabase.rpc('update_request_status_and_assignee', {
        p_request_id: request.id,
        new_status: 'Feedback Received',
        performed_by: currentUserId
      });

      if (statusError) throw statusError;

      toast({
        title: "Feedback Submitted Successfully",
        description: "Thank you for your feedback! The request status has been updated.",
      });

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
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

  // Don't render if user can't view or section shouldn't be shown
  if (!canViewSection || !shouldShowSection()) {
    return null;
  }

  const isReadOnly = !canEditFeedback();

  // Get container classes based on variant
  const getContainerClasses = () => {
    const baseClasses = "rounded-lg";
    switch (variant) {
      case 'compact':
        return cn(baseClasses, "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-300 p-4");
      default:
        return cn(baseClasses, "bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300");
    }
  };

  const HeaderContent = () => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 text-left hover:bg-purple-100 rounded-lg p-2 transition-colors"
    >
      <svg 
        className={`h-5 w-5 text-purple-500 transition-transform duration-200 ${
          actualIsExpanded ? 'rotate-90' : ''
        }`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <MessageSquare className="h-5 w-5 text-purple-600" />
      <h3 className="text-lg font-semibold text-purple-700">Feedback</h3>
      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-600 border-purple-300">
        {actualIsExpanded ? 'Expanded' : 'Collapsed'}
      </Badge>
      {existingFeedback && (
        <Badge variant="outline" className="text-xs bg-green-100 text-green-600 border-green-300">
          Submitted
        </Badge>
      )}
      <span className="text-sm text-purple-500 ml-auto">
        {actualIsExpanded ? 'Click to collapse' : 
         isRequestor ? 'Click to expand feedback form' : 'Click to view feedback'}
      </span>
    </button>
  );

  const ContentSection = () => (
    <div className="space-y-6">
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
              disabled={isReadOnly}
            />
            
            <StarRating
              label="Response Time *"
              rating={feedback.response_time_rating}
              onRatingChange={(rating) => setFeedback({ ...feedback, response_time_rating: rating })}
              disabled={isReadOnly}
            />
            
            <StarRating
              label="Communication *"
              rating={feedback.communication_rating}
              onRatingChange={(rating) => setFeedback({ ...feedback, communication_rating: rating })}
              disabled={isReadOnly}
            />
          </div>
          
          <div className="space-y-4">
            <StarRating
              label="Overall Satisfaction *"
              rating={feedback.satisfaction_rating}
              onRatingChange={(rating) => setFeedback({ ...feedback, satisfaction_rating: rating })}
              disabled={isReadOnly}
            />
            
            <StarRating
              label="Overall Rating *"
              rating={feedback.overall_rating}
              onRatingChange={(rating) => setFeedback({ ...feedback, overall_rating: rating })}
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
            />
          </div>
        </div>

        {canEditFeedback() && (
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
        
        {canEditFeedback() && !isMandatoryComplete && (
          <p className="text-sm text-muted-foreground text-center">
            * Please complete all mandatory fields to enable the Save Feedback button
          </p>
        )}

        {isReadOnly && existingFeedback && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              {isRequestor 
                ? "Feedback has been submitted and is now read-only" 
                : "Viewing feedback submitted by the requestor"}
            </p>
          </div>
        )}
      </form>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={cn(getContainerClasses(), className, "p-4 shadow-sm")}>
        {isCollapsible ? (
          <>
            <HeaderContent />
            {actualIsExpanded && (
              <div className="mt-4 pt-4 border-t border-purple-200 animate-in slide-in-from-top-2 duration-300">
                <ContentSection />
              </div>
            )}
          </>
        ) : (
          <>
            <HeaderContent />
            <div className="mt-4">
              <ContentSection />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
