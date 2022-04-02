const { expect } = require("chai");
const { ethers } = require("hardhat");

const constants = ethers.constants;
const ether = ethers.utils.parseEther;

async function createProof(type, owner, recipient, maxQuantity) {
  const hash = ethers.utils.solidityKeccak256(["string", "address", "uint256"], [type, recipient.address, maxQuantity]);
  const signature = owner.signMessage(ethers.utils.arrayify(hash));
  return signature;
}

describe("Overbitegg", function () {
  before(async function () {
    this.Overbitegg = await ethers.getContractFactory("Overbitegg");
  });

  beforeEach(async function () {
    this.overbitegg = await this.Overbitegg.deploy();
    await this.overbitegg.deployed();
  });

  describe("giftMint", function () {
    it("should mint when giftProof is valid", async function () {
      [owner, minter] = await ethers.getSigners();
      const giftProof = await createProof("GIFT", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      const txnResponse = await contract.giftMint(2, 2, giftProof);

      await expect(txnResponse)
        .to.emit(this.overbitegg, "Transfer")
        .withArgs(constants.AddressZero, minter.address, 1)

      await expect(txnResponse)
        .to.emit(this.overbitegg, "Transfer")
        .withArgs(constants.AddressZero, minter.address, 2)

      const mintedQty = (await this.overbitegg.mintedQty());
      expect(mintedQty).to.equal(2)
    });

    it("should not mint when maxQuantity is reached", async function () {
      [owner, minter] = await ethers.getSigners();
      const giftProof = await createProof("GIFT", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      await contract.giftMint(1, 2, giftProof);
      await contract.giftMint(1, 2, giftProof);

      await expect(contract.giftMint(1, 2, giftProof)).to.be.revertedWith("MAX_QTY_REACHED");
    });

    it("should not mint when giftProof is invalid", async function () {
      [owner, minter] = await ethers.getSigners();
      const selfSignedGiftProof = await createProof("GIFT", minter, minter, 2);
      const wrongMaxQtyGiftProof = await createProof("GIFT", owner, minter, 1);
      const allowListProof = await createProof("ALLOW_LIST", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      await expect(contract.giftMint(2, 2, selfSignedGiftProof)).to.be.revertedWith("PROOF_INVAID");
      await expect(contract.giftMint(2, 2, wrongMaxQtyGiftProof)).to.be.revertedWith("PROOF_INVAID");
      await expect(contract.giftMint(2, 2, allowListProof)).to.be.revertedWith("PROOF_INVAID");
    });

    it("should not mint when there is no more supply", async function () {
      [owner, minter] = await ethers.getSigners();
      const giftProof = await createProof("GIFT", owner, minter, 101);

      const contract = this.overbitegg.connect(minter)
      await expect(contract.giftMint(101, 101, giftProof)).to.be.revertedWith("SUPPLY_EXHAUSTED");
    });
  });

  describe("allowListMint", function () {
    it("should mint when allowListProof is valid", async function () {
      [owner, minter] = await ethers.getSigners();
      const allowListProof = await createProof("ALLOW_LIST", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      const txnResponse = await contract.allowListMint(2, 2, allowListProof, {value: ether("0.2")});

      await expect(txnResponse)
        .to.emit(this.overbitegg, "Transfer")
        .withArgs(constants.AddressZero, minter.address, 1)

      await expect(txnResponse)
        .to.emit(this.overbitegg, "Transfer")
        .withArgs(constants.AddressZero, minter.address, 2)

      const mintedQty = (await this.overbitegg.mintedQty());
      expect(mintedQty).to.equal(2);
    });

    it("should not mint when maxQuantity is reached", async function () {
      [owner, minter] = await ethers.getSigners();
      const giftProof = await createProof("ALLOW_LIST", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      await contract.allowListMint(1, 2, giftProof, {value: ether("0.1")});
      await contract.allowListMint(1, 2, giftProof, {value: ether("0.1")});

      await expect(contract.allowListMint(1, 2, giftProof)).to.be.revertedWith("MAX_QTY_REACHED");
    });

    it("should not mint when allowListProof is invalid", async function () {
      [owner, minter] = await ethers.getSigners();
      const selfSignedAllowListProof = await createProof("ALLOW_LIST", minter, minter, 2);
      const wrongMaxQtyAllowListProof = await createProof("ALLOW_LIST", minter, minter, 1);
      const giftProof = await createProof("GIFT", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      await expect(contract.allowListMint(2, 2, selfSignedAllowListProof)).to.be.revertedWith("PROOF_INVAID");
      await expect(contract.allowListMint(2, 2, wrongMaxQtyAllowListProof)).to.be.revertedWith("PROOF_INVAID");
      await expect(contract.allowListMint(2, 2, giftProof)).to.be.revertedWith("PROOF_INVAID");
    });

    it("should not mint when value is smaller than required", async function () {
      [owner, minter] = await ethers.getSigners();
      const allowListProof = await createProof("ALLOW_LIST", owner, minter, 2);

      const contract = this.overbitegg.connect(minter)
      await expect(contract.allowListMint(2, 2, allowListProof)).to.be.revertedWith("INSUFFICIENT_AMOUNT");
    });

    it("should not mint when there is no more supply", async function () {
      [owner, minter] = await ethers.getSigners();
      const allowListProof = await createProof("ALLOW_LIST", owner, minter, 101);

      const contract = this.overbitegg.connect(minter)
      await expect(contract.allowListMint(101, 101, allowListProof, {value: ether("0.069")})).to.be.revertedWith("SUPPLY_EXHAUSTED");
    });
  });

  describe("publicMint", function () {
    it("should mint when all is valid", async function () {
      [owner, minter] = await ethers.getSigners();
      await this.overbitegg.activatePublicMint();

      const contract = this.overbitegg.connect(minter);
      const txnResponse = await contract.publicMint(1, {value: ether("0.069")});

      await expect(txnResponse)
        .to.emit(this.overbitegg, "Transfer")
        .withArgs(constants.AddressZero, minter.address, 1)

      const mintedQty = (await this.overbitegg.mintedQty());
      expect(mintedQty).to.equal(1);
    });

    it("should not mint when public mint is not active", async function () {
      [owner, minter] = await ethers.getSigners();
      const contract = this.overbitegg.connect(minter);
      await expect(contract.publicMint(1)).to.be.revertedWith("PUBLIC_MINT_NOT_ACTIVE");
    });

    it("should should not mint when already minted max amount", async function () {
      [owner, minter] = await ethers.getSigners();
      await this.overbitegg.activatePublicMint();

      const contract = this.overbitegg.connect(minter);
      await contract.publicMint(1, {value: ether("0.069")});
      await expect(contract.publicMint(1)).to.be.revertedWith("MAX_QTY_REACHED");
    });

    it("should should not mint when value is smaller than required", async function () {
      [owner, minter] = await ethers.getSigners();
      await this.overbitegg.activatePublicMint();

      const contract = this.overbitegg.connect(minter);
      await expect(contract.publicMint(1), {value: ether("0.1")}).to.be.revertedWith("INSUFFICIENT_AMOUNT");
    });

    // it("should not mint when there is no more supply", async function () {
    //   [owner, minter] = await ethers.getSigners();
    //   const giftProof = await createProof("GIFT", owner, owner, 1000);

    //   for (let i = 0; i < 10; i++) {
    //     await this.overbitegg.giftMint(1000, giftProof, {gasLimit: 30000000});
    //   }

    //   await this.overbitegg.activatePublicMint();
    //   const contract = this.overbitegg.connect(minter);
    //   await expect(contract.publicMint(1, {value: ether("0.1")})).to.be.revertedWith("SUPPLY_EXHAUSTED");
    // });
  });

  describe("activatePublicMint", function () {

  });

  describe("disablePublicMint", function () {

  });
});
