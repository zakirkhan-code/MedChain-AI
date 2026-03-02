// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMedChainCore2 {
    function checkRole(bytes32 role, address account) external view returns (bool);
    function ADMIN_ROLE() external view returns (bytes32);
    function DOCTOR_ROLE() external view returns (bytes32);
    function PATIENT_ROLE() external view returns (bytes32);
    function OPERATOR_ROLE() external view returns (bytes32);
    function grantDoctorRole(address doctor) external;
    function revokeDoctorRole(address doctor) external;
    function paused() external view returns (bool);
    function getContract(string calldata name) external view returns (address);
}

contract DoctorRegistry is ReentrancyGuard {
    IMedChainCore2 public medChainCore;

    enum DocStatus { None, Pending, Verified, Rejected, Suspended }

    struct DoctorProfile {
        address walletAddress;
        bytes32 credentialHash;
        string encryptedDataURI;
        string specialization;
        string licenseNumber;
        DocStatus status;
        address verifiedBy;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 updatedAt;
        bool isActive;
        uint256 patientCount;
        uint256 ratingTotal;
        uint256 ratingCount;
        string suspensionReason;
    }

    struct VerificationRequest {
        address doctor;
        string documentURI;
        uint256 requestedAt;
        uint256 reviewedAt;
        address reviewedBy;
        DocStatus status;
        string rejectionReason;
    }

    mapping(address => DoctorProfile) private _doctors;
    mapping(address => VerificationRequest) private _requests;
    mapping(string => address) private _licenseToDoctor;
    mapping(bytes32 => bool) private _usedCredHashes;
    mapping(address => mapping(address => bool)) private _hasRated;
    address[] private _doctorAddresses;
    address[] private _pendingList;

    uint256 public totalRegistered;
    uint256 public totalVerified;

    string[17] private _validSpecs = [
        "Cardiology", "Neurology", "Orthopedics", "Pediatrics",
        "Dermatology", "Oncology", "Psychiatry", "Surgery",
        "Radiology", "Gynecology", "Urology", "ENT",
        "Ophthalmology", "GeneralMedicine", "Dentistry", "Physiotherapy", "Other"
    ];

    event DoctorSubmitted(address indexed doctor, string specialization, uint256 timestamp);
    event DoctorVerified(address indexed doctor, address indexed verifiedBy, uint256 timestamp);
    event DoctorRejected(address indexed doctor, string reason, uint256 timestamp);
    event DoctorSuspended(address indexed doctor, string reason, uint256 timestamp);
    event DoctorReinstated(address indexed doctor, uint256 timestamp);
    event DoctorProfileUpdated(address indexed doctor, uint256 timestamp);
    event DoctorRated(address indexed doctor, address indexed patient, uint256 rating);

    modifier onlyAdmin() {
        require(medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender), "DR: not admin");
        _;
    }

    modifier notPaused() {
        require(!medChainCore.paused(), "DR: paused");
        _;
    }

    modifier onlyVerifiedDoctor() {
        require(
            _doctors[msg.sender].status == DocStatus.Verified && _doctors[msg.sender].isActive,
            "DR: not verified"
        );
        _;
    }

    modifier canViewDoctor(address _doctor) {
        require(
            msg.sender == _doctor ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.OPERATOR_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.PATIENT_ROLE(), msg.sender),
            "DR: no access"
        );
        _;
    }

    constructor(address _core) {
        require(_core != address(0), "DR: zero addr");
        medChainCore = IMedChainCore2(_core);
    }

    function _isValidSpec(string calldata _spec) internal view returns (bool) {
        bytes32 h = keccak256(bytes(_spec));
        for (uint256 i = 0; i < _validSpecs.length; i++) {
            if (h == keccak256(bytes(_validSpecs[i]))) return true;
        }
        return false;
    }

    function _removePending(address _doctor) internal {
        for (uint256 i = 0; i < _pendingList.length; i++) {
            if (_pendingList[i] == _doctor) {
                _pendingList[i] = _pendingList[_pendingList.length - 1];
                _pendingList.pop();
                break;
            }
        }
    }

    function submitApplication(
        bytes32 _credentialHash,
        string calldata _encryptedDataURI,
        string calldata _specialization,
        string calldata _licenseNumber,
        string calldata _documentURI
    ) external notPaused nonReentrant {
        require(
            _doctors[msg.sender].status == DocStatus.None ||
            _doctors[msg.sender].status == DocStatus.Rejected,
            "DR: invalid state"
        );
        require(_credentialHash != bytes32(0), "DR: empty hash");
        require(bytes(_specialization).length > 0, "DR: empty spec");
        require(bytes(_licenseNumber).length > 0, "DR: empty license");
        require(bytes(_documentURI).length > 0, "DR: empty doc URI");
        require(_isValidSpec(_specialization), "DR: invalid spec");
        require(!_usedCredHashes[_credentialHash], "DR: hash used");
        require(_licenseToDoctor[_licenseNumber] == address(0), "DR: license taken");

        if (_doctors[msg.sender].status == DocStatus.Rejected) {
            _usedCredHashes[_requests[msg.sender].doctor != address(0) ? _doctors[msg.sender].credentialHash : bytes32(0)] = false;
            string memory oldLicense = _doctors[msg.sender].licenseNumber;
            if (bytes(oldLicense).length > 0) {
                _licenseToDoctor[oldLicense] = address(0);
            }
        }

        _usedCredHashes[_credentialHash] = true;
        _licenseToDoctor[_licenseNumber] = msg.sender;

        _doctors[msg.sender] = DoctorProfile({
            walletAddress: msg.sender,
            credentialHash: _credentialHash,
            encryptedDataURI: _encryptedDataURI,
            specialization: _specialization,
            licenseNumber: _licenseNumber,
            status: DocStatus.Pending,
            verifiedBy: address(0),
            registeredAt: block.timestamp,
            verifiedAt: 0,
            updatedAt: block.timestamp,
            isActive: false,
            patientCount: 0,
            ratingTotal: 0,
            ratingCount: 0,
            suspensionReason: ""
        });

        _requests[msg.sender] = VerificationRequest({
            doctor: msg.sender,
            documentURI: _documentURI,
            requestedAt: block.timestamp,
            reviewedAt: 0,
            reviewedBy: address(0),
            status: DocStatus.Pending,
            rejectionReason: ""
        });

        _doctorAddresses.push(msg.sender);
        _pendingList.push(msg.sender);
        totalRegistered++;

        emit DoctorSubmitted(msg.sender, _specialization, block.timestamp);
    }

    function verifyDoctor(address _doctor) external onlyAdmin notPaused nonReentrant {
        require(_doctors[_doctor].status == DocStatus.Pending, "DR: not pending");

        _doctors[_doctor].status = DocStatus.Verified;
        _doctors[_doctor].isActive = true;
        _doctors[_doctor].verifiedBy = msg.sender;
        _doctors[_doctor].verifiedAt = block.timestamp;
        _doctors[_doctor].updatedAt = block.timestamp;

        _requests[_doctor].status = DocStatus.Verified;
        _requests[_doctor].reviewedAt = block.timestamp;
        _requests[_doctor].reviewedBy = msg.sender;

        medChainCore.grantDoctorRole(_doctor);
        totalVerified++;
        _removePending(_doctor);

        emit DoctorVerified(_doctor, msg.sender, block.timestamp);
    }

    function rejectDoctor(address _doctor, string calldata _reason) external onlyAdmin notPaused nonReentrant {
        require(_doctors[_doctor].status == DocStatus.Pending, "DR: not pending");
        require(bytes(_reason).length > 0, "DR: empty reason");

        _doctors[_doctor].status = DocStatus.Rejected;
        _doctors[_doctor].updatedAt = block.timestamp;

        _requests[_doctor].status = DocStatus.Rejected;
        _requests[_doctor].rejectionReason = _reason;
        _requests[_doctor].reviewedAt = block.timestamp;
        _requests[_doctor].reviewedBy = msg.sender;

        _usedCredHashes[_doctors[_doctor].credentialHash] = false;
        _licenseToDoctor[_doctors[_doctor].licenseNumber] = address(0);

        _removePending(_doctor);

        emit DoctorRejected(_doctor, _reason, block.timestamp);
    }

    function suspendDoctor(address _doctor, string calldata _reason) external onlyAdmin nonReentrant {
        require(_doctors[_doctor].status == DocStatus.Verified, "DR: not verified");
        require(bytes(_reason).length > 0, "DR: empty reason");

        _doctors[_doctor].status = DocStatus.Suspended;
        _doctors[_doctor].isActive = false;
        _doctors[_doctor].suspensionReason = _reason;
        _doctors[_doctor].updatedAt = block.timestamp;

        medChainCore.revokeDoctorRole(_doctor);

        emit DoctorSuspended(_doctor, _reason, block.timestamp);
    }

    function reinstateDoctor(address _doctor) external onlyAdmin nonReentrant {
        require(_doctors[_doctor].status == DocStatus.Suspended, "DR: not suspended");

        _doctors[_doctor].status = DocStatus.Verified;
        _doctors[_doctor].isActive = true;
        _doctors[_doctor].suspensionReason = "";
        _doctors[_doctor].updatedAt = block.timestamp;

        medChainCore.grantDoctorRole(_doctor);

        emit DoctorReinstated(_doctor, block.timestamp);
    }

    function updateProfile(
        string calldata _encryptedDataURI,
        string calldata _specialization
    ) external onlyVerifiedDoctor notPaused nonReentrant {
        require(bytes(_encryptedDataURI).length > 0, "DR: empty URI");
        require(_isValidSpec(_specialization), "DR: invalid spec");

        _doctors[msg.sender].encryptedDataURI = _encryptedDataURI;
        _doctors[msg.sender].specialization = _specialization;
        _doctors[msg.sender].updatedAt = block.timestamp;

        emit DoctorProfileUpdated(msg.sender, block.timestamp);
    }

    function rateDoctor(address _doctor, uint256 _rating) external notPaused nonReentrant {
        require(medChainCore.checkRole(medChainCore.PATIENT_ROLE(), msg.sender), "DR: not patient");
        require(_rating >= 1 && _rating <= 5, "DR: invalid rating");
        require(_doctors[_doctor].status == DocStatus.Verified, "DR: not verified");
        require(!_hasRated[msg.sender][_doctor], "DR: already rated");

        _hasRated[msg.sender][_doctor] = true;
        _doctors[_doctor].ratingTotal += _rating;
        _doctors[_doctor].ratingCount++;

        emit DoctorRated(_doctor, msg.sender, _rating);
    }

    function getDoctor(address _doctor) external view canViewDoctor(_doctor) returns (DoctorProfile memory) {
        require(_doctors[_doctor].walletAddress != address(0), "DR: not found");
        return _doctors[_doctor];
    }

    function isVerifiedDoctor(address _doctor) external view returns (bool) {
        return _doctors[_doctor].status == DocStatus.Verified && _doctors[_doctor].isActive;
    }

    function getDocStatus(address _doctor) external view returns (DocStatus) {
        return _doctors[_doctor].status;
    }

    function getVerificationRequest(address _doctor) external view returns (VerificationRequest memory) {
        require(
            msg.sender == _doctor ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "DR: no access"
        );
        return _requests[_doctor];
    }

    function getPendingList() external view onlyAdmin returns (address[] memory) {
        return _pendingList;
    }

    function getAverageRating(address _doctor) external view returns (uint256 avg, uint256 count) {
        if (_doctors[_doctor].ratingCount == 0) return (0, 0);
        return ((_doctors[_doctor].ratingTotal * 100) / _doctors[_doctor].ratingCount, _doctors[_doctor].ratingCount);
    }

    function incrementPatientCount(address _doctor) external {
        require(medChainCore.getContract("AccessControl") == msg.sender, "DR: unauthorized");
        require(_doctors[_doctor].isActive, "DR: not active");
        _doctors[_doctor].patientCount++;
    }
}
