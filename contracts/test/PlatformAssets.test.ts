import { expect } from "chai";
import { ethers } from "hardhat";
import { PlatformAssets } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PlatformAssets", function () {
  let platformAssets: PlatformAssets;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  const BASE_URI = "https://api.carbon-platform.com/metadata/{id}.json";
  const TOKEN_ID = 1n;
  const MINT_AMOUNT = 100n;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const PlatformAssetsFactory = await ethers.getContractFactory("PlatformAssets");
    platformAssets = await PlatformAssetsFactory.deploy(BASE_URI);
    await platformAssets.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should grant deployer all roles", async function () {
      const MINTER_ROLE = await platformAssets.MINTER_ROLE();
      const PAUSER_ROLE = await platformAssets.PAUSER_ROLE();
      const DEFAULT_ADMIN_ROLE = await platformAssets.DEFAULT_ADMIN_ROLE();

      expect(await platformAssets.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await platformAssets.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await platformAssets.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("should return the base URI for unknown token IDs", async function () {
      expect(await platformAssets.uri(999n)).to.equal(BASE_URI);
    });
  });

  describe("Minting", function () {
    it("should mint tokens to a KYC-approved address", async function () {
      await platformAssets.approveKYC(addr1.address);

      await platformAssets.mint(
        addr1.address,
        TOKEN_ID,
        MINT_AMOUNT,
        "ipfs://QmTest123",
        "0x"
      );

      expect(await platformAssets.balanceOf(addr1.address, TOKEN_ID)).to.equal(MINT_AMOUNT);
    });

    it("should reject minting to a non-KYC address", async function () {
      await expect(
        platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x")
      ).to.be.revertedWith("Recipient not KYC approved");
    });

    it("should emit AssetMinted event", async function () {
      await platformAssets.approveKYC(addr1.address);

      await expect(
        platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "ipfs://QmTest", "0x")
      )
        .to.emit(platformAssets, "AssetMinted")
        .withArgs(TOKEN_ID, MINT_AMOUNT, owner.address, "ipfs://QmTest");
    });

    it("should store per-token URI when provided", async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "ipfs://QmCustom", "0x");

      expect(await platformAssets.uri(TOKEN_ID)).to.equal("ipfs://QmCustom");
    });

    it("should reject minting from non-minter role", async function () {
      await platformAssets.approveKYC(addr1.address);

      await expect(
        platformAssets.connect(addr1).mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x")
      ).to.be.reverted;
    });
  });

  describe("KYC Management", function () {
    it("should approve KYC for an address", async function () {
      await platformAssets.approveKYC(addr1.address);
      expect(await platformAssets.isKYCApproved(addr1.address)).to.be.true;
    });

    it("should emit KYCApproved event", async function () {
      await expect(platformAssets.approveKYC(addr1.address))
        .to.emit(platformAssets, "KYCApproved")
        .withArgs(addr1.address);
    });

    it("should revoke KYC for an address", async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.revokeKYC(addr1.address);
      expect(await platformAssets.isKYCApproved(addr1.address)).to.be.false;
    });

    it("should emit KYCRevoked event", async function () {
      await platformAssets.approveKYC(addr1.address);

      await expect(platformAssets.revokeKYC(addr1.address))
        .to.emit(platformAssets, "KYCRevoked")
        .withArgs(addr1.address);
    });

    it("should block transfers to non-KYC addresses", async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x");

      await expect(
        platformAssets
          .connect(addr1)
          .safeTransferFrom(addr1.address, addr2.address, TOKEN_ID, 50n, "0x")
      ).to.be.revertedWith("Recipient not KYC approved");
    });

    it("should allow transfers between KYC-approved addresses", async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.approveKYC(addr2.address);
      await platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x");

      await platformAssets
        .connect(addr1)
        .safeTransferFrom(addr1.address, addr2.address, TOKEN_ID, 50n, "0x");

      expect(await platformAssets.balanceOf(addr2.address, TOKEN_ID)).to.equal(50n);
      expect(await platformAssets.balanceOf(addr1.address, TOKEN_ID)).to.equal(50n);
    });

    it("should reject KYC approval from non-admin", async function () {
      await expect(
        platformAssets.connect(addr1).approveKYC(addr2.address)
      ).to.be.reverted;
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x");
    });

    it("should allow token holder to burn tokens", async function () {
      await platformAssets.connect(addr1).burn(addr1.address, TOKEN_ID, 50n);
      expect(await platformAssets.balanceOf(addr1.address, TOKEN_ID)).to.equal(50n);
    });

    it("should emit AssetBurned event", async function () {
      await expect(
        platformAssets.connect(addr1).burn(addr1.address, TOKEN_ID, 50n)
      )
        .to.emit(platformAssets, "AssetBurned")
        .withArgs(TOKEN_ID, 50n, addr1.address);
    });

    it("should reduce totalSupply after burning", async function () {
      await platformAssets.connect(addr1).burn(addr1.address, TOKEN_ID, 30n);
      expect(await platformAssets.totalSupply(TOKEN_ID)).to.equal(70n);
    });

    it("should reject burn from non-owner without approval", async function () {
      await expect(
        platformAssets.connect(addr2).burn(addr1.address, TOKEN_ID, 50n)
      ).to.be.revertedWith("Caller is not owner nor approved");
    });
  });

  describe("Pause / Unpause", function () {
    it("should pause and prevent minting", async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.pause();

      await expect(
        platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x")
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should resume minting after unpause", async function () {
      await platformAssets.approveKYC(addr1.address);
      await platformAssets.pause();
      await platformAssets.unpause();

      await expect(
        platformAssets.mint(addr1.address, TOKEN_ID, MINT_AMOUNT, "", "0x")
      ).to.not.be.reverted;
    });
  });
});
