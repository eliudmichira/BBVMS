// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // Updated to a more recent version for security and features

contract Migrations {
    address public owner; // The deployer of the contract
    uint256 public lastCompletedMigration; // Tracks the last completed migration step

    // Event to log upgrades
    event Upgraded(address indexed newContract);

    // Restrict access to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Constructor sets the deployer as the owner
    constructor() {
        owner = msg.sender;
    }

    // Set the last completed migration step
    function setCompleted(uint256 completed) external onlyOwner {
        lastCompletedMigration = completed;
    }

    // Upgrade to a new contract address and transfer migration state
    function upgrade(address newAddress) external onlyOwner {
        require(newAddress != address(0), "New address cannot be zero");
        Migrations upgraded = Migrations(newAddress);
        upgraded.setCompleted(lastCompletedMigration);
        emit Upgraded(newAddress);
    }
}