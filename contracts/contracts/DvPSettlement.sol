// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DvPSettlement
 * @notice Minimal delivery-versus-payment contract for atomic ERC-1155 token/ETH settlement.
 */
contract DvPSettlement is ERC1155Holder, ReentrancyGuard {
    struct Trade {
        address buyer;
        address seller;
        address tokenContract;
        uint256 tokenId;
        uint256 quantity;
        uint256 priceWei;
        uint256 expiresAt;
        bool settled;
        bool cancelled;
    }

    mapping(bytes32 => Trade) public trades;

    event TradeCreated(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address tokenContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 priceWei,
        uint256 expiresAt
    );
    event TradeSettled(bytes32 indexed tradeId, address indexed buyer, address indexed seller, uint256 valueWei);
    event TradeCancelled(bytes32 indexed tradeId, address indexed cancelledBy);

    function createTrade(
        bytes32 tradeId,
        address seller,
        address tokenContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 expiresAt
    ) external payable {
        require(tradeId != bytes32(0), "Invalid trade ID");
        require(seller != address(0), "Invalid seller");
        require(tokenContract != address(0), "Invalid token contract");
        require(quantity > 0, "Quantity must be positive");
        require(msg.value > 0, "Price must be positive");
        require(expiresAt > block.timestamp, "Expiry must be in the future");
        require(trades[tradeId].buyer == address(0), "Trade already exists");

        trades[tradeId] = Trade({
            buyer: msg.sender,
            seller: seller,
            tokenContract: tokenContract,
            tokenId: tokenId,
            quantity: quantity,
            priceWei: msg.value,
            expiresAt: expiresAt,
            settled: false,
            cancelled: false
        });

        emit TradeCreated(
            tradeId,
            msg.sender,
            seller,
            tokenContract,
            tokenId,
            quantity,
            msg.value,
            expiresAt
        );
    }

    function settleTrade(bytes32 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];

        require(trade.buyer != address(0), "Trade not found");
        require(!trade.settled, "Trade already settled");
        require(!trade.cancelled, "Trade cancelled");
        require(block.timestamp <= trade.expiresAt, "Trade expired");

        IERC1155 token = IERC1155(trade.tokenContract);
        token.safeTransferFrom(trade.seller, trade.buyer, trade.tokenId, trade.quantity, "");

        trade.settled = true;

        (bool sent, ) = payable(trade.seller).call{value: trade.priceWei}("");
        require(sent, "ETH transfer failed");

        emit TradeSettled(tradeId, trade.buyer, trade.seller, trade.priceWei);
    }

    function cancelTrade(bytes32 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];

        require(trade.buyer != address(0), "Trade not found");
        require(!trade.settled, "Trade already settled");
        require(!trade.cancelled, "Trade already cancelled");
        require(msg.sender == trade.buyer || block.timestamp > trade.expiresAt, "Not authorized to cancel");

        trade.cancelled = true;

        (bool refunded, ) = payable(trade.buyer).call{value: trade.priceWei}("");
        require(refunded, "Refund failed");

        emit TradeCancelled(tradeId, msg.sender);
    }
}
