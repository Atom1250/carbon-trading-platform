'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

// Mock data for portfolio
const mockPortfolio = {
  totalValue: 2456789.50,
  cashBalance: 456789.50,
  tokenHoldings: 2000000.00,
  allocation: [
    { type: 'Carbon Credits', value: 1200000.00, percentage: 48.8 },
    { type: 'Renewable Energy', value: 800000.00, percentage: 32.5 },
    { type: 'Cash', value: 456789.50, percentage: 18.6 },
  ],
  performance: {
    daily: 2.3,
    weekly: 5.7,
    monthly: 12.4,
    yearly: 34.2,
  },
};

// Mock data for token holdings
const mockTokenHoldings = [
  { id: '1', assetName: 'Carbon Credit - Forest Conservation', symbol: 'CC-FC', quantity: 5000, currentPrice: 120.00, totalValue: 600000.00, change24h: 2.5 },
  { id: '2', assetName: 'Solar Energy Token', symbol: 'SET', quantity: 10000, currentPrice: 80.00, totalValue: 800000.00, change24h: -1.2 },
  { id: '3', assetName: 'Wind Energy Token', symbol: 'WET', quantity: 8000, currentPrice: 100.00, totalValue: 800000.00, change24h: 3.8 },
];

// Mock data for available assets
const mockAvailableAssets = [
  { id: '1', name: 'Reforestation Carbon Credit', type: 'carbon_credit', price: 125.00, available: 50000, vintage: '2024', change24h: 1.8 },
  { id: '2', name: 'Hydro Energy Token', type: 'renewable_energy', price: 95.00, available: 100000, vintage: '2024', change24h: -0.5 },
  { id: '3', name: 'Ocean Conservation Credit', type: 'carbon_credit', price: 110.00, available: 30000, vintage: '2023', change24h: 2.1 },
  { id: '4', name: 'Geothermal Energy Token', type: 'renewable_energy', price: 105.00, available: 25000, vintage: '2024', change24h: 4.2 },
];

// Mock data for recent trades
const mockRecentTrades = [
  { id: '1', date: '2024-02-19', time: '14:30', asset: 'Carbon Credit - Forest Conservation', side: 'buy', quantity: 1000, price: 118.50, total: 118500.00, status: 'settled' },
  { id: '2', date: '2024-02-18', time: '11:15', asset: 'Solar Energy Token', side: 'buy', quantity: 2000, price: 81.00, total: 162000.00, status: 'settled' },
  { id: '3', date: '2024-02-17', time: '16:45', asset: 'Wind Energy Token', side: 'sell', quantity: 500, price: 98.50, total: 49250.00, status: 'settled' },
  { id: '4', date: '2024-02-16', time: '09:20', asset: 'Carbon Credit - Forest Conservation', side: 'buy', quantity: 1500, price: 115.00, total: 172500.00, status: 'settled' },
  { id: '5', date: '2024-02-15', time: '13:00', asset: 'Solar Energy Token', side: 'buy', quantity: 3000, price: 79.50, total: 238500.00, status: 'settled' },
];

