import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { SwiftMessage } from '../types';
import { toast } from 'react-hot-toast';

interface ReportsProps {
  messages: SwiftMessage[];
}

const COLORS = {
  primary: '#008766',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6'
};

const ITEMS_PER_PAGE = 15;

export function Reports({ messages }: ReportsProps) {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'amount' | 'count'>('count');

  // Calculate statistics
  const totalMessages = messages.length;
  const flaggedMessages = messages.filter(m => m.status === 'flagged').length;
  const processingMessages = messages.filter(m => m.status === 'processing').length;
  const clearMessages = messages.filter(m => m.status === 'clear').length;

  const totalAmount = messages.reduce((sum, msg) => sum + parseFloat(msg.amount), 0);
  const averageAmount = totalAmount / (messages.length || 1);

  const flaggedPercentage = (flaggedMessages / totalMessages) * 100 || 0;
  const clearPercentage = (clearMessages / totalMessages) * 100 || 0;

  const statusData = [
    { name: 'Clear', value: clearMessages, color: COLORS.success },
    { name: 'Flagged', value: flaggedMessages, color: COLORS.danger },
    { name: 'Processing', value: processingMessages, color: COLORS.warning },
  ];

  // Calculate daily message counts and amounts for the charts
  const getDailyData = () => {
    const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMessages = messages.filter(m => m.date.startsWith(dateStr));
      const dayAmount = dayMessages.reduce((sum, msg) => sum + parseFloat(msg.amount), 0);
      
      data.push({
        date: dateStr,
        total: dayMessages.length,
        amount: dayAmount,
        flagged: dayMessages.filter(m => m.status === 'flagged').length,
        processing: dayMessages.filter(m => m.status === 'processing').length,
      });
    }
    
    return data;
  };

  const handleExport = () => {
    try {
      setIsExporting(true);
      const csvContent = [
        ['Date', 'Reference', 'Sender', 'Receiver', 'Amount', 'Currency', 'Status', 'Notes'].join(','),
        ...messages.map(message => [
          message.date,
          message.transactionRef,
          `"${message.sender.name}"`,
          `"${message.receiver.name}"`,
          message.amount,
          message.currency,
          message.status,
          `"${message.notes || ''}"`,
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {trend.value}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Analytics & Reports
        </h2>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055] disabled:opacity-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Messages"
          value={totalMessages}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatCard
          title="Flagged Messages"
          value={flaggedMessages}
          icon={AlertTriangle}
          color="bg-red-500"
          trend={{ value: flaggedPercentage.toFixed(1), isPositive: false }}
        />
        <StatCard
          title="Clear Messages"
          value={clearMessages}
          icon={CheckCircle}
          color="bg-green-500"
          trend={{ value: clearPercentage.toFixed(1), isPositive: true }}
        />
        <StatCard
          title="Processing"
          value={processingMessages}
          icon={Clock}
          color="bg-yellow-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Message Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Status Distribution</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total: {totalMessages}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Volume Over Time */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {selectedMetric === 'count' ? 'Message Volume' : 'Transaction Amount'}
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedMetric('count')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedMetric === 'count'
                      ? 'bg-[#008766] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Count
                </button>
                <button
                  onClick={() => setSelectedMetric('amount')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedMetric === 'amount'
                      ? 'bg-[#008766] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Amount
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDateRange('week')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    dateRange === 'week'
                      ? 'bg-[#008766] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setDateRange('month')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    dateRange === 'month'
                      ? 'bg-[#008766] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setDateRange('year')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    dateRange === 'year'
                      ? 'bg-[#008766] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Year
                </button>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {selectedMetric === 'count' ? (
                <BarChart data={getDailyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill={COLORS.primary} />
                  <Bar dataKey="flagged" fill={COLORS.danger} />
                  <Bar dataKey="processing" fill={COLORS.warning} />
                </BarChart>
              ) : (
                <LineChart data={getDailyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke={COLORS.primary} strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Average Transaction Amount</p>
            <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
              ${averageAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Flagged Rate</p>
            <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
              {flaggedPercentage.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Clear Rate</p>
            <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
              {clearPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
