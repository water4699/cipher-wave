import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedMessages, EncryptedMessages__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedMessages")) as EncryptedMessages__factory;
  const encryptedMessagesContract = (await factory.deploy()) as EncryptedMessages;
  const contractAddress = await encryptedMessagesContract.getAddress();

  return { encryptedMessagesContract, contractAddress };
}

describe("EncryptedMessages", function () {
  let signers: Signers;
  let encryptedMessagesContract: EncryptedMessages;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ encryptedMessagesContract, contractAddress } = await deployFixture());
  });

  it("should have zero messages after deployment", async function () {
    const totalMessages = await encryptedMessagesContract.getTotalMessages();
    expect(totalMessages).to.eq(0);
  });

  it("should allow user to submit an encrypted message", async function () {
    const clearContent = 12345n;
    const clearTimestamp = Math.floor(Date.now() / 1000);

    // Encrypt the content and timestamp
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    // Submit the message
    const tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    await tx.wait();

    // Check total messages increased
    const totalMessages = await encryptedMessagesContract.getTotalMessages();
    expect(totalMessages).to.eq(1);

    // Check user has the message
    const userMessages = await encryptedMessagesContract.connect(signers.alice).getUserMessages();
    expect(userMessages.length).to.eq(1);
    expect(userMessages[0]).to.eq(0);
  });

  it("should return correct message metadata", async function () {
    const clearContent = 99999n;
    const clearTimestamp = Math.floor(Date.now() / 1000);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    const tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    await tx.wait();

    // Get metadata
    const [sender, createdAt, exists] = await encryptedMessagesContract.getMessageMetadata(0);
    expect(sender).to.eq(signers.alice.address);
    expect(exists).to.eq(true);
    expect(createdAt).to.be.gt(0);
  });

  it("should allow message owner to get encrypted content", async function () {
    const clearContent = 54321n;
    const clearTimestamp = Math.floor(Date.now() / 1000);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    const tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    await tx.wait();

    // Get encrypted content (only owner can do this)
    const encryptedContent = await encryptedMessagesContract
      .connect(signers.alice)
      .getEncryptedContent(0);

    expect(encryptedContent).to.not.eq(ethers.ZeroHash);

    // Decrypt and verify content
    const decryptedContent = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedContent,
      contractAddress,
      signers.alice,
    );

    expect(decryptedContent).to.eq(clearContent);
  });

  it("should not allow non-owner to get encrypted content", async function () {
    const clearContent = 11111n;
    const clearTimestamp = Math.floor(Date.now() / 1000);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    const tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    await tx.wait();

    // Bob should not be able to access Alice's message
    await expect(
      encryptedMessagesContract.connect(signers.bob).getEncryptedContent(0)
    ).to.be.revertedWith("Not authorized");
  });

  it("should correctly identify message ownership", async function () {
    const clearContent = 22222n;
    const clearTimestamp = Math.floor(Date.now() / 1000);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    const tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    await tx.wait();

    // Alice owns message 0
    const aliceOwns = await encryptedMessagesContract.connect(signers.alice).isMessageOwner(0);
    expect(aliceOwns).to.eq(true);

    // Bob does not own message 0
    const bobOwns = await encryptedMessagesContract.connect(signers.bob).isMessageOwner(0);
    expect(bobOwns).to.eq(false);
  });

  it("should support multiple messages from same user", async function () {
    // Submit first message
    const encryptedInput1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(111n)
      .add32(1000)
      .encrypt();

    let tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput1.handles[0], encryptedInput1.handles[1], encryptedInput1.inputProof);
    await tx.wait();

    // Submit second message
    const encryptedInput2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(222n)
      .add32(2000)
      .encrypt();

    tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput2.handles[0], encryptedInput2.handles[1], encryptedInput2.inputProof);
    await tx.wait();

    // User should have 2 messages
    const userMessages = await encryptedMessagesContract.connect(signers.alice).getUserMessages();
    expect(userMessages.length).to.eq(2);
    expect(userMessages[0]).to.eq(0);
    expect(userMessages[1]).to.eq(1);

    // Total should be 2
    const totalMessages = await encryptedMessagesContract.getTotalMessages();
    expect(totalMessages).to.eq(2);
  });
});
