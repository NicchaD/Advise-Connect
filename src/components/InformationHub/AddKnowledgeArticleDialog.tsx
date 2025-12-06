import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface KnowledgeArticle {
  id: string;
  title: string;
  description: string;
  advisory_service_id?: string;
  tags?: string[];
  file_url?: string;
  file_name?: string;
}

interface AddKnowledgeArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingArticle?: KnowledgeArticle | null;
  onSuccess: () => void;
}

const AddKnowledgeArticleDialog = ({ open, onOpenChange, editingArticle, onSuccess }: AddKnowledgeArticleDialogProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    advisory_service_id: '',
    tags: [] as string[],
    file: null as File | null,
    currentFileUrl: '',
    currentFileName: ''
  });

  const [currentTag, setCurrentTag] = useState('');
  const [advisoryServices, setAdvisoryServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchAdvisoryServices();
  }, []);

  useEffect(() => {
    if (editingArticle) {
      setFormData({
        title: editingArticle.title,
        description: editingArticle.description,
        advisory_service_id: editingArticle.advisory_service_id || '',
        tags: editingArticle.tags || [],
        file: null,
        currentFileUrl: editingArticle.file_url || '',
        currentFileName: editingArticle.file_name || ''
      });
    } else {
      resetForm();
    }
  }, [editingArticle, open]);

  const fetchAdvisoryServices = async () => {
    const { data } = await supabase
      .from('advisory_services')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (data) setAdvisoryServices(data);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      advisory_service_id: '',
      tags: [],
      file: null,
      currentFileUrl: '',
      currentFileName: ''
    });
    setCurrentTag('');
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ 
      ...prev, 
      file: null, 
      currentFileUrl: '', 
      currentFileName: '' 
    }));
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    setUploadingFile(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `articles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('info-hub-files')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      setUploadingFile(false);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('info-hub-files')
      .getPublicUrl(filePath);

    setUploadingFile(false);
    return { url: publicUrl, name: file.name };
  };

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.description.trim() && 
           formData.advisory_service_id &&
           formData.tags.length > 0;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create articles",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    let fileUrl = formData.currentFileUrl;
    let fileName = formData.currentFileName;

    // Upload new file if selected
    if (formData.file) {
      const uploadResult = await uploadFile(formData.file);
      if (uploadResult) {
        fileUrl = uploadResult.url;
        fileName = uploadResult.name;
      } else {
        setLoading(false);
        return;
      }
    }

    const submissionData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      advisory_service_id: formData.advisory_service_id,
      tags: formData.tags,
      file_url: fileUrl || null,
      file_name: fileName || null,
      created_by: user.id
    };

    const { error } = editingArticle
      ? await supabase.from('knowledge_articles').update(submissionData).eq('id', editingArticle.id)
      : await supabase.from('knowledge_articles').insert([submissionData]);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingArticle ? 'update' : 'create'} article`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Article ${editingArticle ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingArticle ? 'Edit Knowledge Article' : 'Add New Knowledge Article'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter article title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter article description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Advisory Service *</Label>
            <Select 
              value={formData.advisory_service_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, advisory_service_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select advisory service" />
              </SelectTrigger>
              <SelectContent>
                {advisoryServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags *</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag and press Enter"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} disabled={!currentTag.trim()}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      #{tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload File</Label>
            <div className="space-y-2">
              {(formData.currentFileUrl || formData.file) ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <File className="h-5 w-5" />
                  <span className="flex-1 text-sm">
                    {formData.file ? formData.file.name : formData.currentFileName}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload a file or drag and drop
                    </p>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid() || loading || uploadingFile}
            >
              {loading || uploadingFile ? 'Saving...' : editingArticle ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddKnowledgeArticleDialog;