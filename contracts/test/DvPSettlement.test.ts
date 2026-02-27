import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { DvPSettlement, PlatformAssets } from '../typechain-types';
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('DvPSettlement', function () {
  let settlement: DvPSettlement;
  let assets: PlatformAssets;
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;

  const TOKEN_ID = 7n;
  const QUANTITY = 10n;
  const PRICE = ethers.parseEther('1');

  beforeEach(async function () {
    [owner, buyer, seller] = await ethers.getSigners();

    const PlatformAssetsFactory = await ethers.getContractFactory('PlatformAssets');
    assets = await PlatformAssetsFactory.deploy('https://assets/{id}.json');
    await assets.waitForDeployment();

    const SettlementFactory = await ethers.getContractFactory('DvPSettlement');
    settlement = await SettlementFactory.deploy();
    await settlement.waitForDeployment();

    await assets.approveKYC(buyer.address);
    await assets.approveKYC(seller.address);
    await assets.mint(seller.address, TOKEN_ID, QUANTITY, '', '0x');
    await assets.connect(seller).setApprovalForAll(await settlement.getAddress(), true);
  });

  it('creates a trade and escrows ETH', async function () {
    const tradeId = ethers.id('trade-1');
    const expiry = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;

    await expect(
      settlement.connect(buyer).createTrade(
        tradeId,
        seller.address,
        await assets.getAddress(),
        TOKEN_ID,
        QUANTITY,
        expiry,
        { value: PRICE },
      ),
    ).to.emit(settlement, 'TradeCreated');

    const trade = await settlement.trades(tradeId);
    expect(trade.buyer).to.equal(buyer.address);
    expect(trade.seller).to.equal(seller.address);
    expect(trade.priceWei).to.equal(PRICE);
  });

  it('settles trade atomically', async function () {
    const tradeId = ethers.id('trade-2');
    const expiry = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;

    await settlement.connect(buyer).createTrade(
      tradeId,
      seller.address,
      await assets.getAddress(),
      TOKEN_ID,
      QUANTITY,
      expiry,
      { value: PRICE },
    );

    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

    await expect(settlement.connect(owner).settleTrade(tradeId))
      .to.emit(settlement, 'TradeSettled');

    expect(await assets.balanceOf(buyer.address, TOKEN_ID)).to.equal(QUANTITY);
    expect(await assets.balanceOf(seller.address, TOKEN_ID)).to.equal(0n);

    const trade = await settlement.trades(tradeId);
    expect(trade.settled).to.equal(true);

    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter).to.be.greaterThan(sellerBalanceBefore);
  });

  it('allows buyer cancellation and refund', async function () {
    const tradeId = ethers.id('trade-3');
    const expiry = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;

    await settlement.connect(buyer).createTrade(
      tradeId,
      seller.address,
      await assets.getAddress(),
      TOKEN_ID,
      QUANTITY,
      expiry,
      { value: PRICE },
    );

    await expect(settlement.connect(buyer).cancelTrade(tradeId)).to.emit(settlement, 'TradeCancelled');

    const trade = await settlement.trades(tradeId);
    expect(trade.cancelled).to.equal(true);
  });

  it('rejects settlement after expiry', async function () {
    const tradeId = ethers.id('trade-4');
    const expiry = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;

    await settlement.connect(buyer).createTrade(
      tradeId,
      seller.address,
      await assets.getAddress(),
      TOKEN_ID,
      QUANTITY,
      expiry,
      { value: PRICE },
    );

    await ethers.provider.send('evm_increaseTime', [3601]);
    await ethers.provider.send('evm_mine', []);

    await expect(settlement.connect(owner).settleTrade(tradeId)).to.be.revertedWith('Trade expired');
  });
});
