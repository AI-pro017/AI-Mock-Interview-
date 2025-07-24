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
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Activity,
  RefreshCw
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SessionMonitoring() {
  const [sessions, setSessions] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchSessions();
    fetchLiveSessions();
    
    // Set up real-time updates for live sessions
    const interval = setInterval(fetchLiveSessions, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        console.log('✅ Fetched sessions:', data.length);
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch sessions: ${errorData.error}`);
        console.error('❌ Sessions fetch error:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setError(`Network error: ${error.message}`);
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
        console.log('✅ Fetched live sessions:', data.length);
      } else {
        const errorData = await response.json();
        console.error('❌ Live sessions fetch error:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
    }
  };

  // New handler functions for the buttons
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSessions();
    await fetchLiveSessions();
    setIsRefreshing(false);
  };

  const handleFilter = () => {
    setShowFilterDialog(true);
  };

  const handleExport = () => {
    try {
      // Create CSV content
      const csvContent = [
        // CSV headers
        ['Session ID', 'User', 'Type', 'Job Position', 'Duration (min)', 'Status', 'Date'].join(','),
        // CSV data rows
        ...sessions.map(session => [
          session.sessionId?.slice(-8) || 'N/A',
          session.userEmail || 'N/A',
          session.sessionType === 'mock_interview' ? 'Mock Interview' : 'Interview Copilot',
          session.jobPosition || 'N/A',
          Math.round(session.duration || 0),
          session.status || 'N/A',
          new Date(session.completedAt || session.startedAt).toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `session-history-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Session history exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
      setError('Failed to export session data');
    }
  };

  const applyFilter = (type) => {
    setFilterType(type);
    setShowFilterDialog(false);
  };

  // Filter sessions based on selected filter
  const filteredSessions = sessions.filter(session => {
    if (filterType === 'all') return true;
    if (filterType === 'mock_interview') return session.sessionType === 'mock_interview';
    if (filterType === 'interview_copilot') return session.sessionType === 'interview_copilot';
    return true;
  });

  const formatDuration = (minutes) => {
    const mins = Math.round(minutes || 0);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case 'mock_interview': return 'bg-blue-500';
      case 'interview_copilot': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSessionTypeLabel = (type) => {
    switch (type) {
      case 'mock_interview': return 'Mock Interview';
      case 'interview_copilot': return 'Interview Copilot';
      default: return type;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'abandoned': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const SessionDetailsModal = ({ session, isOpen, onClose }) => {
    if (!session) return null;

    const transcript = session.transcript ? JSON.parse(session.transcript) : [];
    const suggestions = session.suggestions ? JSON.parse(session.suggestions) : [];

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={`${getSessionTypeColor(session.sessionType)} text-white`}>
                {getSessionTypeLabel(session.sessionType)}
              </Badge>
              {session.jobPosition || 'General Session'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Session ID: {session.sessionId} • User: {session.userEmail}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Session Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Duration</div>
                <div className="font-medium">{formatDuration(session.duration)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <div className={`font-medium ${getStatusColor(session.status)}`}>
                  {session.status}
                </div>
              </div>
              {session.totalQuestions && (
                <div>
                  <div className="text-sm text-gray-400">Questions</div>
                  <div className="font-medium">
                    {session.questionsAnswered || 0} / {session.totalQuestions}
                  </div>
                </div>
              )}
              {session.averageResponseTime && (
                <div>
                  <div className="text-sm text-gray-400">Avg Response</div>
                  <div className="font-medium">{session.averageResponseTime}s</div>
                </div>
              )}
            </div>

            {/* Mock Interview Content */}
            {session.sessionType === 'mock_interview' && transcript.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">Interview Transcript</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {transcript.map((item, index) => (
                    <div key={index} className="border-l-2 border-blue-500 pl-4">
                      <div className="text-blue-400 text-sm font-medium">Q: {item.question}</div>
                      <div className="text-gray-300 text-sm mt-1">A: {item.answer}</div>
                      {item.feedback && (
                        <div className="text-yellow-400 text-xs mt-1">Feedback: {item.feedback}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview Copilot Content */}
            {session.sessionType === 'interview_copilot' && suggestions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">Copilot Suggestions</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded border-l-2 border-green-500">
                      <div className="text-green-400 text-sm font-medium">
                        {suggestion.timestamp && new Date(suggestion.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-gray-300 text-sm">{suggestion.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const FilterDialog = ({ isOpen, onClose }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Filter Sessions</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose which type of sessions to display
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => applyFilter('all')}
          >
            All Sessions
          </Button>
          <Button
            variant={filterType === 'mock_interview' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => applyFilter('mock_interview')}
          >
            <Badge className="bg-blue-500 text-white mr-2">Mock Interview</Badge>
            Mock Interviews Only
          </Button>
          <Button
            variant={filterType === 'interview_copilot' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => applyFilter('interview_copilot')}
          >
            <Badge className="bg-green-500 text-white mr-2">Interview Copilot</Badge>
            Interview Copilot Only
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setError(null);
                  fetchSessions();
                  fetchLiveSessions();
                }}
                className="ml-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Sessions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Play className="w-5 h-5 mr-2 text-green-400" />
              Live Sessions ({liveSessions.length})
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLiveSessions}
              className="border-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
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
                    <Badge className={`${getSessionTypeColor(session.sessionType)} text-white`}>
                      {getSessionTypeLabel(session.sessionType)}
                    </Badge>
                    <div className="flex items-center text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                      LIVE
                    </div>
                  </div>
                  <div className="text-white font-medium mb-1">
                    {session.jobPosition || 'General Interview'}
                  </div>
                  <div className="text-gray-400 text-sm mb-1">
                    Duration: {formatDuration(session.duration)}
                  </div>
                  <div className="text-gray-400 text-sm mb-2">
                    User: {session.userEmail}
                  </div>
                  {session.sessionType === 'mock_interview' && (
                    <div className="text-gray-400 text-xs">
                      Q&A: {session.questionsAnswered || 0}/{session.totalQuestions || 0}
                    </div>
                  )}
                  {session.sessionType === 'interview_copilot' && (
                    <div className="text-gray-400 text-xs">
                      Suggestions: {session.suggestionsCount || 0}
                    </div>
                  )}
                  <div className="mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
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
                Recent completed sessions with detailed analytics
                {filterType !== 'all' && (
                  <span className="ml-2 text-blue-400">
                    (Filtered: {filterType === 'mock_interview' ? 'Mock Interviews' : 'Interview Copilot'})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-gray-600"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFilter}
                className="border-gray-600"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="border-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading sessions...</div>
          ) : (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-750">
                  <TableRow>
                    <TableHead className="text-gray-300">Session</TableHead>
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Duration</TableHead>
                    <TableHead className="text-gray-300">Performance</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {session.jobPosition || 'General Session'}
                          </div>
                          <div className="text-sm text-gray-400">
                            {session.jobLevel && `${session.jobLevel} • `}
                            {session.industry}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {session.sessionId?.slice(-8)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{session.userEmail}</div>
                        {session.userName && (
                          <div className="text-sm text-gray-400">{session.userName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSessionTypeColor(session.sessionType)} text-white`}>
                          {getSessionTypeLabel(session.sessionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDuration(session.duration || 0)}
                      </TableCell>
                      <TableCell>
                        {session.sessionType === 'mock_interview' ? (
                          <div className="text-sm">
                            <div className="text-white">
                              {session.questionsAnswered || 0}/{session.totalQuestions || 0} Q&A
                            </div>
                            {session.averageResponseTime && (
                              <div className="text-gray-400">
                                Avg: {session.averageResponseTime}s
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="text-white">
                              {JSON.parse(session.suggestions || '[]').length} suggestions
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(session.completedAt || session.startedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSession(session)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Session Details Modal */}
      <SessionDetailsModal 
        session={selectedSession}
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
      />

      {/* Filter Dialog */}
      <FilterDialog 
        isOpen={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
      />
    </div>
  );
} 