"use client";

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Save,
  X,
  FileText,
  Briefcase,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ContentManagement() {
  const [jobRoles, setJobRoles] = useState([]);
  const [questionTemplates, setQuestionTemplates] = useState([]);
  const [copilotPrompts, setCopilotPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState('roles');

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const [rolesRes, questionsRes, promptsRes] = await Promise.all([
        fetch('/api/admin/content/job-roles'),
        fetch('/api/admin/content/questions'),
        fetch('/api/admin/content/copilot-prompts')
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setJobRoles(rolesData);
      }

      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestionTemplates(questionsData);
      }

      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        setCopilotPrompts(promptsData);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item, type) => {
    setEditingItem({ ...item, type });
    setShowEditModal(true);
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/admin/content/${type}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchContent();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleSave = async (data) => {
    try {
      const url = editingItem?.id 
        ? `/api/admin/content/${editingItem.type}/${editingItem.id}`
        : `/api/admin/content/${editingItem.type}`;
      
      const method = editingItem?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingItem(null);
        fetchContent();
      }
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading content...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Content Management</h2>
          <p className="text-gray-400">Manage job roles, questions, and AI prompts</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setEditingItem({ type: activeTab === 'roles' ? 'job-roles' : activeTab === 'questions' ? 'questions' : 'copilot-prompts' });
            setShowEditModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="roles" className="data-[state=active]:bg-blue-600">
            <Briefcase className="w-4 h-4 mr-2" />
            Job Roles
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-blue-600">
            <FileText className="w-4 h-4 mr-2" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="prompts" className="data-[state=active]:bg-blue-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Prompts
          </TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <Button variant="outline" className="border-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Job Roles Tab */}
        <TabsContent value="roles">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Job Roles ({jobRoles.length})</CardTitle>
              <CardDescription className="text-gray-400">
                Manage interview job roles and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">Skills Required</TableHead>
                      <TableHead className="text-gray-300">Experience Levels</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobRoles.map((role) => (
                      <TableRow key={role.id} className="border-gray-700">
                        <TableCell>
                          <div className="text-white font-medium">{role.name}</div>
                          <div className="text-sm text-gray-400">{role.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500 text-white">{role.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {role.skillsRequired?.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {role.skillsRequired?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.skillsRequired.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {role.experienceLevels?.map((level, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={role.isActive ? 'bg-green-500' : 'bg-red-500'}>
                            {role.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(role, 'job-roles')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400"
                              onClick={() => handleDelete(role.id, 'job-roles')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Question Templates ({questionTemplates.length})</CardTitle>
              <CardDescription className="text-gray-400">
                Manage interview question templates and their criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow>
                      <TableHead className="text-gray-300">Question</TableHead>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">Difficulty</TableHead>
                      <TableHead className="text-gray-300">Job Role</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionTemplates.map((question) => (
                      <TableRow key={question.id} className="border-gray-700">
                        <TableCell>
                          <div className="text-white max-w-xs">
                            {question.question.length > 100 
                              ? `${question.question.substring(0, 100)}...`
                              : question.question
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-500 text-white">{question.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getDifficultyColor(question.difficulty)} text-white`}>
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {question.jobRole || 'General'}
                        </TableCell>
                        <TableCell>
                          <Badge className={question.isActive ? 'bg-green-500' : 'bg-red-500'}>
                            {question.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(question, 'questions')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400"
                              onClick={() => handleDelete(question.id, 'questions')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Prompts Tab */}
        <TabsContent value="prompts">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">AI Copilot Prompts ({copilotPrompts.length})</CardTitle>
              <CardDescription className="text-gray-400">
                Manage AI copilot system prompts and templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow>
                      <TableHead className="text-gray-300">Name</TableHead>
                      <TableHead className="text-gray-300">Description</TableHead>
                      <TableHead className="text-gray-300">Job Role</TableHead>
                      <TableHead className="text-gray-300">Experience Level</TableHead>
                      <TableHead className="text-gray-300">Default</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {copilotPrompts.map((prompt) => (
                      <TableRow key={prompt.id} className="border-gray-700">
                        <TableCell>
                          <div className="text-white font-medium">{prompt.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-300 max-w-xs">
                            {prompt.description?.length > 80
                              ? `${prompt.description.substring(0, 80)}...`
                              : prompt.description
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {prompt.jobRole || 'General'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{prompt.experienceLevel || 'All'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={prompt.isDefault ? 'bg-yellow-500' : 'bg-gray-500'}>
                            {prompt.isDefault ? 'Default' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(prompt, 'copilot-prompts')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400"
                              onClick={() => handleDelete(prompt.id, 'copilot-prompts')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal - Simplified for now */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Edit' : 'Create'} {editingItem?.type?.replace('-', ' ')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage content for the platform
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-gray-400">
            Content editing form will be implemented here
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 