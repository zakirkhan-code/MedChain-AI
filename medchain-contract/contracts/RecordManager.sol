// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMedChainCore3 {
    function checkRole(bytes32 role, address account) external view returns (bool);
    function PATIENT_ROLE() external view returns (bytes32);
    function ADMIN_ROLE() external view returns (bytes32);
    function DOCTOR_ROLE() external view returns (bytes32);
    function paused() external view returns (bool);
    function incrementRecordCount() external;
    function getContract(string calldata name) external view returns (address);
}

interface IPatientRegistry {
    function isActivePatient(address patient) external view returns (bool);
    function incrementRecordCount(address patient) external;
}

interface IAccessControl {
    function checkAccess(address patient, address provider) external view returns (bool hasAccess, uint8 level);
}

contract RecordManager is ReentrancyGuard {
    IMedChainCore3 public medChainCore;

    enum RecordType { LabReport, Prescription, Imaging, Diagnosis, Vaccination, Surgery, Discharge, Other }
    enum RecordStatus { Active, Amended, Archived }

    struct MedicalRecord {
        uint256 recordId;
        address patient;
        address uploadedBy;
        bytes32 contentHash;
        string ipfsURI;
        string encryptionKeyHash;
        RecordType recordType;
        RecordStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        string description;
        uint256 version;
    }

    struct Amendment {
        bytes32 oldHash;
        bytes32 newHash;
        string reason;
        address amendedBy;
        uint256 amendedAt;
        uint256 version;
    }

    mapping(uint256 => MedicalRecord) private _records;
    mapping(address => uint256[]) private _patientRecords;
    mapping(bytes32 => uint256) private _hashToRecord;
    mapping(address => mapping(RecordType => uint256[])) private _recordsByType;
    mapping(uint256 => Amendment[]) private _amendments;

    uint256 public nextRecordId;
    uint256 public totalRecords;

    event RecordCreated(uint256 indexed recordId, address indexed patient, address indexed uploadedBy, RecordType recordType, bytes32 contentHash, uint256 timestamp);
    event RecordAmended(uint256 indexed recordId, bytes32 oldHash, bytes32 newHash, address indexed amendedBy, uint256 version, uint256 timestamp);
    event RecordArchived(uint256 indexed recordId, address indexed archivedBy, uint256 timestamp);
    event RecordVerified(uint256 indexed recordId, address indexed verifier, bool isValid);

    modifier notPaused() {
        require(!medChainCore.paused(), "RM: paused");
        _;
    }

    modifier canAccessRecord(uint256 _recordId) {
        MedicalRecord storage r = _records[_recordId];
        require(r.createdAt != 0, "RM: not found");
        bool allowed = (
            msg.sender == r.patient ||
            msg.sender == r.uploadedBy ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender)
        );
        if (!allowed && medChainCore.checkRole(medChainCore.DOCTOR_ROLE(), msg.sender)) {
            address acAddr = medChainCore.getContract("AccessControl");
            if (acAddr != address(0)) {
                (bool hasAccess,) = IAccessControl(acAddr).checkAccess(r.patient, msg.sender);
                allowed = hasAccess;
            }
        }
        require(allowed, "RM: no access");
        _;
    }

    modifier canAccessPatientRecords(address _patient) {
        bool allowed = (
            msg.sender == _patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender)
        );
        if (!allowed && medChainCore.checkRole(medChainCore.DOCTOR_ROLE(), msg.sender)) {
            address acAddr = medChainCore.getContract("AccessControl");
            if (acAddr != address(0)) {
                (bool hasAccess,) = IAccessControl(acAddr).checkAccess(_patient, msg.sender);
                allowed = hasAccess;
            }
        }
        require(allowed, "RM: no access");
        _;
    }

    constructor(address _core) {
        require(_core != address(0), "RM: zero addr");
        medChainCore = IMedChainCore3(_core);
        nextRecordId = 1;
    }

    function _isAuthorizedToCreate(address _patient) internal view returns (bool) {
        if (msg.sender == _patient) return true;
        if (medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender)) return true;
        if (medChainCore.checkRole(medChainCore.DOCTOR_ROLE(), msg.sender)) {
            address acAddr = medChainCore.getContract("AccessControl");
            if (acAddr != address(0)) {
                (bool hasAccess, uint8 level) = IAccessControl(acAddr).checkAccess(_patient, msg.sender);
                if (hasAccess && level >= 2) return true;
            }
        }
        return false;
    }

    function _checkPatientActive(address _patient) internal view {
        address prAddr = medChainCore.getContract("PatientRegistry");
        if (prAddr != address(0)) {
            require(IPatientRegistry(prAddr).isActivePatient(_patient), "RM: patient not active");
        }
    }

    function _notifyRecordCreated(address _patient) internal {
        try medChainCore.incrementRecordCount() {} catch {}
        address prAddr = medChainCore.getContract("PatientRegistry");
        if (prAddr != address(0)) {
            try IPatientRegistry(prAddr).incrementRecordCount(_patient) {} catch {}
        }
    }

    function createRecord(
        address _patient,
        bytes32 _contentHash,
        string calldata _ipfsURI,
        string calldata _encryptionKeyHash,
        RecordType _recordType,
        string calldata _description
    ) external notPaused nonReentrant returns (uint256) {
        require(_isAuthorizedToCreate(_patient), "RM: not authorized");
        _checkPatientActive(_patient);

        require(_contentHash != bytes32(0), "RM: empty hash");
        require(bytes(_ipfsURI).length > 0, "RM: empty URI");
        require(bytes(_description).length > 0, "RM: empty desc");
        require(uint8(_recordType) <= uint8(RecordType.Other), "RM: invalid type");
        require(_hashToRecord[_contentHash] == 0, "RM: duplicate");

        uint256 recordId = nextRecordId++;

        MedicalRecord storage r = _records[recordId];
        r.recordId = recordId;
        r.patient = _patient;
        r.uploadedBy = msg.sender;
        r.contentHash = _contentHash;
        r.ipfsURI = _ipfsURI;
        r.encryptionKeyHash = _encryptionKeyHash;
        r.recordType = _recordType;
        r.status = RecordStatus.Active;
        r.createdAt = block.timestamp;
        r.updatedAt = block.timestamp;
        r.description = _description;
        r.version = 1;

        _patientRecords[_patient].push(recordId);
        _hashToRecord[_contentHash] = recordId;
        _recordsByType[_patient][_recordType].push(recordId);
        totalRecords++;

        _notifyRecordCreated(_patient);

        emit RecordCreated(recordId, _patient, msg.sender, _recordType, _contentHash, block.timestamp);
        return recordId;
    }

    function amendRecord(
        uint256 _recordId,
        bytes32 _newHash,
        string calldata _newIpfsURI,
        string calldata _reason
    ) external notPaused nonReentrant canAccessRecord(_recordId) {
        MedicalRecord storage record = _records[_recordId];
        require(record.status == RecordStatus.Active || record.status == RecordStatus.Amended, "RM: not amendable");
        require(
            msg.sender == record.patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "RM: only patient/admin"
        );
        require(_newHash != bytes32(0), "RM: empty hash");
        require(bytes(_reason).length > 0, "RM: empty reason");
        require(_hashToRecord[_newHash] == 0, "RM: hash exists");

        bytes32 oldHash = record.contentHash;

        _amendments[_recordId].push(Amendment({
            oldHash: oldHash,
            newHash: _newHash,
            reason: _reason,
            amendedBy: msg.sender,
            amendedAt: block.timestamp,
            version: record.version
        }));

        delete _hashToRecord[oldHash];
        _hashToRecord[_newHash] = _recordId;

        record.contentHash = _newHash;
        record.ipfsURI = _newIpfsURI;
        record.status = RecordStatus.Amended;
        record.updatedAt = block.timestamp;
        record.version++;

        emit RecordAmended(_recordId, oldHash, _newHash, msg.sender, record.version, block.timestamp);
    }

    function archiveRecord(uint256 _recordId) external notPaused nonReentrant {
        MedicalRecord storage record = _records[_recordId];
        require(record.createdAt != 0, "RM: not found");
        require(
            msg.sender == record.patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "RM: only patient/admin"
        );
        require(record.status != RecordStatus.Archived, "RM: already archived");

        record.status = RecordStatus.Archived;
        record.updatedAt = block.timestamp;

        emit RecordArchived(_recordId, msg.sender, block.timestamp);
    }

    function verifyRecord(uint256 _recordId, bytes32 _contentHash) external returns (bool isValid) {
        require(_records[_recordId].createdAt != 0, "RM: not found");
        isValid = _records[_recordId].contentHash == _contentHash;
        emit RecordVerified(_recordId, msg.sender, isValid);
        return isValid;
    }

    function getRecordHash(uint256 _recordId) external view returns (bytes32) {
        require(_records[_recordId].createdAt != 0, "RM: not found");
        return _records[_recordId].contentHash;
    }

    function getRecord(uint256 _recordId) external view canAccessRecord(_recordId) returns (MedicalRecord memory) {
        return _records[_recordId];
    }

    function getPatientRecordIds(address _patient) external view canAccessPatientRecords(_patient) returns (uint256[] memory) {
        return _patientRecords[_patient];
    }

    function getRecordsByType(address _patient, RecordType _type) external view canAccessPatientRecords(_patient) returns (uint256[] memory) {
        return _recordsByType[_patient][_type];
    }

    function getAmendments(uint256 _recordId) external view canAccessRecord(_recordId) returns (Amendment[] memory) {
        return _amendments[_recordId];
    }

    function getPatientRecordCount(address _patient) external view returns (uint256) {
        return _patientRecords[_patient].length;
    }

    function getRecordsBatch(uint256[] calldata _recordIds) external view returns (MedicalRecord[] memory) {
        MedicalRecord[] memory result = new MedicalRecord[](_recordIds.length);
        for (uint256 i = 0; i < _recordIds.length; i++) {
            result[i] = _records[_recordIds[i]];
        }
        return result;
    }
}
