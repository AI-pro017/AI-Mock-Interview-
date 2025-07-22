"use client";

import { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  FileText, 
  BarChart3,
  Users,
  DollarSign,
  Activity,
  Filter,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function ReportsExport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [exportFormat, setExportFormat] = useState('csv');

  const reportTypes = [
    {
      id: 'user-activity',
      name: 'User Activity Report',
      description: 'User registrations, sessions, and engagement metrics',
      icon: <Users className="w-5 h-5 text-blue-400" />,
      category: 'Users'
    },
    {
      id: 'revenue-analysis',
      name: 'Revenue Analysis',
      description: 'Subscription revenue, conversions, and financial metrics',
      icon: <DollarSign className="w-5 h-5 text-green-400" />,
      category: 'Revenue'
    },
    {
      id: 'session-analytics',
      name: 'Session Analytics',
      description: 'Mock interview and copilot session statistics',
      icon: <Activity className="w-5 h-5 text-purple-400" />,
      category: 'Sessions'
    },
    {
      id: 'conversion-funnel',
      name: 'Conversion Funnel',
      description: 'User journey from signup to paid subscription',
      icon: <BarChart3 className="w-5 h-5 text-orange-400" />,
      category: 'Analytics'
    },
    {
      id: 'usage-patterns',
      name: 'Usage Patterns',
      description: 'Feature usage, peak times, and user behavior',
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      category: 'Analytics'
    },
    {
      id: 'support-metrics',
      name: 'Support Metrics',
      description: 'Support tickets, response times, and user satisfaction',
      icon: <FileText className="w-5 h-5 text-yellow-400" />,
      category: 'Support'
    }
  ];

  const generateReport = async () => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedReport,
          dateRange,
          format: exportFormat
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport}-${dateRange}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReportsByCategory = (category) => {
    return reportTypes.filter(report => report.category === category);
  };

  const categories = [...new Set(reportTypes.map(report => report.category))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports & Export</h2>
          <p className="text-gray-400">Generate and download platform analytics reports</p>
        </div>
      </div>

      {/* Report Generation */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Generate Report</CardTitle>
          <CardDescription className="text-gray-400">
            Select report type, date range, and format to generate custom reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Report Type
              </label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Select report..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {reportTypes.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Format
              </label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateReport}
                disabled={loading || !selectedReport}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedReport && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                {reportTypes.find(r => r.id === selectedReport)?.icon}
                <div>
                  <h4 className="font-medium text-white">
                    {reportTypes.find(r => r.id === selectedReport)?.name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {reportTypes.find(r => r.id === selectedReport)?.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Reports by Category */}
      <div className="space-y-6">
        {categories.map((category) => (
          <Card key={category} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">{category} Reports</CardTitle>
              <CardDescription className="text-gray-400">
                Available {category.toLowerCase()} analytics and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getReportsByCategory(category).map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedReport === report.id
                        ? 'bg-blue-900/30 border-blue-600'
                        : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {report.icon}
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{report.name}</h4>
                        <p className="text-sm text-gray-400">{report.description}</p>
                        <Badge 
                          variant="outline" 
                          className="mt-2 text-xs"
                        >
                          {report.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Reports</CardTitle>
          <CardDescription className="text-gray-400">
            Recently generated reports and downloads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent reports generated</p>
            <p className="text-sm">Generated reports will appear here for easy re-download</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 