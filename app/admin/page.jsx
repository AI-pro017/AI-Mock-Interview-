"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Settings,
  FileText,
  MessageSquare,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from './components/UserManagement';
import SessionMonitoring from './components/SessionMonitoring';
import SubscriptionAnalytics from './components/SubscriptionAnalytics';
import ContentManagement from './components/ContentManagement';
import SupportTools from './components/SupportTools';
import ReportsExport from './components/ReportsExport';
import AdminHeader from './components/AdminHeader';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({});
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/sign-in');
      return;
    }

    // Check admin authorization
    checkAdminAuth();
  }, [session, status, router]);

  const checkAdminAuth = async () => {
    try {
      console.log('🔍 Checking admin auth...');
      const response = await fetch('/api/admin/auth/check');
      const data = await response.json();
      
      console.log('📋 Auth response:', { status: response.status, data });
      
      if (response.ok) {
        setIsAuthorized(data.authorized);
        if (data.authorized) {
          fetchDashboardStats();
        }
      } else {
        setIsAuthorized(false);
        setDebugInfo(data.debug || 'Unknown error');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthorized(false);
      setDebugInfo(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const stats = await response.json();
        setDashboardStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin portal...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">You don't have permission to access the admin portal.</p>
          
          {/* Debug Information */}
          {debugInfo && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">Debug Info:</h3>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                {typeof debugInfo === 'object' ? JSON.stringify(debugInfo, null, 2) : debugInfo}
              </pre>
            </div>
          )}
          
          {/* Session Info */}
          {session && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Session Info:</h3>
              <pre className="text-xs text-gray-300">
                User ID: {session.user?.id}
                Email: {session.user?.email}
                Name: {session.user?.name}
              </pre>
            </div>
          )}
          
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminHeader />
      
      <div className="container mx-auto px-6 py-8">
        {/* Dashboard Overview */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Monitor and manage your AI Mock Interview platform</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dashboardStats.totalUsers || 0}</div>
              <p className="text-xs text-gray-500">
                +{dashboardStats.newUsersThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dashboardStats.activeSessions || 0}</div>
              <p className="text-xs text-gray-500">
                {dashboardStats.sessionsToday || 0} today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${dashboardStats.monthlyRevenue || 0}</div>
              <p className="text-xs text-gray-500">
                +{dashboardStats.revenueGrowth || 0}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dashboardStats.conversionRate || 0}%</div>
              <p className="text-xs text-gray-500">
                Free to paid conversions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Interface */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-blue-600">
              <Activity className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-blue-600">
              <DollarSign className="w-4 h-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionMonitoring />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionAnalytics />
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="support">
            <SupportTools />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsExport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 