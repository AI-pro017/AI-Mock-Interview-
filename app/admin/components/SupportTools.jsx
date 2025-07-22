"use client";

import { useState, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  Gift, 
  Clock,
  User,
  Plus,
  Filter,
  AlertCircle,
  CheckCircle
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SupportTools() {
  const [supportNotes, setSupportNotes] = useState([]);
  const [sessionCredits, setSessionCredits] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchSupportData();
  }, []);

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      const [notesRes, creditsRes, logsRes] = await Promise.all([
        fetch('/api/admin/support/notes'),
        fetch('/api/admin/support/credits'),
        fetch('/api/admin/support/session-logs')
      ]);

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setSupportNotes(notesData);
      }

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        setSessionCredits(creditsData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSessionLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to fetch support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (noteData) => {
    try {
      const response = await fetch('/api/admin/support/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      if (response.ok) {
        setShowAddNoteModal(false);
        fetchSupportData();
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleIssueCredits = async (creditData) => {
    try {
      const response = await fetch('/api/admin/support/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditData)
      });

      if (response.ok) {
        setShowAddCreditModal(false);
        fetchSupportData();
      }
    } catch (error) {
      console.error('Failed to issue credits:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'used': return 'bg-gray-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading support tools...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Support Tools</h2>
          <p className="text-gray-400">Manage user support, session logs, and credits</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="border-gray-600"
            onClick={() => setShowAddNoteModal(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Add Note
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowAddCreditModal(true)}
          >
            <Gift className="w-4 h-4 mr-2" />
            Issue Credits
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notes" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="notes" className="data-[state=active]:bg-blue-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            Support Notes
          </TabsTrigger>
          <TabsTrigger value="credits" className="data-[state=active]:bg-blue-600">
            <Gift className="w-4 h-4 mr-2" />
            Session Credits
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-blue-600">
            <Clock className="w-4 h-4 mr-2" />
            Session Logs
          </TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by user email or session ID..."
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

        {/* Support Notes Tab */}
        <TabsContent value="notes">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Support Notes ({supportNotes.length})</CardTitle>
              <CardDescription className="text-gray-400">
                User support interactions and internal notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow>
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Note</TableHead>
                      <TableHead className="text-gray-300">Priority</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Admin</TableHead>
                      <TableHead className="text-gray-300">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supportNotes.map((note) => (
                      <TableRow key={note.id} className="border-gray-700">
                        <TableCell>
                          <div className="text-white">{note.userEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-300 max-w-xs">
                            {note.note.length > 100 
                              ? `${note.note.substring(0, 100)}...`
                              : note.note
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getPriorityColor(note.priority)} text-white`}>
                            {note.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {note.isInternal ? 'Internal' : 'Customer'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {note.adminName}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Credits Tab */}
        <TabsContent value="credits">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Session Credits ({sessionCredits.length})</CardTitle>
              <CardDescription className="text-gray-400">
                Temporary credits issued to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow>
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Session Type</TableHead>
                      <TableHead className="text-gray-300">Credits</TableHead>
                      <TableHead className="text-gray-300">Reason</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Expires</TableHead>
                      <TableHead className="text-gray-300">Issued By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionCredits.map((credit) => (
                      <TableRow key={credit.id} className="border-gray-700">
                        <TableCell>
                          <div className="text-white">{credit.userEmail}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-500 text-white">
                            {credit.sessionType === 'mock_interview' ? 'Mock Interview' : 'Real-Time Help'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-white font-semibold">{credit.creditsGranted}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-300 max-w-xs">
                            {credit.reason || 'No reason provided'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(credit.isUsed ? 'used' : 'active')}>
                            {credit.isUsed ? 'Used' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {credit.expiresAt 
                            ? new Date(credit.expiresAt).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {credit.adminName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Logs Tab */}
        <TabsContent value="logs">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Session Logs ({sessionLogs.length})</CardTitle>
              <CardDescription className="text-gray-400">
                Searchable session logs for support purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow>
                      <TableHead className="text-gray-300">Session ID</TableHead>
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Duration</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionLogs.map((log) => (
                      <TableRow key={log.id} className="border-gray-700">
                        <TableCell>
                          <div className="font-mono text-sm text-white">
                            {log.sessionId?.slice(-8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-white">{log.userEmail}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500 text-white">
                            {log.sessionType === 'mock_interview' ? 'Mock Interview' : 'Real-Time Help'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {log.duration ? `${log.duration}m` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {log.hasIssues ? (
                              <AlertCircle className="w-4 h-4 text-red-400 mr-1" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-400 mr-1" />
                            )}
                            <span className={log.hasIssues ? 'text-red-400' : 'text-green-400'}>
                              {log.hasIssues ? 'Issues' : 'Normal'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
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

      {/* Add Note Modal - Simplified */}
      <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Support Note</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a note for user support tracking
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-gray-400">
            Support note form will be implemented here
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddNoteModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Add Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Credits Modal - Simplified */}
      <Dialog open={showAddCreditModal} onOpenChange={setShowAddCreditModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Issue Session Credits</DialogTitle>
            <DialogDescription className="text-gray-400">
              Grant temporary session credits to a user
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-gray-400">
            Credit issuance form will be implemented here
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddCreditModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Issue Credits
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 