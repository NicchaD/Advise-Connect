import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, User } from 'lucide-react';
import { getUserDisplayName } from '@/lib/userUtils';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  user_profile?: {
    username: string;
    email: string;
  } | null;
}

interface UserSuggestion {
  user_id: string;
  username: string;
  email: string;
}

interface RequestCommentsProps {
  requestId: string;
  currentUserId: string;
}

export const RequestComments: React.FC<RequestCommentsProps> = ({ requestId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [requestId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        // Fetch user profiles for comment authors
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, email')
          .in('user_id', userIds);

        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          user_profile: profiles?.find(p => p.user_id === comment.user_id) || null
        }));

        setComments(commentsWithProfiles);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    try {
      console.log('Searching for users with query:', query); // Debug log
      
      let supabaseQuery = supabase
        .from('profiles')
        .select('user_id, username, email');

      // If query is empty or just spaces, get all users
      if (query.trim().length === 0) {
        console.log('Empty query, fetching all users');
        const { data: profiles, error } = await supabaseQuery
          .order('username', { ascending: true })
          .limit(10);
        
        if (error) {
          console.error('Error fetching all users:', error);
          setUserSuggestions([]);
          return;
        }
        
        console.log('All users results:', profiles);
        setUserSuggestions(profiles || []);
      } else {
        // Search in both username and email with case-insensitive matching
        const searchTerm = query.trim();
        console.log('Searching with term:', searchTerm);
        
        const { data: profiles, error } = await supabaseQuery
          .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .order('username', { ascending: true })
          .limit(10);

        if (error) {
          console.error('Error searching users:', error);
          setUserSuggestions([]);
          return;
        }

        console.log('Search results for "' + searchTerm + '":', profiles);
        setUserSuggestions(profiles || []);
      }
    } catch (error) {
      console.error('Error in searchUsers:', error);
      setUserSuggestions([]);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setNewComment(value);

    // Check for @ mentions
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Check if the @ is at the start or preceded by whitespace
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValidMention = /\s/.test(charBeforeAt) || lastAtIndex === 0;
      
      // Check if there's no whitespace in the mention text
      const hasWhitespace = /\s/.test(textAfterAt);
      
      if (isValidMention && !hasWhitespace && textAfterAt.length >= 0) {
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        setSelectedSuggestion(0);
        searchUsers(textAfterAt);
      } else {
        setShowSuggestions(false);
        setMentionStart(-1);
      }
    } else {
      setShowSuggestions(false);
      setMentionStart(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && userSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev + 1) % userSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => prev === 0 ? userSuggestions.length - 1 : prev - 1);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectUser(userSuggestions[selectedSuggestion]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setMentionStart(-1);
      }
    }
  };

  const selectUser = (user: UserSuggestion) => {
    if (mentionStart === -1) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeMention = newComment.substring(0, mentionStart);
    const textAfterCursor = newComment.substring(cursorPosition);
    
    const newText = `${textBeforeMention}@${user.username} ${textAfterCursor}`;
    setNewComment(newText);
    setShowSuggestions(false);
    setMentionStart(-1);

    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPosition = mentionStart + user.username.length + 2;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();
    }, 0);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('request_comments')
        .insert([{
          request_id: requestId,
          user_id: currentUserId,
          comment: newComment.trim()
        }]);

      if (error) throw error;

      setNewComment('');
      await fetchComments();
      
      toast({
        title: "Success",
        description: "Comment added successfully."
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCommentText = (text: string): React.ReactNode[] => {
    // Safely render @ mentions without HTML injection
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Find all @mentions in the text
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add the highlighted mention
      parts.push(
        <span key={`mention-${match.index}`} className="text-primary font-medium">
          @{match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last mention
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {getUserDisplayName(comment.user_profile)}
                    </span>
                    {comment.user_id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {renderCommentText(comment.comment)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment */}
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment... Use @username to mention someone"
              value={newComment}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none"
              disabled={submitting}
            />
            
            {/* User Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {userSuggestions.length > 0 ? userSuggestions.map((user, index) => (
                  <div
                    key={user.user_id}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                      index === selectedSuggestion ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => selectUser(user)}
                  >
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium text-sm">{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                )) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Adding Comment...' : 'Add Comment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};