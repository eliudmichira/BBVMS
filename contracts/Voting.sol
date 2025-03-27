// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    address public admin;
    uint256 public candidateCount;
    uint256 public startTime;
    uint256 public endTime;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event VoteCast(uint256 indexed candidateId, uint256 newVoteCount);
    event VotingPeriodSet(uint256 startTime, uint256 endTime);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only the admin can perform this action");
        _;
    }

    modifier votingActive() {
        require(block.timestamp >= startTime, "Voting has not started yet");
        require(block.timestamp <= endTime, "Voting has already ended");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addCandidate(string calldata _name, string calldata _party) external onlyAdmin {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        require(bytes(_party).length > 0, "Candidate party cannot be empty");
        
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _party, 0);
        emit CandidateAdded(candidateCount, _name, _party);
    }

    function getCandidate(uint256 _candidateId) external view returns (uint256, string memory, string memory, uint256) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Candidate does not exist");
        Candidate storage candidate = candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.party, candidate.voteCount);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            allCandidates[i] = candidates[i + 1]; // Fix: Proper indexing
        }
        return allCandidates;
    }

    function getCandidateCount() external view returns (uint256) {
        return candidateCount;
    }

    function setVotingPeriod(uint256 _startTime, uint256 _endTime) external onlyAdmin {
        require(_startTime > block.timestamp, "Start time must be in the future"); // Fix: Prevent past start time
        require(_startTime < _endTime, "Start time must be earlier than end time");
        require(_endTime > block.timestamp, "End time must be in the future");
        
        startTime = _startTime;
        endTime = _endTime;
        emit VotingPeriodSet(_startTime, _endTime);
    }

    function getVotingPeriod() external view returns (uint256, uint256) {
        return (startTime, endTime);
    }

    function vote(uint256 _candidateId) external votingActive {
        require(!hasVoted[msg.sender], "You have already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Candidate does not exist");
        
        hasVoted[msg.sender] = true;

        unchecked {
            candidates[_candidateId].voteCount++;
        }
        
        emit VoteCast(_candidateId, candidates[_candidateId].voteCount);
    }
}
