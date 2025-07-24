"use client";

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SubscriptionAnalytics() {
  const [analytics, setAnalytics] = useState({});
  const [planDistribution, setPlanDistribution] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/subscriptions?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.overview);
        setPlanDistribution(data.planDistribution);
        setRevenueData(data.revenueData);
      }
    } catch (error) {
      console.error('Failed to fetch subscription analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Create comprehensive CSV data
      const csvData = [];
      
      // Add overview metrics
      csvData.push(['Subscription Analytics Report']);
      csvData.push(['Generated:', new Date().toLocaleString()]);
      csvData.push(['Time Range:', timeRange]);
      csvData.push(['']); // Empty row
      
      // Overview metrics
      csvData.push(['Overview Metrics']);
      csvData.push(['Metric', 'Value']);
      csvData.push(['Monthly Revenue', formatCurrency(analytics.monthlyRevenue || 0)]);
      csvData.push(['Revenue Growth', formatPercentage(analytics.revenueGrowth || 0)]);
      csvData.push(['Paid Subscribers', analytics.paidSubscribers || 0]);
      csvData.push(['Subscriber Growth', formatPercentage(analytics.subscriberGrowth || 0)]);
      csvData.push(['Conversion Rate', `${analytics.conversionRate || 0}%`]);
      csvData.push(['Avg Revenue Per User', formatCurrency(analytics.arpu || 0)]);
      csvData.push(['']); // Empty row
      
      // Plan distribution
      csvData.push(['Plan Distribution']);
      csvData.push(['Plan', 'Users', 'Monthly Revenue', 'Percentage']);
      planDistribution.forEach(plan => {
        csvData.push([
          plan.displayName,
          plan.userCount,
          formatCurrency(plan.monthlyRevenue),
          `${plan.percentage}%`
        ]);
      });
      csvData.push(['']); // Empty row
      
      // Recent subscription changes
      csvData.push(['Recent Subscription Changes']);
      csvData.push(['User Email', 'Change Type', 'From Plan', 'To Plan', 'Revenue Impact', 'Date']);
      revenueData.forEach(change => {
        csvData.push([
          change.userEmail,
          change.type,
          change.fromPlan,
          change.toPlan,
          formatCurrency(change.revenueImpact),
          new Date(change.date).toLocaleDateString()
        ]);
      });
      
      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `subscription-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Subscription analytics exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getPlanColor = (planName) => {
    switch (planName) {
      case 'freemium': return 'bg-gray-500';
      case 'starter': return 'bg-blue-500';
      case 'pro': return 'bg-purple-500';
      case 'unlimited': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscription Analytics</h2>
          <p className="text-gray-400">Monitor revenue, conversions, and plan distribution</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting}
            className="border-gray-600"
          >
            <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(analytics.monthlyRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-gray-500">
              {analytics.revenueGrowth >= 0 ? (
                <ArrowUpRight className="w-3 h-3 mr-1 text-green-400" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1 text-red-400" />
              )}
              <span className={analytics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPercentage(analytics.revenueGrowth || 0)}
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Paid Subscribers</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.paidSubscribers || 0}</div>
            <div className="flex items-center text-xs text-gray-500">
              {analytics.subscriberGrowth >= 0 ? (
                <ArrowUpRight className="w-3 h-3 mr-1 text-green-400" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1 text-red-400" />
              )}
              <span className={analytics.subscriberGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPercentage(analytics.subscriberGrowth || 0)}
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.conversionRate || 0}%</div>
            <p className="text-xs text-gray-500">Free to paid conversion</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Revenue Per User</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(analytics.arpu || 0)}
            </div>
            <p className="text-xs text-gray-500">Monthly ARPU</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Plan Distribution</CardTitle>
          <CardDescription className="text-gray-400">
            Number of users by subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {planDistribution.map((plan) => (
              <div key={plan.name} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`${getPlanColor(plan.name)} text-white`}>
                    {plan.displayName}
                  </Badge>
                  <span className="text-white font-semibold">{plan.userCount}</span>
                </div>
                <div className="text-sm text-gray-400">
                  {formatCurrency(plan.monthlyRevenue)} / month
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {plan.percentage}% of total users
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Subscription Changes */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Subscription Changes</CardTitle>
          <CardDescription className="text-gray-400">
            Latest upgrades, downgrades, and cancellations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-750">
                <TableRow>
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Change</TableHead>
                  <TableHead className="text-gray-300">From → To</TableHead>
                  <TableHead className="text-gray-300">Revenue Impact</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData.map((change, index) => (
                  <TableRow key={index} className="border-gray-700">
                    <TableCell>
                      <div className="text-white">{change.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          change.type === 'upgrade' ? 'bg-green-500' :
                          change.type === 'downgrade' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }
                      >
                        {change.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {change.fromPlan} → {change.toPlan}
                    </TableCell>
                    <TableCell>
                      <span className={
                        change.revenueImpact > 0 ? 'text-green-400' : 
                        change.revenueImpact < 0 ? 'text-red-400' : 
                        'text-gray-400'
                      }>
                        {change.revenueImpact > 0 ? '+' : ''}{formatCurrency(change.revenueImpact)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(change.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}