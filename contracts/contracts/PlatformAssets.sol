// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title PlatformAssets
 * @notice ERC-1155 multi-token contract for carbon credits and loan portions.
 *         Enforces on-chain KYC for all transfers and minting.
 */
contract PlatformAssets is ERC1155, AccessControl, Pausable, ERC1155Supply {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Per-token metadata URIs
    mapping(uint256 => string) private _tokenURIs;

    // KYC approval registry
    mapping(address => bool) private _kycApproved;

    // Events
    event AssetMinted(uint256 indexed tokenId, uint256 amount, address indexed minter, string uri);
    event AssetBurned(uint256 indexed tokenId, uint256 amount, address indexed burner);
    event KYCApproved(address indexed account);
    event KYCRevoked(address indexed account);

    constructor(string memory baseUri) ERC1155(baseUri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @notice Mint new tokens to a KYC-approved address.
     * @param to        Recipient (must be KYC-approved)
     * @param tokenId   Token identifier
     * @param amount    Number of tokens to mint
     * @param tokenURI  Optional per-token metadata URI (stored if non-empty)
     * @param data      ABI-encoded data passed to ERC1155Receiver
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        string memory tokenURI,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) whenNotPaused {
        require(_kycApproved[to], "Recipient not KYC approved");

        _mint(to, tokenId, amount, data);

        if (bytes(tokenURI).length > 0) {
            _tokenURIs[tokenId] = tokenURI;
        }

        emit AssetMinted(tokenId, amount, msg.sender, tokenURI);
    }

    /**
     * @notice Batch mint tokens to a KYC-approved address.
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) whenNotPaused {
        require(_kycApproved[to], "Recipient not KYC approved");
        _mintBatch(to, tokenIds, amounts, data);
    }

    /**
     * @notice Burn tokens (e.g., carbon credit retirement).
     */
    function burn(
        address from,
        uint256 tokenId,
        uint256 amount
    ) public whenNotPaused {
        require(
            from == msg.sender || isApprovedForAll(from, msg.sender),
            "Caller is not owner nor approved"
        );

        _burn(from, tokenId, amount);
        emit AssetBurned(tokenId, amount, from);
    }

    /**
     * @notice Approve KYC for an address (admin only).
     */
    function approveKYC(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _kycApproved[account] = true;
        emit KYCApproved(account);
    }

    /**
     * @notice Revoke KYC for an address (admin only).
     */
    function revokeKYC(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _kycApproved[account] = false;
        emit KYCRevoked(account);
    }

    /**
     * @notice Check whether an address is KYC-approved.
     */
    function isKYCApproved(address account) public view returns (bool) {
        return _kycApproved[account];
    }

    /**
     * @notice Returns the metadata URI for a token (per-token if set, else base URI).
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];

        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }

        return super.uri(tokenId);
    }

    /**
     * @notice Pause all token operations.
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause all token operations.
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Enforces KYC on transfers (mints from address(0) and burns to address(0) are exempt).
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        // Allow minting and burning without KYC check on the zero address side
        if (from != address(0) && to != address(0)) {
            require(_kycApproved[to], "Recipient not KYC approved");
        }

        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /**
     * @dev Required override for AccessControl + ERC1155.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
