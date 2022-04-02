// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Overbitegg is Ownable, ERC721 {
  using ECDSA for bytes32;
  using Strings for uint256;

  uint256 public constant TOTAL_MAX_SUPPLY = 100;
  uint256 public constant MINT_PRICE = 0.069 ether;
  uint256 public constant PUBLIC_MINT_MAX_PER_MINTER = 1;

  bool public isPublicMintActive = false;
  uint256 public mintedQty = 0;
  mapping(address => uint256) public minterToTokenQty;
  string public tokenBaseURI;

  constructor() ERC721("Overbitegg", "OBEGG") {}

  function _limitedMint(uint256 quantity) private {
    require(mintedQty + quantity <= TOTAL_MAX_SUPPLY, "SUPPLY_EXHAUSTED");

    minterToTokenQty[msg.sender] += quantity;
    for (uint256 i = 0; i < quantity; i++) {
      _safeMint(msg.sender, ++mintedQty);
    }
  }

  function giftMint(uint256 quantity, uint256 maxQuantity, bytes memory giftProof) external {
    require(isProofValid("GIFT", msg.sender, maxQuantity, giftProof), "PROOF_INVAID");
    require(minterToTokenQty[msg.sender] + quantity <= maxQuantity, "MAX_QTY_REACHED");

    _limitedMint(quantity);
  }

  function allowListMint(uint256 quantity, uint256 maxQuantity, bytes memory allowListProof) external payable {
    require(isProofValid("ALLOW_LIST", msg.sender, maxQuantity, allowListProof), "PROOF_INVAID");
    require(minterToTokenQty[msg.sender] + quantity <= maxQuantity, "MAX_QTY_REACHED");
    require(msg.value >= MINT_PRICE, "INSUFFICIENT_AMOUNT");

    _limitedMint(quantity);
  }

  function publicMint(uint256 quantity) external payable {
    require(isPublicMintActive, "PUBLIC_MINT_NOT_ACTIVE");
    require(minterToTokenQty[msg.sender] + quantity <= PUBLIC_MINT_MAX_PER_MINTER, "MAX_QTY_REACHED");
    require(msg.value >= MINT_PRICE * quantity, "INSUFFICIENT_AMOUNT");

    _limitedMint(quantity);
  }

  function isProofValid(string memory proofType, address addr, uint256 maxQuantity, bytes memory proof) public view returns (bool) {
    bytes32 hash = keccak256(abi.encodePacked(proofType, addr, maxQuantity));
    address signerAddress = hash.toEthSignedMessageHash().recover(proof);

    return signerAddress == owner();
  }

  function activatePublicMint() external onlyOwner {
    isPublicMintActive = true;
  }

  function disablePublicMint() external onlyOwner {
    isPublicMintActive = false;
  }

  function setBaseURI(string calldata uri) external onlyOwner {
    tokenBaseURI = uri;
  }

  function _baseURI() internal view override(ERC721) returns (string memory) {
    return tokenBaseURI;
  }
}