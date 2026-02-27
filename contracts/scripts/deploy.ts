import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying contracts with account: ${deployer.address}`);

  const assetsFactory = await ethers.getContractFactory('PlatformAssets');
  const assets = await assetsFactory.deploy('https://api.carbon-platform.com/metadata/{id}.json');
  await assets.waitForDeployment();

  const settlementFactory = await ethers.getContractFactory('DvPSettlement');
  const settlement = await settlementFactory.deploy();
  await settlement.waitForDeployment();

  console.log(`PlatformAssets deployed: ${await assets.getAddress()}`);
  console.log(`DvPSettlement deployed: ${await settlement.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
