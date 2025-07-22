"use client";

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  UserX, 
  UserCheck, 
  Gift,
  Crown,
  ArrowUpDown,
  X,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDialog from './ConfirmDialog';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Basic filters
  const [planFilter, setPlanFilter] = useState('all');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [joinDateFilter, setJoinDateFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [creditForm, setCreditForm] = useState({
    sessionType: 'mock_interview',
    credits: 1,
    reason: '',
    expiresInDays: 30
  });
  const [planForm, setPlanForm] = useState({
    newPlanId: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchAvailablePlans();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, planFilter, statusFilter, joinDateFilter, usageFilter, sortBy]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      console.log('🔍 Fetching available plans...');
      const response = await fetch('/api/admin/plans');
      console.log('📡 Plans API response status:', response.status);
      
      if (response.ok) {
        const plans = await response.json();
        console.log('📋 Available plans received:', plans);
        console.log('📊 Number of plans:', plans.length);
        setAvailablePlans(plans);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch plans:', response.status, errorText);
      }
    } catch (error) {
      console.error('💥 Error fetching plans:', error);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setSelectedUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    await fetchUserDetails(user.id);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user) => {
    setConfirmAction({
      type: 'delete',
      user: user,
      title: 'Delete User Account',
      description: `Are you sure you want to permanently delete ${user.name || user.email}? This action cannot be undone and will remove all user data including sessions, subscriptions, and history.`,
      confirmText: 'Delete Account',
      action: async () => {
        try {
          const response = await fetch(`/api/admin/users/${user.id}/delete`, {
            method: 'DELETE'
          });
          if (response.ok) {
            fetchUsers();
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
        }
      }
    });
    setShowConfirmDialog(true);
  };

  const handleDisableUser = (user) => {
    const isDisabling = !user.disabled;
    setConfirmAction({
      type: 'disable',
      user: user,
      title: isDisabling ? 'Disable User Account' : 'Enable User Account',
      description: isDisabling 
        ? `Are you sure you want to disable ${user.name || user.email}? They will not be able to sign in until you re-enable their account.`
        : `Are you sure you want to enable ${user.name || user.email}? They will be able to sign in and use the platform again.`,
      confirmText: isDisabling ? 'Disable Account' : 'Enable Account',
      action: async () => {
        try {
          const response = await fetch(`/api/admin/users/${user.id}/disable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              disable: isDisabling, 
              reason: `User ${isDisabling ? 'disabled' : 'enabled'} by admin` 
            })
          });
          if (response.ok) {
            fetchUsers();
            if (selectedUser && selectedUser.id === user.id) {
              fetchUserDetails(user.id);
            }
          }
        } catch (error) {
          console.error('Failed to toggle user status:', error);
        }
      }
    });
    setShowConfirmDialog(true);
  };

  const handleAddCredits = (user) => {
    setSelectedUser(user);
    setCreditForm({
      sessionType: 'mock_interview',
      credits: 1,
      reason: '',
      expiresInDays: 30
    });
    setShowCreditsModal(true);
  };

  const handleChangePlan = (user) => {
    console.log('🔄 Opening plan modal for user:', user.email);
    console.log('📋 Available plans in state:', availablePlans);
    setSelectedUser(user);
    setPlanForm({
      newPlanId: ''
    });
    setShowPlanModal(true);
  };

  const handleSubmitCredits = async () => {
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditForm)
      });
      
      if (response.ok) {
        setShowCreditsModal(false);
        fetchUsers();
        fetchUserDetails(selectedUser.id);
      }
    } catch (error) {
      console.error('Failed to add credits:', error);
    }
  };

  const handleSubmitPlanChange = async () => {
    if (!planForm.newPlanId) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planForm.newPlanId
        })
      });
      
      if (response.ok) {
        setShowPlanModal(false);
        fetchUsers();
        fetchUserDetails(selectedUser.id);
      } else {
        console.error('Failed to change plan:', await response.text());
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setPlanFilter('all');
    setStatusFilter('all');
    setJoinDateFilter('all');
    setUsageFilter('all');
    setSortBy('newest');
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(user => user.planName === planFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => !user.disabled);
      } else if (statusFilter === 'disabled') {
        filtered = filtered.filter(user => user.disabled);
      }
    }
    
    // Join date filter
    if (joinDateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (joinDateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(user => new Date(user.emailVerified) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(user => new Date(user.emailVerified) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(user => new Date(user.emailVerified) >= filterDate);
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          filtered = filtered.filter(user => new Date(user.emailVerified) >= filterDate);
          break;
      }
    }
    
    // Usage filter
    if (usageFilter !== 'all') {
      switch (usageFilter) {
        case 'active':
          filtered = filtered.filter(user => 
            (user.mockSessionsUsed > 0) || (user.realTimeSessionsUsed > 0)
          );
          break;
        case 'inactive':
          filtered = filtered.filter(user => 
            (!user.mockSessionsUsed || user.mockSessionsUsed === 0) && 
            (!user.realTimeSessionsUsed || user.realTimeSessionsUsed === 0)
          );
          break;
        case 'heavy':
          filtered = filtered.filter(user => 
            (user.mockSessionsUsed >= 5) || (user.realTimeSessionsUsed >= 5)
          );
          break;
        case 'quota_exceeded':
          filtered = filtered.filter(user => 
            (user.mockSessionsUsed >= user.mockSessionsLimit) || 
            (user.realTimeSessionsUsed >= user.realTimeSessionsLimit)
          );
          break;
      }
    }
    
    // Sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.emailVerified) - new Date(a.emailVerified));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.emailVerified) - new Date(b.emailVerified));
        break;
      case 'name':
        filtered.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
        break;
      case 'usage_high':
        filtered.sort((a, b) => 
          ((b.mockSessionsUsed || 0) + (b.realTimeSessionsUsed || 0)) - 
          ((a.mockSessionsUsed || 0) + (a.realTimeSessionsUsed || 0))
        );
        break;
      case 'usage_low':
        filtered.sort((a, b) => 
          ((a.mockSessionsUsed || 0) + (a.realTimeSessionsUsed || 0)) - 
          ((b.mockSessionsUsed || 0) + (b.realTimeSessionsUsed || 0))
        );
        break;
    }
    
    setFilteredUsers(filtered);
  };

  const getPlanBadgeColor = (planName) => {
    switch (planName) {
      case 'freemium': return 'bg-gray-500';
      case 'starter': return 'bg-blue-500';
      case 'pro': return 'bg-purple-500';
      case 'unlimited': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (planFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (joinDateFilter !== 'all') count++;
    if (usageFilter !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">User Management</CardTitle>
          <CardDescription className="text-gray-400">
            Manage user accounts, subscriptions, and access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Basic Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="freemium">Freemium</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="unlimited">Unlimited</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 relative"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              More Filters
              {getActiveFiltersCount() > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1 py-0">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="bg-gray-700 p-4 rounded-lg mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Advanced Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-gray-600 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Join Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Joined</label>
                  <Select value={joinDateFilter} onValueChange={setJoinDateFilter}>
                    <SelectTrigger className="bg-gray-600 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Usage Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Usage</label>
                  <Select value={usageFilter} onValueChange={setUsageFilter}>
                    <SelectTrigger className="bg-gray-600 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active Users</SelectItem>
                      <SelectItem value="inactive">Inactive Users</SelectItem>
                      <SelectItem value="heavy">Heavy Users (5+ sessions)</SelectItem>
                      <SelectItem value="quota_exceeded">Quota Exceeded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-gray-600 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="usage_high">Usage (High to Low)</SelectItem>
                      <SelectItem value="usage_low">Usage (Low to High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                <div className="text-sm text-gray-400">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-750">
                <TableRow>
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Plan</TableHead>
                  <TableHead className="text-gray-300">Usage</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-gray-700">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.disabled ? 'bg-red-600' : 'bg-blue-600'
                        }`}>
                          <span className="text-white font-semibold">
                            {user.name?.charAt(0) || user.email?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className={`font-medium ${user.disabled ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {user.name || 'No name'}
                          </div>
                          <div className={`text-sm ${user.disabled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPlanBadgeColor(user.planName)} text-white`}>
                        {user.planDisplayName || 'Freemium'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-white">Mock: {user.mockSessionsUsed || 0}/{user.mockSessionsLimit || '∞'}</div>
                        <div className="text-gray-400">RT: {user.realTimeSessionsUsed || 0}/{user.realTimeSessionsLimit || '∞'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.disabled ? 'bg-red-500' : 'bg-green-500'}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDate(user.emailVerified)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete User"
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

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {users.length === 0 ? 'No users found.' : 'No users match your current filters.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              View and manage user information
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                  <p className="text-white">{selectedUser.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Current Plan</label>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getPlanBadgeColor(selectedUser.planName)} text-white`}>
                      {selectedUser.planDisplayName || 'Freemium'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 p-1"
                      onClick={() => handleChangePlan(selectedUser)}
                      title="Change Plan"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <Badge className={selectedUser.disabled ? 'bg-red-500' : 'bg-green-500'}>
                    {selectedUser.disabled ? 'Disabled' : 'Active'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Member Since</label>
                  <p className="text-white">{formatDate(selectedUser.emailVerified)}</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Mock Interviews</h4>
                  <p className="text-2xl font-bold text-blue-400">
                    {selectedUser.mockSessionsUsed || 0}
                  </p>
                  <p className="text-sm text-gray-400">
                    of {selectedUser.mockSessionsLimit || '∞'} used
                  </p>
                  {selectedUser.mockCreditsAvailable > 0 && (
                    <p className="text-sm text-green-400">
                      +{selectedUser.mockCreditsAvailable} credits available
                    </p>
                  )}
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Real-Time Sessions</h4>
                  <p className="text-2xl font-bold text-green-400">
                    {selectedUser.realTimeSessionsUsed || 0}
                  </p>
                  <p className="text-sm text-gray-400">
                    of {selectedUser.realTimeSessionsLimit || '∞'} used
                  </p>
                  {selectedUser.realTimeCreditsAvailable > 0 && (
                    <p className="text-sm text-green-400">
                      +{selectedUser.realTimeCreditsAvailable} credits available
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between">
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    className="border-gray-600"
                    onClick={() => handleAddCredits(selectedUser)}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Add Credits
                  </Button>
                </div>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    className={`${
                      selectedUser.disabled 
                        ? 'border-green-600 text-green-400' 
                        : 'border-red-600 text-red-400'
                    }`}
                    onClick={() => {
                      setShowUserModal(false);
                      handleDisableUser(selectedUser);
                    }}
                  >
                    {selectedUser.disabled ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Enable Account
                      </>
                    ) : (
                      <>
                        <UserX className="w-4 h-4 mr-2" />
                        Disable Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Credits Modal */}
      <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Session Credits</DialogTitle>
            <DialogDescription className="text-gray-400">
              Grant temporary session credits to {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Session Type</label>
              <Select value={creditForm.sessionType} onValueChange={(value) => setCreditForm({...creditForm, sessionType: value})}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="mock_interview">Mock Interview</SelectItem>
                  <SelectItem value="real_time_help">Real-Time Help</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Number of Credits</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={creditForm.credits}
                onChange={(e) => setCreditForm({...creditForm, credits: parseInt(e.target.value)})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Reason</label>
              <Input
                value={creditForm.reason}
                onChange={(e) => setCreditForm({...creditForm, reason: e.target.value})}
                placeholder="e.g., Technical issues compensation"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Expires in Days</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={creditForm.expiresInDays}
                onChange={(e) => setCreditForm({...creditForm, expiresInDays: parseInt(e.target.value)})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowCreditsModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmitCredits}>
              Add Credits
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Plan Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Change User Plan</DialogTitle>
            <DialogDescription className="text-gray-400">
              Manually upgrade or downgrade {selectedUser?.email}'s subscription plan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Current Plan</label>
              <Badge className={`${getPlanBadgeColor(selectedUser?.planName)} text-white`}>
                {selectedUser?.planDisplayName || 'Freemium'}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">New Plan</label>
              <div className="mb-2 text-xs text-gray-500">
                Debug: {availablePlans.length} plans available
              </div>
              <Select value={planForm.newPlanId} onValueChange={(value) => {
                console.log('🎯 Plan selected:', value);
                setPlanForm({...planForm, newPlanId: value});
              }}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select new plan" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {availablePlans.length === 0 ? (
                    <SelectItem value="no-plans" disabled className="text-gray-500">
                      No plans available
                    </SelectItem>
                  ) : (
                    availablePlans.map((plan) => {
                      console.log('🏷️ Rendering plan:', plan);
                      return (
                        <SelectItem key={plan.id} value={plan.id.toString()} className="text-white hover:bg-gray-700">
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.display_name}</span>
                            <span className="text-gray-400 ml-4">
                              {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            {planForm.newPlanId && planForm.newPlanId !== 'no-plans' && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-2">Plan Comparison</h4>
                {(() => {
                  const newPlan = availablePlans.find(p => p.id.toString() === planForm.newPlanId);
                  if (!newPlan) return <p className="text-gray-400">Plan not found</p>;
                  return (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Mock Sessions:</p>
                        <p className="text-white">
                          {selectedUser?.mockSessionsLimit || 2} → {newPlan.mock_sessions_limit === -1 ? '∞' : newPlan.mock_sessions_limit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Real-Time Help:</p>
                        <p className="text-white">
                          {selectedUser?.realTimeSessionsLimit || 2} → {newPlan.real_time_help_limit === -1 ? '∞' : newPlan.real_time_help_limit}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              onClick={handleSubmitPlanChange}
              disabled={!planForm.newPlanId || planForm.newPlanId === 'no-plans'}
            >
              <Crown className="w-4 h-4 mr-2" />
              Change Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmText={confirmAction?.confirmText}
        onConfirm={confirmAction?.action}
        destructive={confirmAction?.type === 'delete' || confirmAction?.type === 'disable'}
      />
    </div>
  );
}