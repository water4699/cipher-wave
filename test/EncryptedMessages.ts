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

  it("should return correct user message count", async function () {
    const clearContent = 999n;
    const clearTimestamp = Math.floor(Date.now() / 1000);

    // Submit message as Alice
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);

    // Check Alice's message count
    const aliceCount = await encryptedMessagesContract.getUserMessageCount(signers.alice.address);
    expect(aliceCount).to.eq(1);

    // Check Bob's message count (should be 0)
    const bobCount = await encryptedMessagesContract.getUserMessageCount(signers.bob.address);
    expect(bobCount).to.eq(0);
  });

  it("should handle multiple users submitting messages independently", async function () {
    const timestamp = Math.floor(Date.now() / 1000);

    // Alice submits a message
    const aliceInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(100n)
      .add32(timestamp)
      .encrypt();

    await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(aliceInput.handles[0], aliceInput.handles[1], aliceInput.inputProof);

    // Bob submits a message
    const bobInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add64(200n)
      .add32(timestamp)
      .encrypt();

    await encryptedMessagesContract
      .connect(signers.bob)
      .submitMessage(bobInput.handles[0], bobInput.handles[1], bobInput.inputProof);

    // Verify each user has their own message
    const aliceMessages = await encryptedMessagesContract.connect(signers.alice).getUserMessages();
    const bobMessages = await encryptedMessagesContract.connect(signers.bob).getUserMessages();

    expect(aliceMessages.length).to.eq(1);
    expect(bobMessages.length).to.eq(1);
    expect(aliceMessages[0]).to.not.eq(bobMessages[0]);

    // Total messages should be 2
    const totalMessages = await encryptedMessagesContract.getTotalMessages();
    expect(totalMessages).to.eq(2);
  });
});
