
import React, { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

interface AdvisoryTeamMember {
  id: string;
  name: string;
  title: string;
  designation?: string;
  email: string;
  advisory_services: string[];
  expertise: string[];
  is_active: boolean;
}

const advisoryTeamMembers: AdvisoryTeamMember[] = [
  {
    id: "1",
    name: "John Doe",
    title: "Senior Advisor",
    designation: "Senior Manager",
    email: "john.doe@example.com",
    advisory_services: ["Strategy", "Finance"],
    expertise: ["Investment", "Planning"],
    is_active: true,
  },
  {
    id: "2",
    name: "Jane Smith",
    title: "Principal Consultant",
    designation: "Associate Director",
    email: "jane.smith@example.com",
    advisory_services: ["Technology", "Operations"],
    expertise: ["AI", "Cloud"],
    is_active: false,
  },
  {
    id: "3",
    name: "Alice Johnson",
    title: "Managing Director",
    designation: "Manager",
    email: "alice.johnson@example.com",
    advisory_services: ["Human Resources", "Legal"],
    expertise: ["Compliance", "Training"],
    is_active: true,
  },
];

const designationOptions = [
  "Programmer Analyst",
  "Associate", 
  "Senior Associate",
  "Manager",
  "Senior Manager", 
  "Associate Director",
  "Director",
  "Senior Director"
];

const addTeamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  designation: z.string().min(1, "Designation is required"),
  email: z.string().email("Valid email is required"),
  advisory_services: z.string().min(1, "Advisory services are required"),
  expertise: z.string().min(1, "Expertise is required"),
});

const AdminModule: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof addTeamMemberSchema>>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      name: "",
      title: "",
      designation: "",
      email: "",
      advisory_services: "",
      expertise: "",
    },
  });

  const onSubmit = (values: z.infer<typeof addTeamMemberSchema>) => {
    console.log(values);
    // Handle form submission here
    setIsAddDialogOpen(false);
    form.reset();
  };

  return (
    <Tabs defaultValue="system-settings" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="system-settings">System Settings</TabsTrigger>
        <TabsTrigger value="user-management">User Management</TabsTrigger>
      </TabsList>
      <TabsContent value="system-settings">
        <Tabs defaultValue="advisory-team">
          <TabsList>
            <TabsTrigger value="advisory-team">
              Advisory Team Members
            </TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          {/* Advisory Team Members Tab */}
          <TabsContent value="advisory-team">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Advisory Team Members</CardTitle>
                  <CardDescription>
                    Manage advisory team members and their assignments
                  </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Add a new member to the advisory team.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="designation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Designation</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select designation" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {designationOptions.map((designation) => (
                                    <SelectItem key={designation} value={designation}>
                                      {designation}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="advisory_services"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Advisory Services</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter advisory services (comma separated)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="expertise"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expertise</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter expertise (comma separated)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Add Member</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Advisory Services</TableHead>
                        <TableHead>Expertise</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advisoryTeamMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.title}</TableCell>
                          <TableCell>{member.designation || 'Not Specified'}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {member.advisory_services?.map((service, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {member.expertise?.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.is_active ? "default" : "secondary"}>
                              {member.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>General settings content</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>
      <TabsContent value="user-management">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div>User management content</div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AdminModule;
