'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';

export default function DeveloperDashboard() {
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
      </div>

      {/* API Keys Section */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">API Keys</h2>
          <Button onClick={() => setShowCreateKeyDialog(true)}>Create API Key</Button>
        </div>
        <APIKeysList />
      </Card>

      {/* Webhooks Section */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Webhooks</h2>
          <Button onClick={() => setShowWebhookDialog(true)}>Add Webhook</Button>
        </div>
        <WebhooksList />
      </Card>

      {/* Rate Limits Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Rate Limits</h2>
        <RateLimits />
      </Card>

      {/* Activity Logs Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Activity Logs</h2>
        <ActivityLogs />
      </Card>

      {/* API Documentation Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
        <APIDocumentation />
      </Card>

      {/* Create API Key Dialog */}
      <CreateAPIKeyDialog open={showCreateKeyDialog} onClose={() => setShowCreateKeyDialog(false)} />

      {/* Add Webhook Dialog */}
      <AddWebhookDialog open={showWebhookDialog} onClose={() => setShowWebhookDialog(false)} />
    </div>
  );
}

function APIKeysList() {
  const mockKeys = [
    { id: '1', name: 'Production Key', key: 'pk_live_•••••••••••••••••', created: '2024-01-15', lastUsed: '2024-02-19' },
    { id: '2', name: 'Development Key', key: 'pk_test_•••••••••••••••••', created: '2024-01-10', lastUsed: '2024-02-18' },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>API Key</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockKeys.map((key) => (
          <TableRow key={key.id}>
            <TableCell>{key.name}</TableCell>
            <TableCell>{key.key}</TableCell>
            <TableCell>{key.created}</TableCell>
            <TableCell>{key.lastUsed}</TableCell>
            <TableCell>
              <Button variant="danger" size="sm" onClick={() => alert(`Revoke ${key.name}`)}>
                Revoke
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WebhooksList() {
  const mockWebhooks = [
    { id: '1', url: 'https://api.example.com/webhooks/trades', events: ['trade.created', 'trade.settled'], status: 'active' },
    { id: '2', url: 'https://api.example.com/webhooks/assets', events: ['asset.minted'], status: 'active' },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Endpoint URL</TableHead>
          <TableHead>Events</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockWebhooks.map((webhook) => (
          <TableRow key={webhook.id}>
            <TableCell>{webhook.url}</TableCell>
            <TableCell>{webhook.events.join(', ')}</TableCell>
            <TableCell>{webhook.status}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => alert(`Edit ${webhook.url}`)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => alert(`Delete ${webhook.url}`)}>
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RateLimits() {
  const limits = [
    { endpoint: '/api/v1/assets', limit: 1000, used: 234, remaining: 766, resetAt: '2024-02-20 00:00:00' },
    { endpoint: '/api/v1/trading/rfq', limit: 500, used: 89, remaining: 411, resetAt: '2024-02-20 00:00:00' },
    { endpoint: '/api/v1/auth/*', limit: 100, used: 12, remaining: 88, resetAt: '2024-02-20 00:00:00' },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Endpoint</TableHead>
          <TableHead>Limit</TableHead>
          <TableHead>Used</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Resets At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {limits.map((limit) => (
          <TableRow key={limit.endpoint}>
            <TableCell>{limit.endpoint}</TableCell>
            <TableCell>{limit.limit}/hour</TableCell>
            <TableCell>
              <span className={limit.used / limit.limit > 0.8 ? 'text-danger-600' : ''}>
                {limit.used}
              </span>
            </TableCell>
            <TableCell>{limit.remaining}</TableCell>
            <TableCell>{limit.resetAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ActivityLogs() {
  const [filter, setFilter] = useState('');

  const mockLogs = [
    { id: '1', timestamp: '2024-02-19 14:23:15', method: 'GET', endpoint: '/api/v1/assets', status: 200, duration: '45ms' },
    { id: '2', timestamp: '2024-02-19 14:22:10', method: 'POST', endpoint: '/api/v1/trading/rfq', status: 201, duration: '123ms' },
    { id: '3', timestamp: '2024-02-19 14:21:05', method: 'GET', endpoint: '/api/v1/auth/me', status: 200, duration: '12ms' },
    { id: '4', timestamp: '2024-02-19 14:20:00', method: 'PUT', endpoint: '/api/v1/assets/abc123', status: 200, duration: '89ms' },
    { id: '5', timestamp: '2024-02-19 14:19:30', method: 'DELETE', endpoint: '/api/v1/trading/rfq/xyz789', status: 204, duration: '34ms' },
  ];

  const filteredLogs = mockLogs.filter(
    (log) =>
      log.endpoint.toLowerCase().includes(filter.toLowerCase()) ||
      log.method.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Filter by endpoint or method..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.timestamp}</TableCell>
              <TableCell>{log.method}</TableCell>
              <TableCell>{log.endpoint}</TableCell>
              <TableCell>
                <span className={log.status >= 200 && log.status < 300 ? 'text-success-600' : 'text-danger-600'}>
                  {log.status}
                </span>
              </TableCell>
              <TableCell>{log.duration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function APIDocumentation() {
  return (
    <div className="prose max-w-none">
      <p className="text-gray-600 mb-4">
        Complete API documentation is available at our documentation portal.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="primary" onClick={() => window.open('/api/docs', '_blank')}>
          View API Reference
        </Button>
        <Button variant="secondary" onClick={() => window.open('/api/openapi.json', '_blank')}>
          Download OpenAPI Spec
        </Button>
      </div>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Quick Links</h3>
        <ul className="space-y-1">
          <li><a href="/api/docs#authentication" className="text-primary-600 hover:underline">Authentication</a></li>
          <li><a href="/api/docs#assets" className="text-primary-600 hover:underline">Assets API</a></li>
          <li><a href="/api/docs#trading" className="text-primary-600 hover:underline">Trading API</a></li>
          <li><a href="/api/docs#webhooks" className="text-primary-600 hover:underline">Webhooks</a></li>
        </ul>
      </div>
    </div>
  );
}

function CreateAPIKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keyName, setKeyName] = useState('');

  const handleCreate = () => {
    alert(`Creating API key: ${keyName}`);
    setKeyName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for programmatic access to the platform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g., Production Key"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!keyName}>
              Create Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWebhookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleAdd = () => {
    alert(`Adding webhook: ${webhookUrl}`);
    setWebhookUrl('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange=

{onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook endpoint to receive real-time events.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Webhook URL"
            type="url"
            placeholder="https://api.example.com/webhooks"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!webhookUrl}>
              Add Webhook
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
