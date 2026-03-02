// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMedChainCore4 {
    function checkRole(bytes32 role, address account) external view returns (bool);
    function PATIENT_ROLE() external view returns (bytes32);
    function ADMIN_ROLE() external view returns (bytes32);
    function DOCTOR_ROLE() external view returns (bytes32);
    function paused() external view returns (bool);
    function getContract(string calldata name) external view returns (address);
}

interface IDoctorRegistry {
    function isVerifiedDoctor(address doctor) external view returns (bool);
    function incrementPatientCount(address doctor) external;
}

interface IConsentLedger {
    function logConsent(address patient, address actor, uint8 action, uint256 recordId, string calldata details, bytes32 dataHash) external returns (uint256);
}

contract MedChainAccessControl is ReentrancyGuard {
    IMedChainCore4 public medChainCore;

    enum AccessLevel { None, ReadOnly, ReadWrite, Emergency }
    enum RequestStatus { Pending, Approved, Rejected, Expired, Cancelled }

    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 365 days;
    uint256 public constant EMERGENCY_MAX = 24 hours;

    struct AccessPermission {
        address patient;
        address grantedTo;
        AccessLevel level;
        uint256 grantedAt;
        uint256 expiresAt;
        bool isActive;
        uint8[] allowedRecordTypes;
        string purpose;
    }

    struct AccessRequest {
        uint256 requestId;
        address doctor;
        address patient;
        AccessLevel requestedLevel;
        uint8[] requestedTypes;
        string reason;
        RequestStatus status;
        uint256 requestedAt;
        uint256 respondedAt;
        uint256 duration;
    }

    mapping(address => mapping(address => AccessPermission)) private _permissions;
    mapping(address => address[]) private _patientProviders;
    mapping(address => address[]) private _providerPatients;

    mapping(uint256 => AccessRequest) private _requests;
    mapping(address => uint256[]) private _patientRequests;
    mapping(address => uint256[]) private _doctorRequests;

    uint256 public nextRequestId;
    uint256 public totalActivePermissions;
    uint256 public totalRequests;

    event AccessGranted(address indexed patient, address indexed provider, AccessLevel level, uint256 expiresAt, uint256 timestamp);
    event AccessRevoked(address indexed patient, address indexed provider, uint256 timestamp);
    event AccessExpired(address indexed patient, address indexed provider, uint256 timestamp);
    event AccessRequested(uint256 indexed requestId, address indexed doctor, address indexed patient, string reason, uint256 timestamp);
    event RequestApproved(uint256 indexed requestId, address indexed patient, uint256 timestamp);
    event RequestRejected(uint256 indexed requestId, address indexed patient, uint256 timestamp);
    event RequestCancelled(uint256 indexed requestId, address indexed doctor, uint256 timestamp);
    event EmergencyAccessGranted(address indexed patient, address indexed provider, uint256 timestamp);

    modifier notPaused() {
        require(!medChainCore.paused(), "AC: paused");
        _;
    }

    modifier onlyAdmin() {
        require(medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender), "AC: not admin");
        _;
    }

    modifier onlyPatient() {
        require(medChainCore.checkRole(medChainCore.PATIENT_ROLE(), msg.sender), "AC: not patient");
        _;
    }

    modifier onlyDoctor() {
        require(medChainCore.checkRole(medChainCore.DOCTOR_ROLE(), msg.sender), "AC: not doctor");
        _;
    }

    constructor(address _core) {
        require(_core != address(0), "AC: zero addr");
        medChainCore = IMedChainCore4(_core);
        nextRequestId = 1;
    }

    function _logToLedger(address _patient, address _actor, uint8 _action, string memory _details) internal {
        address ledgerAddr = medChainCore.getContract("ConsentLedger");
        if (ledgerAddr != address(0)) {
            try IConsentLedger(ledgerAddr).logConsent(_patient, _actor, _action, 0, _details, bytes32(0)) {} catch {}
        }
    }

    function _checkAndExpire(address _patient, address _provider) internal returns (bool) {
        AccessPermission storage perm = _permissions[_patient][_provider];
        if (perm.isActive && block.timestamp > perm.expiresAt) {
            perm.isActive = false;
            totalActivePermissions--;
            _logToLedger(_patient, _provider, 2, "auto-expired");
            emit AccessExpired(_patient, _provider, block.timestamp);
            return true;
        }
        return false;
    }

    function _isDoctorVerified(address _doctor) internal view returns (bool) {
        address drAddr = medChainCore.getContract("DoctorRegistry");
        if (drAddr == address(0)) return false;
        return IDoctorRegistry(drAddr).isVerifiedDoctor(_doctor);
    }

    function grantAccess(
        address _provider,
        AccessLevel _level,
        uint256 _duration,
        uint8[] calldata _allowedTypes,
        string calldata _purpose
    ) external onlyPatient notPaused nonReentrant {
        require(_provider != address(0), "AC: zero addr");
        require(_provider != msg.sender, "AC: self grant");
        require(_level != AccessLevel.None && _level != AccessLevel.Emergency, "AC: invalid level");
        require(_duration >= MIN_DURATION && _duration <= MAX_DURATION, "AC: invalid duration");
        require(_isDoctorVerified(_provider), "AC: doctor not verified");
        require(!_permissions[msg.sender][_provider].isActive, "AC: already active");

        uint256 expiresAt = block.timestamp + _duration;

        _permissions[msg.sender][_provider] = AccessPermission({
            patient: msg.sender,
            grantedTo: _provider,
            level: _level,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            allowedRecordTypes: _allowedTypes,
            purpose: _purpose
        });

        _patientProviders[msg.sender].push(_provider);
        _providerPatients[_provider].push(msg.sender);
        totalActivePermissions++;

        address drAddr = medChainCore.getContract("DoctorRegistry");
        if (drAddr != address(0)) {
            try IDoctorRegistry(drAddr).incrementPatientCount(_provider) {} catch {}
        }

        _logToLedger(msg.sender, _provider, 0, _purpose);
        emit AccessGranted(msg.sender, _provider, _level, expiresAt, block.timestamp);
    }

    function revokeAccess(address _provider) external onlyPatient notPaused nonReentrant {
        require(_permissions[msg.sender][_provider].isActive, "AC: not active");
        _permissions[msg.sender][_provider].isActive = false;
        totalActivePermissions--;
        _logToLedger(msg.sender, _provider, 1, "revoked by patient");
        emit AccessRevoked(msg.sender, _provider, block.timestamp);
    }

    function revokeAllAccess() external onlyPatient notPaused nonReentrant {
        address[] storage providers = _patientProviders[msg.sender];
        for (uint256 i = 0; i < providers.length; i++) {
            if (_permissions[msg.sender][providers[i]].isActive) {
                _permissions[msg.sender][providers[i]].isActive = false;
                totalActivePermissions--;
                _logToLedger(msg.sender, providers[i], 1, "bulk revoke");
                emit AccessRevoked(msg.sender, providers[i], block.timestamp);
            }
        }
    }

    function requestAccess(
        address _patient,
        AccessLevel _requestedLevel,
        uint8[] calldata _requestedTypes,
        string calldata _reason,
        uint256 _duration
    ) external onlyDoctor notPaused nonReentrant {
        require(_patient != address(0), "AC: zero addr");
        require(_patient != msg.sender, "AC: self request");
        require(_requestedLevel != AccessLevel.None && _requestedLevel != AccessLevel.Emergency, "AC: invalid level");
        require(_duration >= MIN_DURATION && _duration <= MAX_DURATION, "AC: invalid duration");
        require(bytes(_reason).length > 0, "AC: empty reason");
        require(_isDoctorVerified(msg.sender), "AC: not verified");

        uint256 requestId = nextRequestId++;

        _requests[requestId] = AccessRequest({
            requestId: requestId,
            doctor: msg.sender,
            patient: _patient,
            requestedLevel: _requestedLevel,
            requestedTypes: _requestedTypes,
            reason: _reason,
            status: RequestStatus.Pending,
            requestedAt: block.timestamp,
            respondedAt: 0,
            duration: _duration
        });

        _patientRequests[_patient].push(requestId);
        _doctorRequests[msg.sender].push(requestId);
        totalRequests++;

        _logToLedger(_patient, msg.sender, 4, _reason);
        emit AccessRequested(requestId, msg.sender, _patient, _reason, block.timestamp);
    }

    function approveRequest(uint256 _requestId) external onlyPatient notPaused nonReentrant {
        AccessRequest storage req = _requests[_requestId];
        require(req.patient == msg.sender, "AC: not your request");
        require(req.status == RequestStatus.Pending, "AC: not pending");
        require(_isDoctorVerified(req.doctor), "AC: doctor not verified");

        req.status = RequestStatus.Approved;
        req.respondedAt = block.timestamp;

        uint256 expiresAt = block.timestamp + req.duration;

        _permissions[msg.sender][req.doctor] = AccessPermission({
            patient: msg.sender,
            grantedTo: req.doctor,
            level: req.requestedLevel,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            allowedRecordTypes: req.requestedTypes,
            purpose: req.reason
        });

        _patientProviders[msg.sender].push(req.doctor);
        _providerPatients[req.doctor].push(msg.sender);
        totalActivePermissions++;

        address drAddr = medChainCore.getContract("DoctorRegistry");
        if (drAddr != address(0)) {
            try IDoctorRegistry(drAddr).incrementPatientCount(req.doctor) {} catch {}
        }

        _logToLedger(msg.sender, req.doctor, 5, "request approved");
        emit RequestApproved(_requestId, msg.sender, block.timestamp);
        emit AccessGranted(msg.sender, req.doctor, req.requestedLevel, expiresAt, block.timestamp);
    }

    function rejectRequest(uint256 _requestId) external onlyPatient notPaused nonReentrant {
        AccessRequest storage req = _requests[_requestId];
        require(req.patient == msg.sender, "AC: not your request");
        require(req.status == RequestStatus.Pending, "AC: not pending");

        req.status = RequestStatus.Rejected;
        req.respondedAt = block.timestamp;

        _logToLedger(msg.sender, req.doctor, 6, "request rejected");
        emit RequestRejected(_requestId, msg.sender, block.timestamp);
    }

    function cancelRequest(uint256 _requestId) external onlyDoctor notPaused nonReentrant {
        AccessRequest storage req = _requests[_requestId];
        require(req.doctor == msg.sender, "AC: not your request");
        require(req.status == RequestStatus.Pending, "AC: not pending");

        req.status = RequestStatus.Cancelled;
        req.respondedAt = block.timestamp;

        emit RequestCancelled(_requestId, msg.sender, block.timestamp);
    }

    function grantEmergencyAccess(address _patient, address _provider) external onlyAdmin notPaused nonReentrant {
        require(_patient != address(0) && _provider != address(0), "AC: zero addr");

        _permissions[_patient][_provider] = AccessPermission({
            patient: _patient,
            grantedTo: _provider,
            level: AccessLevel.Emergency,
            grantedAt: block.timestamp,
            expiresAt: block.timestamp + EMERGENCY_MAX,
            isActive: true,
            allowedRecordTypes: new uint8[](0),
            purpose: "EMERGENCY ACCESS"
        });

        _patientProviders[_patient].push(_provider);
        _providerPatients[_provider].push(_patient);
        totalActivePermissions++;

        _logToLedger(_patient, _provider, 3, "EMERGENCY");
        emit EmergencyAccessGranted(_patient, _provider, block.timestamp);
    }

    function checkAccess(address _patient, address _provider) external returns (bool hasAccess, uint8 level) {
        _checkAndExpire(_patient, _provider);
        AccessPermission storage perm = _permissions[_patient][_provider];
        if (!perm.isActive) return (false, 0);
        return (true, uint8(perm.level));
    }

    function canAccessRecordType(address _patient, address _provider, uint8 _recordType) external returns (bool) {
        _checkAndExpire(_patient, _provider);
        AccessPermission storage perm = _permissions[_patient][_provider];
        if (!perm.isActive) return false;
        if (perm.level == AccessLevel.Emergency) return true;
        for (uint256 i = 0; i < perm.allowedRecordTypes.length; i++) {
            if (perm.allowedRecordTypes[i] == _recordType) return true;
        }
        return false;
    }

    function getPermission(address _patient, address _provider) external view returns (AccessPermission memory) {
        require(
            msg.sender == _patient || msg.sender == _provider ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "AC: no access"
        );
        return _permissions[_patient][_provider];
    }

    function getPatientProviders(address _patient) external view returns (address[] memory) {
        require(
            msg.sender == _patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "AC: no access"
        );
        return _patientProviders[_patient];
    }

    function getProviderPatients(address _provider) external view returns (address[] memory) {
        require(
            msg.sender == _provider ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "AC: no access"
        );
        return _providerPatients[_provider];
    }

    function getPatientRequests(address _patient) external view returns (uint256[] memory) {
        require(
            msg.sender == _patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "AC: no access"
        );
        return _patientRequests[_patient];
    }

    function getDoctorRequests(address _doctor) external view returns (uint256[] memory) {
        require(
            msg.sender == _doctor ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "AC: no access"
        );
        return _doctorRequests[_doctor];
    }

    function getAccessRequest(uint256 _requestId) external view returns (AccessRequest memory) {
        return _requests[_requestId];
    }
}
