// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMedChainCore {
    function checkRole(bytes32 role, address account) external view returns (bool);
    function PATIENT_ROLE() external view returns (bytes32);
    function ADMIN_ROLE() external view returns (bytes32);
    function OPERATOR_ROLE() external view returns (bytes32);
    function DOCTOR_ROLE() external view returns (bytes32);
    function grantPatientRole(address patient) external;
    function paused() external view returns (bool);
    function getContract(string calldata name) external view returns (address);
}

contract PatientRegistry is ReentrancyGuard {
    IMedChainCore public medChainCore;

    enum RegStatus { None, Pending, Approved, Rejected, Active, Deactivated }

    struct PatientProfile {
        address walletAddress;
        bytes32 profileHash;
        string encryptedDataURI;
        uint256 registeredAt;
        uint256 updatedAt;
        bool isActive;
        uint256 totalRecords;
        string bloodType;
        string allergies;
        address approvedBy;
        RegStatus status;
    }

    struct EmergencyContact {
        string encryptedName;
        string encryptedPhone;
        string relationship;
    }

    struct RegRequest {
        address applicant;
        bytes32 profileHash;
        string encryptedDataURI;
        string bloodType;
        string allergies;
        uint256 submittedAt;
        uint256 reviewedAt;
        address reviewedBy;
        RegStatus status;
        string rejectionReason;
    }

    mapping(address => PatientProfile) private _patients;
    mapping(address => EmergencyContact) private _emergencyContacts;
    mapping(address => RegRequest) private _requests;
    mapping(bytes32 => bool) private _usedHashes;
    address[] private _patientAddresses;
    address[] private _pendingList;

    uint256 public totalRegistered;

    event RegistrationSubmitted(address indexed patient, bytes32 profileHash, uint256 timestamp);
    event RegistrationApproved(address indexed patient, address indexed approvedBy, uint256 timestamp);
    event RegistrationRejected(address indexed patient, string reason, uint256 timestamp);
    event ConsentGiven(address indexed patient, uint256 timestamp);
    event PatientUpdated(address indexed patient, bytes32 newProfileHash, uint256 timestamp);
    event PatientDeactivated(address indexed patient, uint256 timestamp);
    event PatientReactivated(address indexed patient, uint256 timestamp);
    event EmergencyContactSet(address indexed patient, uint256 timestamp);

    modifier onlyAdmin() {
        require(medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender), "PR: not admin");
        _;
    }

    modifier onlyOperatorOrAdmin() {
        require(
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.OPERATOR_ROLE(), msg.sender),
            "PR: not authorized"
        );
        _;
    }

    modifier notPaused() {
        require(!medChainCore.paused(), "PR: paused");
        _;
    }

    modifier onlyActivePatient() {
        require(_patients[msg.sender].status == RegStatus.Active, "PR: not active");
        _;
    }

    modifier canView(address _patient) {
        require(
            msg.sender == _patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.DOCTOR_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.OPERATOR_ROLE(), msg.sender),
            "PR: no access"
        );
        _;
    }

    constructor(address _core) {
        require(_core != address(0), "PR: zero addr");
        medChainCore = IMedChainCore(_core);
    }

    function _isValidBloodType(string calldata _bt) internal pure returns (bool) {
        bytes32 h = keccak256(bytes(_bt));
        return (
            h == keccak256("A+") || h == keccak256("A-") ||
            h == keccak256("B+") || h == keccak256("B-") ||
            h == keccak256("AB+") || h == keccak256("AB-") ||
            h == keccak256("O+") || h == keccak256("O-") ||
            bytes(_bt).length == 0
        );
    }

    function _removePending(address _addr) internal {
        for (uint256 i = 0; i < _pendingList.length; i++) {
            if (_pendingList[i] == _addr) {
                _pendingList[i] = _pendingList[_pendingList.length - 1];
                _pendingList.pop();
                break;
            }
        }
    }

    function submitRegistration(
        bytes32 _profileHash,
        string calldata _encryptedDataURI,
        string calldata _bloodType,
        string calldata _allergies
    ) external notPaused nonReentrant {
        require(_patients[msg.sender].status == RegStatus.None ||
                _patients[msg.sender].status == RegStatus.Rejected, "PR: invalid state");
        require(_profileHash != bytes32(0), "PR: empty hash");
        require(bytes(_encryptedDataURI).length > 0, "PR: empty URI");
        require(!_usedHashes[_profileHash], "PR: hash used");
        require(_isValidBloodType(_bloodType), "PR: invalid blood type");

        if (_patients[msg.sender].status == RegStatus.Rejected) {
            _usedHashes[_requests[msg.sender].profileHash] = false;
        }

        _usedHashes[_profileHash] = true;

        _requests[msg.sender] = RegRequest({
            applicant: msg.sender,
            profileHash: _profileHash,
            encryptedDataURI: _encryptedDataURI,
            bloodType: _bloodType,
            allergies: _allergies,
            submittedAt: block.timestamp,
            reviewedAt: 0,
            reviewedBy: address(0),
            status: RegStatus.Pending,
            rejectionReason: ""
        });

        _patients[msg.sender].status = RegStatus.Pending;
        _pendingList.push(msg.sender);

        emit RegistrationSubmitted(msg.sender, _profileHash, block.timestamp);
    }

    function approveRegistration(address _patient) external onlyOperatorOrAdmin notPaused nonReentrant {
        require(_patients[_patient].status == RegStatus.Pending, "PR: not pending");

        RegRequest storage req = _requests[_patient];
        req.status = RegStatus.Approved;
        req.reviewedAt = block.timestamp;
        req.reviewedBy = msg.sender;

        _patients[_patient].status = RegStatus.Approved;
        _patients[_patient].approvedBy = msg.sender;

        _removePending(_patient);

        emit RegistrationApproved(_patient, msg.sender, block.timestamp);
    }

    function rejectRegistration(address _patient, string calldata _reason) external onlyOperatorOrAdmin notPaused nonReentrant {
        require(_patients[_patient].status == RegStatus.Pending, "PR: not pending");
        require(bytes(_reason).length > 0, "PR: empty reason");

        RegRequest storage req = _requests[_patient];
        req.status = RegStatus.Rejected;
        req.reviewedAt = block.timestamp;
        req.reviewedBy = msg.sender;
        req.rejectionReason = _reason;

        _patients[_patient].status = RegStatus.Rejected;
        _usedHashes[req.profileHash] = false;

        _removePending(_patient);

        emit RegistrationRejected(_patient, _reason, block.timestamp);
    }

    function giveConsent() external notPaused nonReentrant {
        require(_patients[msg.sender].status == RegStatus.Approved, "PR: not approved");

        RegRequest storage req = _requests[msg.sender];

        _patients[msg.sender] = PatientProfile({
            walletAddress: msg.sender,
            profileHash: req.profileHash,
            encryptedDataURI: req.encryptedDataURI,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            isActive: true,
            totalRecords: 0,
            bloodType: req.bloodType,
            allergies: req.allergies,
            approvedBy: _patients[msg.sender].approvedBy,
            status: RegStatus.Active
        });

        _patientAddresses.push(msg.sender);
        totalRegistered++;

        emit ConsentGiven(msg.sender, block.timestamp);
    }

    function updateProfile(
        bytes32 _newHash,
        string calldata _newURI
    ) external onlyActivePatient notPaused nonReentrant {
        require(_newHash != bytes32(0), "PR: empty hash");
        require(bytes(_newURI).length > 0, "PR: empty URI");
        require(!_usedHashes[_newHash], "PR: hash used");

        _usedHashes[_patients[msg.sender].profileHash] = false;
        _usedHashes[_newHash] = true;

        _patients[msg.sender].profileHash = _newHash;
        _patients[msg.sender].encryptedDataURI = _newURI;
        _patients[msg.sender].updatedAt = block.timestamp;

        emit PatientUpdated(msg.sender, _newHash, block.timestamp);
    }

    function updateEmergencyMedicalInfo(
        string calldata _bloodType,
        string calldata _allergies
    ) external onlyActivePatient notPaused nonReentrant {
        require(_isValidBloodType(_bloodType), "PR: invalid blood type");
        _patients[msg.sender].bloodType = _bloodType;
        _patients[msg.sender].allergies = _allergies;
        _patients[msg.sender].updatedAt = block.timestamp;
    }

    function setEmergencyContact(
        string calldata _name,
        string calldata _phone,
        string calldata _relationship
    ) external onlyActivePatient notPaused nonReentrant {
        require(bytes(_name).length > 0, "PR: empty name");
        require(bytes(_phone).length > 0, "PR: empty phone");
        require(bytes(_relationship).length > 0, "PR: empty relation");

        _emergencyContacts[msg.sender] = EmergencyContact({
            encryptedName: _name,
            encryptedPhone: _phone,
            relationship: _relationship
        });

        emit EmergencyContactSet(msg.sender, block.timestamp);
    }

    function deactivateAccount() external onlyActivePatient notPaused nonReentrant {
        _patients[msg.sender].isActive = false;
        _patients[msg.sender].status = RegStatus.Deactivated;
        _patients[msg.sender].updatedAt = block.timestamp;
        emit PatientDeactivated(msg.sender, block.timestamp);
    }

    function reactivatePatient(address _patient) external onlyAdmin nonReentrant {
        require(_patients[_patient].status == RegStatus.Deactivated, "PR: not deactivated");
        _patients[_patient].isActive = true;
        _patients[_patient].status = RegStatus.Active;
        _patients[_patient].updatedAt = block.timestamp;
        emit PatientReactivated(_patient, block.timestamp);
    }

    function getPatient(address _patient) external view canView(_patient) returns (PatientProfile memory) {
        require(_patients[_patient].walletAddress != address(0), "PR: not found");
        return _patients[_patient];
    }

    function isActivePatient(address _patient) external view returns (bool) {
        return _patients[_patient].status == RegStatus.Active;
    }

    function getPatientStatus(address _patient) external view returns (RegStatus) {
        return _patients[_patient].status;
    }

    function getEmergencyInfo(address _patient) external view canView(_patient) returns (
        string memory bloodType,
        string memory allergies,
        EmergencyContact memory contact
    ) {
        return (_patients[_patient].bloodType, _patients[_patient].allergies, _emergencyContacts[_patient]);
    }

    function getRegistrationRequest(address _patient) external view returns (RegRequest memory) {
        require(
            msg.sender == _patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.OPERATOR_ROLE(), msg.sender),
            "PR: no access"
        );
        return _requests[_patient];
    }

    function getPendingList() external view onlyOperatorOrAdmin returns (address[] memory) {
        return _pendingList;
    }

    function getTotalPatients() external view returns (uint256) {
        return totalRegistered;
    }

    function incrementRecordCount(address _patient) external {
        require(medChainCore.getContract("RecordManager") == msg.sender, "PR: unauthorized");
        require(_patients[_patient].status == RegStatus.Active, "PR: not active");
        _patients[_patient].totalRecords++;
    }
}