// Simple Line Chart Component (mock implementation without Chart.js dependency)
function PerformanceChart() {
  const chartData = [
    { month: 'Sep', value: 1800000 },
    { month: 'Oct', value: 1950000 },
    { month: 'Nov', value: 2100000 },
    { month: 'Dec', value: 2200000 },
    { month: 'Jan', value: 2350000 },
    { month: 'Feb', value: 2456789.50 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>${(maxValue / 1000000).toFixed(2)}M</span>
        <span>Portfolio Value (6 months)</span>
      </div>
      <div className="relative h-48 flex items-end justify-between gap-2">
        {chartData.map((point, index) => {
          const height = ((point.value - minValue) / range) * 100;
          return (
            <div key={point.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gray-200 rounded-t" style={{ height: `${height}%`, minHeight: '4px' }}>
                <div className="w-full h-full bg-green-500 rounded-t" />
              </div>
              <span className="text-xs text-gray-600">{point.month}</span>
            </div>
          );
        })}
      </div>
      <div className="text-sm text-gray-600">
        <span>${(minValue / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
}

// Allocation Pie Chart Component (mock implementation)
function AllocationChart({ allocation }: { allocation: typeof mockPortfolio.allocation }) {
  const colors = ['#10b981', '#3b82f6', '#6b7280'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          {allocation.map((item, index) => {
            const startAngle = allocation.slice(0, index).reduce((sum, a) => sum + (a.percentage * 3.6), 0);
            const endAngle = startAngle + (item.percentage * 3.6);

            return (
              <div
                key={item.type}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${colors[index]} ${startAngle}deg ${endAngle}deg, transparent ${endAngle}deg)`,
                }}
              />
            );
          })}
          <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold">${(mockPortfolio.totalValue / 1000000).toFixed(2)}M</p>
              <p className="text-xs text-gray-600">Total Value</p>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {allocation.map((item, index) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index] }} />
              <span className="text-sm">{item.type}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">${(item.value / 1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-600">{item.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Portfolio Summary Card
function PortfolioSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Summary</CardTitle>
        <CardDescription>Your total holdings and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold">${mockPortfolio.totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cash Balance</p>
              <p className="text-2xl font-bold">${mockPortfolio.cashBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token Holdings</p>
              <p className="text-2xl font-bold">${mockPortfolio.tokenHoldings.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">30d Return</p>
              <p className="text-2xl font-bold text-green-600">+{mockPortfolio.performance.monthly}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-4">Performance</h3>
              <PerformanceChart />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Allocation</h3>
              <AllocationChart allocation={mockPortfolio.allocation} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Token Holdings Card
function TokenHoldings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Token Holdings</CardTitle>
        <CardDescription>Current positions and values</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">24h Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTokenHoldings.map((holding) => (
              <TableRow key={holding.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{holding.assetName}</p>
                    <p className="text-sm text-gray-600">{holding.symbol}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">{holding.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">${holding.currentPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">${holding.totalValue.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={holding.change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {holding.change24h >= 0 ? '+' : ''}{holding.change24h}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Available Assets Card
function AvailableAssets() {
  const [assetType, setAssetType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = mockAvailableAssets.filter((asset) => {
    const matchesType = assetType === 'all' || asset.type === assetType;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const assetTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'carbon_credit', label: 'Carbon Credits' },
    { value: 'renewable_energy', label: 'Renewable Energy' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Assets</CardTitle>
        <CardDescription>Browse and purchase carbon credits and tokens</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              options={assetTypeOptions}
              value={assetType}
              onValueChange={setAssetType}
              placeholder="Filter by type..."
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-gray-600">Vintage {asset.vintage}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={asset.type === 'carbon_credit' ? 'success' : 'primary'}>
                      {asset.type === 'carbon_credit' ? 'Carbon Credit' : 'Renewable Energy'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${asset.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{asset.available.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => alert(`Purchase ${asset.name}`)}>
                      Buy
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Trades Card
function RecentTrades() {
  const [filterSide, setFilterSide] = useState<string>('all');

  const filteredTrades = mockRecentTrades.filter((trade) => {
    return filterSide === 'all' || trade.side === filterSide;
  });

  const tradeFilterOptions = [
    { value: 'all', label: 'All Trades' },
    { value: 'buy', label: 'Buy Only' },
    { value: 'sell', label: 'Sell Only' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
        <CardDescription>Your transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Select
              options={tradeFilterOptions}
              value={filterSide}
              onValueChange={setFilterSide}
              placeholder="Filter trades..."
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{trade.date}</p>
                      <p className="text-sm text-gray-600">{trade.time}</p>
                    </div>
                  </TableCell>
                  <TableCell>{trade.asset}</TableCell>
                  <TableCell>
                    <Badge variant={trade.side === 'buy' ? 'success' : 'warning'}>
                      {trade.side.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{trade.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${trade.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${trade.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="success">
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export default function InvestorDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Investor Dashboard</h1>
        <p className="text-gray-600">Manage your portfolio and track performance</p>
      </div>

      <PortfolioSummary />
      <TokenHoldings />
      <AvailableAssets />
      <RecentTrades />
    </div>
  );
}
