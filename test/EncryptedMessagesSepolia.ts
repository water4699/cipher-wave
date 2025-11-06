import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedMessages } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedMessagesSepolia", function () {
  let signers: Signers;
  let encryptedMessagesContract: EncryptedMessages;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("EncryptedMessages");
      contractAddress = deployment.address;
      encryptedMessagesContract = await ethers.getContractAt("EncryptedMessages", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("submit and decrypt an encrypted message", async function () {
    steps = 8;

    this.timeout(4 * 60000);

    const clearContent = BigInt(Math.floor(Math.random() * 100000));
    const clearTimestamp = Math.floor(Date.now() / 1000);

    progress(`Encrypting content=${clearContent}, timestamp=${clearTimestamp}...`);
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(clearContent)
      .add32(clearTimestamp)
      .encrypt();

    progress(`Submitting encrypted message to EncryptedMessages=${contractAddress}...`);
    const tx = await encryptedMessagesContract
      .connect(signers.alice)
      .submitMessage(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    await tx.wait();

    progress(`Getting user messages...`);
    const userMessages = await encryptedMessagesContract.connect(signers.alice).getUserMessages();
    expect(userMessages.length).to.be.gte(1);
    
    const latestMessageId = userMessages[userMessages.length - 1];
    progress(`Latest message ID: ${latestMessageId}`);

    progress(`Getting encrypted content for message ${latestMessageId}...`);
    const encryptedContent = await encryptedMessagesContract
      .connect(signers.alice)
      .getEncryptedContent(latestMessageId);
    expect(encryptedContent).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting content...`);
    const decryptedContent = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedContent,
      contractAddress,
      signers.alice,
    );
    progress(`Decrypted content: ${decryptedContent}`);

    expect(decryptedContent).to.eq(clearContent);
  });

  it("verify message metadata", async function () {
    steps = 4;

    this.timeout(2 * 60000);

    progress(`Getting user messages...`);
    const userMessages = await encryptedMessagesContract.connect(signers.alice).getUserMessages();
    
    if (userMessages.length === 0) {
      console.log("No messages found, skipping metadata test");
      this.skip();
    }

    const latestMessageId = userMessages[userMessages.length - 1];
    progress(`Checking metadata for message ${latestMessageId}...`);

    const [sender, createdAt, exists] = await encryptedMessagesContract.getMessageMetadata(latestMessageId);
    progress(`Sender: ${sender}, CreatedAt: ${createdAt}, Exists: ${exists}`);

    expect(sender).to.eq(signers.alice.address);
    expect(exists).to.eq(true);
    expect(createdAt).to.be.gt(0);

    progress(`Metadata verification complete`);
  });
});
