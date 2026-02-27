import { createServer, IncomingMessage, Server, ServerResponse } from 'http';

type Institution = {
  id: string;
  name: string;
  country: string;
  status: 'pending_review' | 'approved';
};

type User = {
  id: string;
  email: string;
  password: string;
  institutionId?: string;
  mfaSecret: string;
};

type Asset = {
  id: string;
  symbol: string;
  institutionId: string;
  status: 'draft' | 'verified';
  mintedSupply: number;
};

type RFQ = {
  id: string;
  account: string;
  assetId: string;
  quantity: number;
  status: 'open' | 'accepted';
};

type Quote = {
  id: string;
  rfqId: string;
  marketMaker: string;
  price: number;
};

type Trade = {
  id: string;
  rfqId: string;
  quoteId: string;
  account: string;
  assetId: string;
  quantity: number;
  price: number;
  status: 'accepted' | 'settled';
};

type JsonRecord = Record<string, unknown>;

export type MockPlatformServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

export async function createMockPlatformServer(): Promise<MockPlatformServer> {
  const institutions = new Map<string, Institution>();
  const usersByEmail = new Map<string, User>();
  const assets = new Map<string, Asset>();
  const rfqs = new Map<string, RFQ>();
  const quotes = new Map<string, Quote>();
  const trades = new Map<string, Trade>();
  const walletBalances = new Map<string, number>();

  const counters = {
    institution: 0,
    user: 0,
    asset: 0,
    rfq: 0,
    quote: 0,
    trade: 0,
  };

  const server = createServer(async (req, res) => {
    const body = await readJsonBody(req);
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const method = req.method ?? 'GET';
    const path = requestUrl.pathname;

    if (method === 'POST' && path === '/institutions/onboard') {
      const name = toString(body.name);
      const country = toString(body.country);
      if (!name || !country) {
        return send(res, 400, { error: 'name and country are required' });
      }

      counters.institution += 1;
      const id = `inst-${counters.institution}`;
      const institution: Institution = { id, name, country, status: 'pending_review' };
      institutions.set(id, institution);
      return send(res, 201, institution);
    }

    if (method === 'GET' && path.startsWith('/institutions/')) {
      const id = path.split('/')[2];
      const institution = institutions.get(id);
      if (!institution) {
        return send(res, 404, { error: 'institution not found' });
      }
      return send(res, 200, institution);
    }

    if (method === 'POST' && path === '/auth/register') {
      const email = toString(body.email).toLowerCase();
      const password = toString(body.password);
      const institutionId = toString(body.institutionId);
      if (!email || !password) {
        return send(res, 400, { error: 'email and password are required' });
      }
      if (usersByEmail.has(email)) {
        return send(res, 409, { error: 'user already exists' });
      }
      counters.user += 1;
      const user: User = {
        id: `user-${counters.user}`,
        email,
        password,
        institutionId: institutionId || undefined,
        mfaSecret: '123456',
      };
      usersByEmail.set(email, user);
      return send(res, 201, { id: user.id, email: user.email, mfaEnabled: true });
    }

    if (method === 'POST' && path === '/auth/login') {
      const email = toString(body.email).toLowerCase();
      const password = toString(body.password);
      const user = usersByEmail.get(email);
      if (!user || user.password !== password) {
        return send(res, 401, { error: 'invalid credentials' });
      }
      return send(res, 200, {
        challengeId: `${user.id}-challenge`,
        mfaRequired: true,
      });
    }

    if (method === 'POST' && path === '/auth/mfa/verify') {
      const email = toString(body.email).toLowerCase();
      const code = toString(body.code);
      const user = usersByEmail.get(email);
      if (!user) {
        return send(res, 404, { error: 'user not found' });
      }
      if (code !== user.mfaSecret) {
        return send(res, 401, { error: 'invalid mfa code' });
      }
      return send(res, 200, { token: `token-${user.id}` });
    }

    if (method === 'POST' && path === '/assets') {
      const symbol = toString(body.symbol);
      const institutionId = toString(body.institutionId);
      if (!symbol || !institutionId) {
        return send(res, 400, { error: 'symbol and institutionId are required' });
      }
      if (!institutions.has(institutionId)) {
        return send(res, 404, { error: 'institution not found' });
      }
      counters.asset += 1;
      const asset: Asset = {
        id: `asset-${counters.asset}`,
        symbol,
        institutionId,
        status: 'draft',
        mintedSupply: 0,
      };
      assets.set(asset.id, asset);
      return send(res, 201, asset);
    }

    if (method === 'POST' && path.match(/^\/assets\/[^/]+\/verify$/)) {
      const assetId = path.split('/')[2];
      const asset = assets.get(assetId);
      if (!asset) {
        return send(res, 404, { error: 'asset not found' });
      }
      asset.status = 'verified';
      return send(res, 200, asset);
    }

    if (method === 'POST' && path.match(/^\/assets\/[^/]+\/mint$/)) {
      const assetId = path.split('/')[2];
      const amount = Number(body.amount);
      const asset = assets.get(assetId);
      if (!asset) {
        return send(res, 404, { error: 'asset not found' });
      }
      if (asset.status !== 'verified') {
        return send(res, 409, { error: 'asset must be verified before minting' });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'amount must be positive' });
      }
      asset.mintedSupply += amount;
      return send(res, 200, asset);
    }

    if (method === 'POST' && path === '/wallet/deposit') {
      const account = toString(body.account);
      const amount = Number(body.amount);
      if (!account || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'account and positive amount are required' });
      }
      const nextBalance = (walletBalances.get(account) ?? 0) + amount;
      walletBalances.set(account, nextBalance);
      return send(res, 200, { account, balance: nextBalance });
    }

    if (method === 'POST' && path === '/wallet/withdraw') {
      const account = toString(body.account);
      const amount = Number(body.amount);
      if (!account || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'account and positive amount are required' });
      }
      const currentBalance = walletBalances.get(account) ?? 0;
      if (amount > currentBalance) {
        return send(res, 409, { error: 'insufficient balance' });
      }
      const nextBalance = currentBalance - amount;
      walletBalances.set(account, nextBalance);
      return send(res, 200, { account, balance: nextBalance });
    }

    if (method === 'GET' && path.startsWith('/wallet/')) {
      const account = path.split('/')[2];
      return send(res, 200, { account, balance: walletBalances.get(account) ?? 0 });
    }

    if (method === 'POST' && path === '/rfqs') {
      const account = toString(body.account);
      const assetId = toString(body.assetId);
      const quantity = Number(body.quantity);
      if (!account || !assetId || !Number.isFinite(quantity) || quantity <= 0) {
        return send(res, 400, { error: 'account, assetId and positive quantity are required' });
      }
      if (!assets.has(assetId)) {
        return send(res, 404, { error: 'asset not found' });
      }
      counters.rfq += 1;
      const rfq: RFQ = {
        id: `rfq-${counters.rfq}`,
        account,
        assetId,
        quantity,
        status: 'open',
      };
      rfqs.set(rfq.id, rfq);
      return send(res, 201, rfq);
    }

    if (method === 'POST' && path.match(/^\/rfqs\/[^/]+\/quotes$/)) {
      const rfqId = path.split('/')[2];
      const marketMaker = toString(body.marketMaker);
      const price = Number(body.price);
      const rfq = rfqs.get(rfqId);
      if (!rfq) {
        return send(res, 404, { error: 'rfq not found' });
      }
      if (!marketMaker || !Number.isFinite(price) || price <= 0) {
        return send(res, 400, { error: 'marketMaker and positive price are required' });
      }
      counters.quote += 1;
      const quote: Quote = {
        id: `quote-${counters.quote}`,
        rfqId,
        marketMaker,
        price,
      };
      quotes.set(quote.id, quote);
      return send(res, 201, quote);
    }

    if (method === 'POST' && path.match(/^\/rfqs\/[^/]+\/accept\/[^/]+$/)) {
      const [, , rfqId, , quoteId] = path.split('/');
      const rfq = rfqs.get(rfqId);
      const quote = quotes.get(quoteId);
      if (!rfq) {
        return send(res, 404, { error: 'rfq not found' });
      }
      if (!quote || quote.rfqId !== rfqId) {
        return send(res, 404, { error: 'quote not found' });
      }
      rfq.status = 'accepted';
      counters.trade += 1;
      const trade: Trade = {
        id: `trade-${counters.trade}`,
        rfqId,
        quoteId,
        account: rfq.account,
        assetId: rfq.assetId,
        quantity: rfq.quantity,
        price: quote.price,
        status: 'accepted',
      };
      trades.set(trade.id, trade);
      return send(res, 201, trade);
    }

    if (method === 'POST' && path.match(/^\/trades\/[^/]+\/settle$/)) {
      const tradeId = path.split('/')[2];
      const trade = trades.get(tradeId);
      if (!trade) {
        return send(res, 404, { error: 'trade not found' });
      }
      if (trade.status !== 'accepted') {
        return send(res, 409, { error: 'trade cannot be settled' });
      }
      trade.status = 'settled';
      const notional = trade.quantity * trade.price;
      const current = walletBalances.get(trade.account) ?? 0;
      if (current < notional) {
        return send(res, 409, { error: 'insufficient balance for settlement' });
      }
      walletBalances.set(trade.account, current - notional);
      return send(res, 200, trade);
    }

    if (method === 'GET' && path.startsWith('/trades/')) {
      const tradeId = path.split('/')[2];
      const trade = trades.get(tradeId);
      if (!trade) {
        return send(res, 404, { error: 'trade not found' });
      }
      return send(res, 200, trade);
    }

    return send(res, 404, { error: 'not found' });
  });

  await listen(server);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to resolve server address');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    stop: () => close(server),
  };
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function send(res: ServerResponse, statusCode: number, body: JsonRecord) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readJsonBody(req: IncomingMessage): Promise<JsonRecord> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as JsonRecord);
      } catch {
        resolve({});
      }
    });
  });
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
