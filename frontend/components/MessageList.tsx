"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Lock, Calendar, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";

interface Message {
  id: number;
  content: string;
  timestamp: number;
  decrypted: boolean;
  isDecrypting?: boolean;
}

interface MessageListProps {
  messages: Message[];
  onDecrypt: (id: number) => Promise<void>;
  isLoading: boolean;
}

const MessageList = ({ messages, onDecrypt, isLoading }: MessageListProps) => {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <Card className="p-6 border-border/50 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Connect your wallet to view your encrypted messages
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 border-border/50 text-center">
        <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading your messages...</p>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="p-6 border-border/50 text-center">
        <p className="text-muted-foreground">
          No messages yet. Submit your first encrypted message above.
        </p>
      </Card>
    );
  }

  const sortedMessages = [...messages].sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'} found
        </p>
      </div>
      {sortedMessages.map((message) => (
        <Card key={message.id} className="p-4 border-border/50 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Message #{message.id}</span>
                {message.decrypted && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Decrypted
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {message.timestamp > 0
                      ? new Date(message.timestamp * 1000).toLocaleString()
                      : "Pending..."}
                  </span>
                </div>

                <div className="font-mono text-sm bg-muted p-3 rounded">
                  {message.decrypted ? (
                    <span className="text-primary">Decrypted: {message.content}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Encrypted: ****************************
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!message.decrypted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDecrypt(message.id)}
                disabled={message.isDecrypting}
                className="ml-4 gap-2"
                aria-label={`Decrypt message ${message.id}`}
              >
                {message.isDecrypting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                {message.isDecrypting ? "Decrypting..." : "Decrypt"}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MessageList;
