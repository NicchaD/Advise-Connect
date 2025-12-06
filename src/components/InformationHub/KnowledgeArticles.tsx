import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AddKnowledgeArticleDialog from './AddKnowledgeArticleDialog';
import ContentViewDialog from './ContentViewDialog';

interface KnowledgeArticle {
  id: string;
  title: string;
  description: string;
  advisory_service_id?: string;
  tags?: string[];
  file_url?: string;
  file_name?: string;
  created_at: string;
}

interface KnowledgeArticlesProps {
  filters: {
    searchTerm: string;
    advisoryService: string;
    dateRange: string;
    type: string;
  };
}

const KnowledgeArticles = ({ filters }: KnowledgeArticlesProps) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchArticles();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [filters]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsAdmin(profile?.role === 'Admin');
    }
  };

  const fetchArticles = async () => {
    let query = supabase
      .from('knowledge_articles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.searchTerm) {
      query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }
    
    if (filters.advisoryService && filters.advisoryService !== 'all') {
      query = query.eq('advisory_service_id', filters.advisoryService);
    }

    const { data, error } = await query;
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch knowledge articles",
        variant: "destructive",
      });
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
      fetchArticles();
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return <div>Loading knowledge articles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Knowledge Articles</h2>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Article
          </Button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No knowledge articles found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Card 
              key={article.id} 
              className="group hover:shadow-lg transition-shadow cursor-pointer relative"
              onClick={() => setSelectedArticle(article)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    {article.file_url && (
                      <Badge variant="outline">Has File</Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingArticle(article);
                          setShowAddDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(article.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg">{article.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {article.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {article.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{article.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {article.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(article.file_url!, article.file_name || 'download');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download {article.file_name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddKnowledgeArticleDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        editingArticle={editingArticle}
        onSuccess={() => {
          fetchArticles();
          setEditingArticle(null);
        }}
      />

      {selectedArticle && (
        <ContentViewDialog
          open={!!selectedArticle}
          onOpenChange={() => setSelectedArticle(null)}
          content={selectedArticle}
          contentType="knowledge_article"
        />
      )}
    </div>
  );
};

export default KnowledgeArticles;