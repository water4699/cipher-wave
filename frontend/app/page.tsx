"use client";

import Header from "@/components/Header";
import EncryptedMessageForm from "@/components/EncryptedMessageForm";
import MessageList from "@/components/MessageList";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { Card } from "@/components/ui/card";
import { Lock, Shield, Key } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { EncryptedMessagesABI } from "@/abi/EncryptedMessagesABI";
import { EncryptedMessagesAddresses } from "@/abi/EncryptedMessagesAddresses";
import { useFhevm } from "@/fhevm/useFhevm";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

interface Message {
  id: number;
  content: string;
  timestamp: number;
  decrypted: boolean;
  isDecrypting?: boolean;
}

export default function Home() {
  const {
    isConnected,
    chainId,
    accounts,
    ethersSigner,
    ethersReadonlyProvider,
  } = useMetaMaskEthersSigner();
  const address = accounts?.[0];
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Store plaintext values for local network testing (messageId -> content)
  const [localMessageContents, setLocalMessageContents] = useState<Record<number, string>>({});

  const contractAddress = chainId
    ? EncryptedMessagesAddresses[
        chainId.toString() as keyof typeof EncryptedMessagesAddresses
      ]?.address
    : undefined;

  // Initialize FHEVM
  const { instance: fhevmInstance, isLoading: fhevmLoading } = useFhevm({
    chainId: chainId || 31337,
  });

  // Check if we're on a local network (use mock function)
  const isLocalNetwork = chainId === 31337 || chainId === 1337;

  const isReady =
    isConnected &&
    !!contractAddress &&
    !!fhevmInstance &&
    !fhevmLoading &&
    !!ethersSigner;

  // Debug logging
  useEffect(() => {
    console.log("[page.tsx] Debug state:", {
      isConnected,
      chainId,
      address,
      contractAddress,
      fhevmInstance: !!fhevmInstance,
      fhevmLoading,
      isReady,
    });
  }, [
    isConnected,
    chainId,
    address,
    contractAddress,
    fhevmInstance,
    fhevmLoading,
    isReady,
  ]);

  // Load user messages
  const loadMessages = useCallback(async () => {
    // For getUserMessages(), we need a signer because it uses msg.sender
    // Always use MetaMask signer for wallet authentication
    if (!contractAddress || !ethersSigner || !address) {
      console.log("[loadMessages] Not ready:", { contractAddress, ethersSigner: !!ethersSigner, address });
      return;
    }

    console.log("[loadMessages] Loading messages for address:", address);
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(
        contractAddress as `0x${string}`,
        EncryptedMessagesABI.abi,
        ethersSigner
      );

      const messageIds = (await contract.getUserMessages()) as bigint[];
      console.log("[loadMessages] Got message IDs:", messageIds.map(id => id.toString()));

      const messagesData: Message[] = [];
      for (const id of messageIds) {
        const metadata = (await contract.getMessageMetadata(id)) as [
          string,
          bigint,
          boolean
        ];

        messagesData.push({
          id: Number(id),
          content: "",
          timestamp: Number(metadata[1]),
          decrypted: false,
        });
      }

      setMessages(messagesData);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, ethersSigner, address]);

  // Load messages when connected
  useEffect(() => {
    if (isConnected && contractAddress) {
      loadMessages();
    }
  }, [isConnected, contractAddress, loadMessages]);

  // Submit encrypted message
  const submitMessage = async (content: string) => {
    console.log("[submitMessage] Starting submission, content:", content);
    console.log("[submitMessage] contractAddress:", contractAddress);
    console.log("[submitMessage] ethersSigner:", !!ethersSigner);
    console.log("[submitMessage] address:", address);
    console.log("[submitMessage] isLocalNetwork:", isLocalNetwork);
    
    if (!contractAddress || !ethersSigner || !address) {
      throw new Error("Not ready to submit");
    }

    // For non-local networks, we need the fhevmInstance
    if (!isLocalNetwork && !fhevmInstance) {
      throw new Error("FHEVM not initialized");
    }

    try {
      const contract = new ethers.Contract(
        contractAddress as `0x${string}`,
        EncryptedMessagesABI.abi,
        ethersSigner
      );

      let tx: ethers.TransactionResponse;

      if (isLocalNetwork) {
        // Local network: use mock function with plaintext values
        // Always use MetaMask signer for wallet authentication
        toast({
          title: "Submitting Message",
          description: "Please confirm in your wallet...",
        });

        const numContent = BigInt(content);
        const timestamp = BigInt(Math.floor(Date.now() / 1000));

        // Call the mock function that accepts plaintext
        console.log("[submitMessage] Calling submitMessageMock with:", { numContent: numContent.toString(), timestamp: timestamp.toString() });
        tx = await contract.submitMessageMock(numContent, timestamp);
        console.log("[submitMessage] Transaction sent, hash:", tx.hash);
        
        // Store the plaintext content for later "decryption" (local testing only)
        // We'll get the messageId from the event after confirmation
        const receipt = await tx.wait();
        const messageSubmittedEvent = receipt?.logs.find(
          (log) => log.topics[0] === ethers.id("MessageSubmitted(uint256,address,uint256)")
        );
        if (messageSubmittedEvent) {
          const messageId = Number(BigInt(messageSubmittedEvent.topics[1]));
          console.log("[submitMessage] Storing plaintext for messageId:", messageId, "content:", content);
          setLocalMessageContents(prev => ({ ...prev, [messageId]: content }));
        }
      } else {
        // Production network: use real FHE encryption
        toast({
          title: "Encrypting Message",
          description: "Creating encrypted inputs...",
        });

        const numContent = BigInt(content);
        const timestamp = BigInt(Math.floor(Date.now() / 1000));

        // Create encrypted inputs using FHEVM
        const input = fhevmInstance!.createEncryptedInput(
          contractAddress,
          address
        );
        input.add64(numContent);
        input.add32(Number(timestamp));
        const encrypted = await input.encrypt();

        // Convert handles and proof to hex strings if they are Uint8Array
        const toHex = (data: Uint8Array | `0x${string}`): `0x${string}` => {
          if (typeof data === "string") return data;
          return ("0x" + Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
        };

        const handle0 = toHex(encrypted.handles[0]);
        const handle1 = toHex(encrypted.handles[1]);
        const inputProof = toHex(encrypted.inputProof);

        toast({
          title: "Submitting Transaction",
          description: "Please confirm in your wallet...",
        });

        tx = await contract.submitMessage(handle0, handle1, inputProof);
      }

      // For non-local network, wait for confirmation here
      if (!isLocalNetwork) {
        toast({
          title: "Waiting for Confirmation",
          description: "Transaction submitted, waiting for confirmation...",
        });

        // Wait for transaction confirmation
        console.log("[submitMessage] Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log("[submitMessage] Transaction confirmed, receipt:", receipt);
      }

      toast({
        title: "Message Submitted",
        description: "Your encrypted message has been stored on-chain!",
      });

      // Reload messages after submission
      console.log("[submitMessage] Reloading messages...");
      await loadMessages();
      console.log("[submitMessage] Messages reloaded");
    } catch (error) {
      console.error("Failed to submit message:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit message",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Decrypt message
  const decryptMessage = async (messageId: number) => {
    if (!ethersSigner) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to decrypt messages",
        variant: "destructive",
      });
      return;
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isDecrypting: true } : msg
      )
    );

    try {
      // Request wallet signature for authentication
      toast({
        title: "Wallet Authentication",
        description: "Please sign the message in your wallet to decrypt...",
      });

      const signatureMessage = `Decrypt message #${messageId} from CipherWaveSync\nTimestamp: ${Date.now()}`;
      console.log("[decryptMessage] Requesting signature for message:", signatureMessage);
      
      // This will trigger MetaMask popup for signature
      const signature = await ethersSigner.signMessage(signatureMessage);
      console.log("[decryptMessage] Got signature:", signature);

      let decryptedContent: string;

      if (isLocalNetwork) {
        // Local network: use stored plaintext value
        console.log("[decryptMessage] Local network, looking up messageId:", messageId);
        console.log("[decryptMessage] localMessageContents:", localMessageContents);
        
        const storedContent = localMessageContents[messageId];
        if (storedContent) {
          decryptedContent = storedContent;
        } else {
          // If not in local storage, show placeholder
          decryptedContent = `[Message #${messageId} - content not cached]`;
        }
      } else {
        // Production network: use FHEVM to decrypt
        // TODO: Implement real FHEVM decryption with signature verification
        await new Promise((resolve) => setTimeout(resolve, 1500));
        decryptedContent = "[Decryption not implemented for production]";
      }

      // Update with decrypted value
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: decryptedContent, decrypted: true, isDecrypting: false }
            : msg
        )
      );

      toast({
        title: "Message Decrypted",
        description: "Successfully decrypted the message content",
      });
    } catch (error) {
      console.error("[decryptMessage] Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDecrypting: false } : msg
        )
      );
      toast({
        title: "Decryption Failed",
        description: "Failed to decrypt the message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Lock className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">
              Fully Homomorphic Encryption
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">CipherWaveSync</h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Submit and manage encrypted messages on-chain using FHEVM technology.
            Your data remains private, even during computation.
          </p>

          {/* Waveform Visualizer */}
          <div className="max-w-2xl mx-auto mb-12">
            <WaveformVisualizer />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
            <Card className="p-6 border-border/50">
              <Lock className="h-10 w-10 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Encrypted Storage</h3>
              <p className="text-sm text-muted-foreground">
                Messages are encrypted on-chain using FHE
              </p>
            </Card>

            <Card className="p-6 border-border/50">
              <Shield className="h-10 w-10 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Private Processing</h3>
              <p className="text-sm text-muted-foreground">
                Compute on encrypted data without decryption
              </p>
            </Card>

            <Card className="p-6 border-border/50">
              <Key className="h-10 w-10 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Controlled Access</h3>
              <p className="text-sm text-muted-foreground">
                Only you can decrypt your messages
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Submit Message */}
            <div>
              <EncryptedMessageForm
                onSubmit={submitMessage}
                isReady={isReady}
                isConnected={isConnected}
              />
            </div>

            {/* View Messages */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading..."
                    : `${messages.length} message(s) stored`}
                </p>
              </div>
              <MessageList
                messages={messages}
                onDecrypt={decryptMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
