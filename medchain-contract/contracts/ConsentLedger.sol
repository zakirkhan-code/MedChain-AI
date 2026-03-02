// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMedChainCore5 {
    function checkRole(bytes32 role, address account) external view returns (bool);
    function ADMIN_ROLE() external view returns (bytes32);
    function DOCTOR_ROLE() external view returns (bytes32);
    function OPERATOR_ROLE() external view returns (bytes32);
    function PATIENT_ROLE() external view returns (bytes32);
    function paused() external view returns (bool);
    function getContract(string calldata name) external view returns (address);
}

contract ConsentLedger is ReentrancyGuard {
    IMedChainCore5 public medChainCore;

    enum ConsentAction { Granted, Revoked, Expired, Emergency, Requested, Approved, Rejected }

    struct ConsentEntry {
        uint256 entryId;
        address patient;
        address actor;
        ConsentAction action;
        uint256 recordId;
        string details;
        bytes32 dataHash;
        uint256 timestamp;
        uint256 blockNumber;
    }

    mapping(uint256 => ConsentEntry) private _entries;
    mapping(address => uint256[]) private _patientEntries;
    mapping(address => uint256[]) private _actorEntries;
    mapping(address => mapping(ConsentAction => uint256[])) private _entriesByAction;
    mapping(address => mapping(address => uint256[])) private _pairEntries;

    uint256 public nextEntryId;
    uint256 public totalEntries;

    event ConsentLogged(uint256 indexed entryId, address indexed patient, address indexed actor, ConsentAction action, uint256 recordId, uint256 timestamp);
    event LoggerAuthorized(address indexed logger, uint256 timestamp);

    modifier onlyAdmin() {
        require(medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender), "CL: not admin");
        _;
    }

    modifier onlyAuthorized() {
        bool allowed = medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender);
        if (!allowed) {
            allowed = (medChainCore.getContract("AccessControl") == msg.sender);
        }
        require(allowed, "CL: unauthorized");
        _;
    }

    modifier notPaused() {
        require(!medChainCore.paused(), "CL: paused");
        _;
    }

    modifier canViewPatient(address _patient) {
        require(
            msg.sender == _patient ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.DOCTOR_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.OPERATOR_ROLE(), msg.sender),
            "CL: no access"
        );
        _;
    }

    modifier canViewPair(address _patient, address _provider) {
        require(
            msg.sender == _patient ||
            msg.sender == _provider ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "CL: no access"
        );
        _;
    }

    constructor(address _core) {
        require(_core != address(0), "CL: zero addr");
        medChainCore = IMedChainCore5(_core);
        nextEntryId = 1;
    }

    function _createEntry(
        address _patient,
        address _actor,
        ConsentAction _action,
        uint256 _recordId,
        string memory _details,
        bytes32 _dataHash
    ) internal returns (uint256) {
        uint256 entryId = nextEntryId++;

        _entries[entryId] = ConsentEntry({
            entryId: entryId,
            patient: _patient,
            actor: _actor,
            action: _action,
            recordId: _recordId,
            details: _details,
            dataHash: _dataHash,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _patientEntries[_patient].push(entryId);
        _actorEntries[_actor].push(entryId);
        _entriesByAction[_patient][_action].push(entryId);
        _pairEntries[_patient][_actor].push(entryId);
        totalEntries++;

        emit ConsentLogged(entryId, _patient, _actor, _action, _recordId, block.timestamp);
        return entryId;
    }

    function logConsent(
        address _patient,
        address _actor,
        uint8 _action,
        uint256 _recordId,
        string calldata _details,
        bytes32 _dataHash
    ) external onlyAuthorized notPaused nonReentrant returns (uint256) {
        require(_action <= uint8(ConsentAction.Rejected), "CL: invalid action");
        return _createEntry(_patient, _actor, ConsentAction(_action), _recordId, _details, _dataHash);
    }

    function adminLogConsent(
        address _patient,
        address _actor,
        ConsentAction _action,
        string calldata _details
    ) external onlyAdmin notPaused nonReentrant returns (uint256) {
        return _createEntry(_patient, _actor, _action, 0, _details, bytes32(0));
    }

    function getConsent(uint256 _entryId) external view returns (ConsentEntry memory) {
        require(_entries[_entryId].timestamp != 0, "CL: not found");
        ConsentEntry storage entry = _entries[_entryId];
        require(
            msg.sender == entry.patient ||
            msg.sender == entry.actor ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "CL: no access"
        );
        return entry;
    }

    function getPatientHistory(address _patient) external view canViewPatient(_patient) returns (uint256[] memory) {
        return _patientEntries[_patient];
    }

    function getPairHistory(address _patient, address _provider) external view canViewPair(_patient, _provider) returns (uint256[] memory) {
        return _pairEntries[_patient][_provider];
    }

    function getConsentsByAction(address _patient, ConsentAction _action) external view canViewPatient(_patient) returns (uint256[] memory) {
        return _entriesByAction[_patient][_action];
    }

    function getActorEntries(address _actor) external view returns (uint256[] memory) {
        require(
            msg.sender == _actor ||
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender),
            "CL: no access"
        );
        return _actorEntries[_actor];
    }

    function getRecentConsents(uint256 _count) external view returns (ConsentEntry[] memory) {
        require(
            medChainCore.checkRole(medChainCore.ADMIN_ROLE(), msg.sender) ||
            medChainCore.checkRole(medChainCore.OPERATOR_ROLE(), msg.sender),
            "CL: no access"
        );

        uint256 total = nextEntryId - 1;
        if (_count > total) _count = total;

        ConsentEntry[] memory result = new ConsentEntry[](_count);
        for (uint256 i = 0; i < _count; i++) {
            result[i] = _entries[total - i];
        }
        return result;
    }

    function getConsentHistory(
        address _patient,
        uint256 _offset,
        uint256 _limit
    ) external view canViewPatient(_patient) returns (ConsentEntry[] memory) {
        uint256[] storage ids = _patientEntries[_patient];
        if (_offset >= ids.length) return new ConsentEntry[](0);

        uint256 end = _offset + _limit;
        if (end > ids.length) end = ids.length;

        uint256 len = end - _offset;
        ConsentEntry[] memory result = new ConsentEntry[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = _entries[ids[_offset + i]];
        }
        return result;
    }

    function verifyConsent(
        address _patient,
        address _provider,
        uint256 _timestamp
    ) external view returns (bool hadConsent, uint256 consentId) {
        uint256[] storage pairIds = _pairEntries[_patient][_provider];
        for (uint256 i = pairIds.length; i > 0; i--) {
            ConsentEntry storage entry = _entries[pairIds[i - 1]];
            if (entry.timestamp <= _timestamp) {
                if (entry.action == ConsentAction.Granted ||
                    entry.action == ConsentAction.Approved ||
                    entry.action == ConsentAction.Emergency) {
                    return (true, entry.entryId);
                }
                if (entry.action == ConsentAction.Revoked || entry.action == ConsentAction.Expired) {
                    return (false, 0);
                }
            }
        }
        return (false, 0);
    }

    function getPatientEntryCount(address _patient) external view returns (uint256) {
        return _patientEntries[_patient].length;
    }
}
