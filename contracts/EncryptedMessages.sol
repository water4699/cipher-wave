// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedMessages - FHE-encrypted message storage system
/// @author CipherWaveSync
/// @notice Store and manage encrypted messages on-chain using FHEVM
contract EncryptedMessages is ZamaEthereumConfig {
    /// @notice Structure to store encrypted message data
    struct Message {
        address sender;
        euint64 encryptedContent;
        euint32 encryptedTimestamp;
        uint256 createdAt;
        bool exists;
    }

    /// @notice Mapping from message ID to Message struct
    mapping(uint256 => Message) private _messages;

    /// @notice Mapping from user address to their message IDs
    mapping(address => uint256[]) private _userMessages;

    /// @notice Total number of messages
    uint256 private _totalMessages;

    /// @notice Emitted when a new encrypted message is submitted
    event MessageSubmitted(uint256 indexed messageId, address indexed sender, uint256 timestamp);

    /// @notice Emitted when a message is accessed for decryption
    event MessageAccessed(uint256 indexed messageId, address indexed accessor);

    /// @notice Submit a new encrypted message
    /// @param encryptedContent The encrypted message content (euint64)
    /// @param encryptedTimestamp The encrypted timestamp (euint32)
    /// @param inputProof The proof for the encrypted inputs
    function submitMessage(
        externalEuint64 encryptedContent,
        externalEuint32 encryptedTimestamp,
        bytes calldata inputProof
    ) external {
        euint64 content = FHE.fromExternal(encryptedContent, inputProof);
        euint32 timestamp = FHE.fromExternal(encryptedTimestamp, inputProof);

        uint256 messageId = _totalMessages++;

        _messages[messageId] = Message({
            sender: msg.sender,
            encryptedContent: content,
            encryptedTimestamp: timestamp,
            createdAt: block.timestamp,
            exists: true
        });

        _userMessages[msg.sender].push(messageId);

        // Allow the contract and sender to access the encrypted data
        FHE.allowThis(content);
        FHE.allow(content, msg.sender);
        FHE.allowThis(timestamp);
        FHE.allow(timestamp, msg.sender);

        emit MessageSubmitted(messageId, msg.sender, block.timestamp);
    }

    /// @notice Get all message IDs for the calling user
    /// @return Array of message IDs owned by the caller
    function getUserMessages() external view returns (uint256[] memory) {
        return _userMessages[msg.sender];
    }

    /// @notice Get the total number of messages for a user
    /// @param user The address of the user
    /// @return The number of messages the user has
    function getUserMessageCount(address user) external view returns (uint256) {
        return _userMessages[user].length;
    }

    /// @notice Get message metadata (non-encrypted fields)
    /// @param messageId The ID of the message
    /// @return sender The address that submitted the message
    /// @return createdAt The block timestamp when the message was created
    /// @return exists Whether the message exists
    function getMessageMetadata(uint256 messageId) external view returns (
        address sender,
        uint256 createdAt,
        bool exists
    ) {
        Message storage message = _messages[messageId];
        return (message.sender, message.createdAt, message.exists);
    }

    /// @notice Get the encrypted content of a message
    /// @dev Only the message owner can access this
    /// @param messageId The ID of the message
    /// @return The encrypted content handle
    function getEncryptedContent(uint256 messageId) external view returns (euint64) {
        require(_messages[messageId].exists, "Message does not exist");
        require(_messages[messageId].sender == msg.sender, "Not authorized");
        return _messages[messageId].encryptedContent;
    }

    /// @notice Get the encrypted timestamp of a message
    /// @dev Only the message owner can access this
    /// @param messageId The ID of the message
    /// @return The encrypted timestamp handle
    function getEncryptedTimestamp(uint256 messageId) external view returns (euint32) {
        require(_messages[messageId].exists, "Message does not exist");
        require(_messages[messageId].sender == msg.sender, "Not authorized");
        return _messages[messageId].encryptedTimestamp;
    }

    /// @notice Get the total number of messages in the system
    /// @return The total message count
    function getTotalMessages() external view returns (uint256) {
        return _totalMessages;
    }

    /// @notice Check if a message belongs to the caller
    /// @param messageId The ID of the message
    /// @return Whether the caller owns the message
    function isMessageOwner(uint256 messageId) external view returns (bool) {
        return _messages[messageId].exists && _messages[messageId].sender == msg.sender;
    }

    /// @notice Submit a mock message for local testing (no FHE encryption)
    /// @dev This function is for local Hardhat testing only - uses FHE.asEuintXX to wrap plaintext
    /// @param content The plaintext message content
    /// @param timestamp The plaintext timestamp
    function submitMessageMock(uint64 content, uint32 timestamp) external {
        euint64 encContent = FHE.asEuint64(content);
        euint32 encTimestamp = FHE.asEuint32(timestamp);

        uint256 messageId = _totalMessages++;

        _messages[messageId] = Message({
            sender: msg.sender,
            encryptedContent: encContent,
            encryptedTimestamp: encTimestamp,
            createdAt: block.timestamp,
            exists: true
        });

        _userMessages[msg.sender].push(messageId);

        // Allow the contract and sender to access the encrypted data
        FHE.allowThis(encContent);
        FHE.allow(encContent, msg.sender);
        FHE.allowThis(encTimestamp);
        FHE.allow(encTimestamp, msg.sender);

        emit MessageSubmitted(messageId, msg.sender, block.timestamp);
    }

}
