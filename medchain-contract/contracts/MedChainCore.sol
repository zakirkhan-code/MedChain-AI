// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MedChainCore is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(string => address) private _contractRegistry;
    string[] private _registeredNames;

    uint256 public totalPatients;
    uint256 public totalDoctors;
    uint256 public totalRecords;
    uint256 public platformLaunchTime;

    uint256 private constant RATE_LIMIT_WINDOW = 60;
    uint256 private constant RATE_LIMIT_MAX = 10;
    mapping(address => uint256) private _rateLimitStart;
    mapping(address => uint256) private _rateLimitCount;

    event ContractRegistered(string indexed name, address indexed contractAddress);
    event ContractUpdated(string indexed name, address indexed oldAddress, address indexed newAddress);
    event PlatformPaused(address indexed by, string reason);
    event PlatformUnpaused(address indexed by);
    event RoleGrantedEvent(bytes32 indexed role, address indexed account, address indexed grantor);
    event RoleRevokedEvent(bytes32 indexed role, address indexed account, address indexed revoker);

    modifier rateLimited() {
        if (block.timestamp > _rateLimitStart[msg.sender] + RATE_LIMIT_WINDOW) {
            _rateLimitStart[msg.sender] = block.timestamp;
            _rateLimitCount[msg.sender] = 0;
        }
        require(_rateLimitCount[msg.sender] < RATE_LIMIT_MAX, "Core: rate limit");
        _rateLimitCount[msg.sender]++;
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        platformLaunchTime = block.timestamp;
    }

    function registerContract(string calldata _name, address _addr) external onlyRole(ADMIN_ROLE) {
        require(_addr != address(0), "Core: zero addr");
        require(bytes(_name).length > 0, "Core: empty name");
        require(_contractRegistry[_name] == address(0), "Core: exists");
        _contractRegistry[_name] = _addr;
        _registeredNames.push(_name);
        emit ContractRegistered(_name, _addr);
    }

    function updateContract(string calldata _name, address _newAddr) external onlyRole(ADMIN_ROLE) {
        require(_newAddr != address(0), "Core: zero addr");
        address oldAddr = _contractRegistry[_name];
        require(oldAddr != address(0), "Core: not found");
        require(oldAddr != _newAddr, "Core: same addr");
        _contractRegistry[_name] = _newAddr;
        emit ContractUpdated(_name, oldAddr, _newAddr);
    }

    function getContract(string calldata _name) external view returns (address) {
        return _contractRegistry[_name];
    }

    function getRegisteredContracts() external view returns (string[] memory) {
        return _registeredNames;
    }

    function grantPatientRole(address _patient) external onlyRole(OPERATOR_ROLE) whenNotPaused rateLimited {
        require(_patient != address(0), "Core: zero addr");
        require(!hasRole(PATIENT_ROLE, _patient), "Core: already patient");
        _grantRole(PATIENT_ROLE, _patient);
        totalPatients++;
        emit RoleGrantedEvent(PATIENT_ROLE, _patient, msg.sender);
    }

    function grantDoctorRole(address _doctor) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(_doctor != address(0), "Core: zero addr");
        require(!hasRole(DOCTOR_ROLE, _doctor), "Core: already doctor");
        _grantRole(DOCTOR_ROLE, _doctor);
        totalDoctors++;
        emit RoleGrantedEvent(DOCTOR_ROLE, _doctor, msg.sender);
    }

    function grantOperatorRole(address _operator) external onlyRole(ADMIN_ROLE) {
        require(_operator != address(0), "Core: zero addr");
        require(!hasRole(OPERATOR_ROLE, _operator), "Core: already operator");
        _grantRole(OPERATOR_ROLE, _operator);
        emit RoleGrantedEvent(OPERATOR_ROLE, _operator, msg.sender);
    }

    function revokePatientRole(address _patient) external onlyRole(ADMIN_ROLE) {
        require(hasRole(PATIENT_ROLE, _patient), "Core: not patient");
        _revokeRole(PATIENT_ROLE, _patient);
        emit RoleRevokedEvent(PATIENT_ROLE, _patient, msg.sender);
    }

    function revokeDoctorRole(address _doctor) external onlyRole(ADMIN_ROLE) {
        require(hasRole(DOCTOR_ROLE, _doctor), "Core: not doctor");
        _revokeRole(DOCTOR_ROLE, _doctor);
        emit RoleRevokedEvent(DOCTOR_ROLE, _doctor, msg.sender);
    }

    function revokeOperatorRole(address _operator) external onlyRole(ADMIN_ROLE) {
        require(hasRole(OPERATOR_ROLE, _operator), "Core: not operator");
        _revokeRole(OPERATOR_ROLE, _operator);
        emit RoleRevokedEvent(OPERATOR_ROLE, _operator, msg.sender);
    }

    function checkRole(bytes32 _role, address _account) external view returns (bool) {
        return hasRole(_role, _account);
    }

    function pausePlatform(string calldata _reason) external onlyRole(ADMIN_ROLE) {
        require(bytes(_reason).length > 0, "Core: empty reason");
        _pause();
        emit PlatformPaused(msg.sender, _reason);
    }

    function unpausePlatform() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit PlatformUnpaused(msg.sender);
    }

    function incrementRecordCount() external whenNotPaused {
        require(_contractRegistry["RecordManager"] == msg.sender, "Core: unauthorized");
        totalRecords++;
    }

    function getPlatformStats() external view returns (
        uint256 _totalPatients,
        uint256 _totalDoctors,
        uint256 _totalRecords,
        uint256 _launchTime,
        bool _isPaused
    ) {
        return (totalPatients, totalDoctors, totalRecords, platformLaunchTime, paused());
    }
}
