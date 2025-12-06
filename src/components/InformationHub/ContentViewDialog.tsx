import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ContentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: any;
  contentType: 'announcement' | 'knowledge_article' | 'calendar_event';
}

const ContentViewDialog = ({ open, onOpenChange, content, contentType }: ContentViewDialogProps) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (open && content) {
      fetchComments();
      fetchUserFeedback();
      getCurrentUser();
    }
  }, [open, content]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('info_hub_comments')
      .select(`
        *,
        profiles:user_id (username, email)
      `)
      .eq('content_type', contentType)
      .eq('content_id', content.id)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data);
    }
  };

  const fetchUserFeedback = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('info_hub_feedback')
      .select('feedback_type')
      .eq('content_type', contentType)
      .eq('content_id', content.id)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setFeedback(data.feedback_type as 'up' | 'down');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    const { error } = await supabase
      .from('info_hub_comments')
      .insert([{
        content_type: contentType,
        content_id: content.id,
        comment: newComment.trim(),
        user_id: user.id
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } else {
      setNewComment('');
      fetchComments();
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    }
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to provide feedback",
        variant: "destructive",
      });
      return;
    }

    // If clicking the same feedback type, remove it
    if (feedback === type) {
      const { error } = await supabase
        .from('info_hub_feedback')
        .delete()
        .eq('content_type', contentType)
        .eq('content_id', content.id)
        .eq('user_id', user.id);

      if (!error) {
        setFeedback(null);
      }
    } else {
      // Insert or update feedback
      const { error } = await supabase
        .from('info_hub_feedback')
        .upsert([{
          content_type: contentType,
          content_id: content.id,
          user_id: user.id,
          feedback_type: type
        }]);

      if (!error) {
        setFeedback(type);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-2xl">{content.title}</DialogTitle>
            {content.type && (
              <Badge variant={content.type === 'Broadcast' ? 'default' : 'secondary'}>
                {content.type}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Details */}
          <div className="space-y-4">
            {content.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{content.description}</p>
              </div>
            )}

            {content.invitation && (
              <div>
                <h3 className="font-semibold mb-2">Invitation</h3>
                <p className="text-muted-foreground">{content.invitation}</p>
              </div>
            )}

            {content.date && (
              <div>
                <h3 className="font-semibold mb-2">Date & Time</h3>
                <p className="text-muted-foreground">
                  {formatDate(content.date)}
                  {content.time && ` at ${content.time}`}
                </p>
              </div>
            )}

            {content.guest_speaker && (
              <div>
                <h3 className="font-semibold mb-2">Guest Speaker</h3>
                <p className="text-muted-foreground">{content.guest_speaker}</p>
              </div>
            )}

            {content.tags && content.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">#{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div className="flex items-center gap-4 py-4 border-y">
            <span className="text-sm font-medium">Was this helpful?</span>
            <div className="flex gap-2">
              <Button
                variant={feedback === 'up' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback('up')}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful
              </Button>
              <Button
                variant={feedback === 'down' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback('down')}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Not Helpful
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Comments ({comments.length})</h3>
            </div>

            {/* Add Comment */}
            {user && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">
                        {comment.profiles?.username || comment.profiles?.email || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentViewDialog;