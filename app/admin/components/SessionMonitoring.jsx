"use client";

import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Clock, 
  User, 
  MessageSquare,
  TrendingUp,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SessionMonitoring() {
  const [sessions, setSessions] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    fetchLiveSessions();
    
    // Set up real-time updates for live sessions
    const interval = setInterval(fetchLiveSessions, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions/live');
      if (response.ok) {
        const data = await response.json();
        setLiveSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case 'mock_interview': return 'bg-blue-500';
      case 'real_time_help': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Sessions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Play className="w-5 h-5 mr-2 text-green-400" />
            Live Sessions ({liveSessions.length})
          </CardTitle>
          <CardDescription className="text-gray-400">
            Currently active sessions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liveSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveSessions.map((session) => (
                <div key={session.id} className="bg-gray-700 p-4 rounded-lg border border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${getSessionTypeColor(session.type)} text-white`}>
                      {session.type === 'mock_interview' ? 'Mock Interview' : 'Real-Time Help'}
                    </Badge>
                    <div className="flex items-center text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                      LIVE
                    </div>
                  </div>
                  <div className="text-white font-medium mb-1">
                    {session.jobPosition || 'General Interview'}
                  </div>
                  <div className="text-gray-400 text-sm mb-2">
                    Duration: {formatDuration(session.duration)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    User: {session.userEmail}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No live sessions currently active
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">Session History</CardTitle>
              <CardDescription className="text-gray-400">
                Recent completed sessions and their details
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="border-gray-600">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="border-gray-600">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-gray-400">Loading sessions...</div>
          ) : (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-750">
                  <TableRow>
                    <TableHead className="text-gray-300">Session</TableHead>
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Duration</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {session.jobPosition || 'General Session'}
                          </div>
                          <div className="text-sm text-gray-400">
                            ID: {session.sessionId?.slice(-8)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{session.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSessionTypeColor(session.sessionType)} text-white`}>
                          {session.sessionType === 'mock_interview' ? 'Mock' : 'Real-Time'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDuration(session.duration || 0)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(session.usedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* Open session details */}}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 