import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, RotateCcw, Key, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: string;
  title?: string;
  status: string;
  last_login?: string;
  created_at: string;
}

interface UserManagementProps {
  onAddToAdvisoryTeam?: (userData: { name: string; title: string; email: string; user_id?: string; }) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onAddToAdvisoryTeam }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Form state for create/edit
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Standard User',
    title: ''
  });

  const [usernameError, setUsernameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const [titles, setTitles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchDropdownValues();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, statusFilter, roleFilter]);

  const fetchDropdownValues = async () => {
    try {
      const { data: titleData, error: titleError } = await supabase
        .from('dropdown_values')
        .select('value')
        .eq('category', 'user_titles')
        .eq('is_active', true)
        .order('display_order');

      const { data: roleData, error: roleError } = await supabase
        .from('dropdown_values')
        .select('value')
        .eq('category', 'user_roles')
        .eq('is_active', true)
        .order('display_order');

      if (titleError) throw titleError;
      if (roleError) throw roleError;

      setTitles(titleData?.map(item => item.value) || []);
      setAvailableRoles(roleData?.map(item => item.value) || ['Admin', 'Standard User']);
    } catch (error) {
      console.error('Error fetching dropdown values:', error);
      // Fallback values
      setTitles(['Advisory Service Head', 'Advisory Service Lead', 'Advisory Consultant', 'Stakeholder']);
      setAvailableRoles(['Admin', 'Standard User']);
    }
  };

  const fetchUsers = async () => {
    try {
      // Use the new admin function instead of direct table access
      const { data, error } = await supabase.rpc('admin_get_all_profiles');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Make sure you have admin access.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleCreateUser = async () => {
    // Clear previous errors
    setUsernameError('');
    setEmailError('');

    // Check if username already exists
    const usernameExists = await checkUsernameExists(formData.username);
    if (usernameExists) {
      setUsernameError('Username already taken. Please chose another username');
      return;
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      setEmailError('Email already taken. Please choose another email');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Then create the profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            username: formData.username,
            email: formData.email,
            role: formData.role,
            title: formData.title
          }]);

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "User created successfully"
        });

        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'Standard User',
          title: ''
        });
        setUsernameError(''); // Clear username error
        setEmailError(''); // Clear email error
        setIsCreateDialogOpen(false);
        fetchUsers();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const handleAddToAdvisoryTeam = async () => {
    // Clear previous errors
    setUsernameError('');
    setEmailError('');

    // Check if username already exists
    const usernameExists = await checkUsernameExists(formData.username);
    if (usernameExists) {
      setUsernameError('Username already taken. Please chose another username');
      return;
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      setEmailError('Email already taken. Please choose another email');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Then create the profile in users table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            username: formData.username,
            email: formData.email,
            role: formData.role,
            title: formData.title
          }]);

        if (profileError) throw profileError;

        // Now redirect to advisory team form with user_id included
        if (onAddToAdvisoryTeam) {
          onAddToAdvisoryTeam({
            name: formData.username,
            title: formData.title,
            email: formData.email,
            user_id: authData.user.id
          });
        }

        toast({
          title: "Success",
          description: "User created successfully. Please complete the advisory team member setup."
        });

        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'Standard User',
          title: ''
        });
        setUsernameError(''); // Clear username error
        setEmailError(''); // Clear email error
        setIsCreateDialogOpen(false);
        fetchUsers(); // Refresh the users list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const isAdvisoryTitle = (title: string) => {
    return ['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'].includes(title);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          email: formData.email,
          role: formData.role,
          title: formData.title
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully"
      });

      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Standard User',
        title: ''
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${newStatus.toLowerCase()} successfully`
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (user: User) => {
    try {
      // First delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Then delete from auth.users table using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(user.user_id);
      
      if (authError) {
        console.warn('Failed to delete auth user:', authError);
        // Don't throw error here as profile is already deleted
      }

      toast({
        title: "Success",
        description: "User deleted successfully"
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const resetUserPassword = async (resetType: 'direct' | 'email') => {
    if (!resetUser) return;

    try {
      if (resetType === 'direct') {
        // Direct password reset - Since we can't use admin API, we'll send a reset email
        // and inform the admin that direct password reset requires email verification
        toast({
          title: "Direct Reset Not Available",
          description: "For security reasons, please use 'Send Reset Email' instead. The user will receive an email to reset their password.",
          variant: "destructive"
        });
        return;
      } else {
        // Email password reset
        const { error } = await supabase.auth.resetPasswordForEmail(resetUser.email, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Password reset email sent successfully"
        });
      }

      setIsResetDialogOpen(false);
      setResetUser(null);
      setResetPassword('');
      setConfirmResetPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  const openResetDialog = (user: User) => {
    setResetUser(user);
    setResetPassword('');
    setConfirmResetPassword('');
    setIsResetDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      title: user.title || ''
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system with specified role and permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {usernameError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm">
                      {usernameError}
                    </div>
                  )}
                  {emailError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm">
                      {emailError}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value });
                        if (usernameError) setUsernameError(''); // Clear error when user types
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (emailError) setEmailError(''); // Clear error when user types
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Select value={formData.title} onValueChange={(value) => setFormData({ ...formData, title: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a title" />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map(title => (
                          <SelectItem key={title} value={title}>{title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdvisoryTitle(formData.title) ? (
                    <Button onClick={handleAddToAdvisoryTeam} className="w-full">
                      Add Member to Advisory Team
                    </Button>
                  ) : (
                    <Button onClick={handleCreateUser} className="w-full">
                      Create User
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.title && <Badge variant="secondary">{user.title}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Update user information and role.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-username">Username</Label>
                                <Input
                                  id="edit-username"
                                  value={formData.username}
                                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-role">Role</Label>
                                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map(role => (
                                      <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-title">Title</Label>
                                <Select value={formData.title} onValueChange={(value) => setFormData({ ...formData, title: value })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a title" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {titles.map(title => (
                                      <SelectItem key={title} value={title}>{title}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={handleEditUser} className="w-full">
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetDialog(user)}
                          title="Reset Password"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.status === 'Active' ? 
                            <ToggleRight className="h-4 w-4 text-green-600" /> : 
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          }
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.username}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(user)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password - {resetUser?.username}</DialogTitle>
            <DialogDescription>
              Choose how to reset the password for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Direct Reset
                </h4>
                <div>
                  <Label htmlFor="reset-password">New Password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="Enter new password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-reset-password">Confirm Password</Label>
                  <Input
                    id="confirm-reset-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => resetUserPassword('direct')} 
                  className="w-full"
                  disabled={!resetPassword || !confirmResetPassword}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Set New Password
                </Button>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Reset (Recommended)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Send a password reset link to the user's email address: {resetUser?.email}
                </p>
                <Button 
                  onClick={() => resetUserPassword('email')} 
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reset Email
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};