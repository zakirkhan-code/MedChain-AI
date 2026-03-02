const axios = require("axios");
const crypto = require("crypto");

const PINATA_BASE = "https://api.pinata.cloud";

const pinataHeaders = () => ({
  pinata_api_key: process.env.PINATA_API_KEY,
  pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
});

const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "hex"), iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv: iv.toString("hex") };
};

const decryptData = (encryptedData, key, iv) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
};

const generateEncryptionKey = () => crypto.randomBytes(32).toString("hex");

const uploadToIPFS = async (data, metadata = {}) => {
  try {
    const response = await axios.post(`${PINATA_BASE}/pinning/pinJSONToIPFS`, {
      pinataContent: data,
      pinataMetadata: { name: metadata.name || "medchain-data", keyvalues: metadata },
    }, { headers: pinataHeaders() });

    return {
      ipfsHash: response.data.IpfsHash,
      ipfsURI: `ipfs://${response.data.IpfsHash}`,
      gatewayURL: `${process.env.PINATA_GATEWAY}${response.data.IpfsHash}`,
      size: response.data.PinSize,
    };
  } catch (error) {
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

const uploadFileToIPFS = async (fileBuffer, fileName) => {
  try {
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", fileBuffer, { filename: fileName });
    formData.append("pinataMetadata", JSON.stringify({ name: fileName }));

    const response = await axios.post(`${PINATA_BASE}/pinning/pinFileToIPFS`, formData, {
      headers: { ...pinataHeaders(), ...formData.getHeaders() },
      maxContentLength: Infinity,
    });

    return {
      ipfsHash: response.data.IpfsHash,
      ipfsURI: `ipfs://${response.data.IpfsHash}`,
      gatewayURL: `${process.env.PINATA_GATEWAY}${response.data.IpfsHash}`,
    };
  } catch (error) {
    throw new Error(`IPFS file upload failed: ${error.message}`);
  }
};

const fetchFromIPFS = async (ipfsHash) => {
  try {
    const response = await axios.get(`${process.env.PINATA_GATEWAY}${ipfsHash}`);
    return response.data;
  } catch (error) {
    throw new Error(`IPFS fetch failed: ${error.message}`);
  }
};

const uploadEncryptedRecord = async (recordData, metadata) => {
  const encKey = generateEncryptionKey();
  const { encrypted, iv } = encryptData(recordData, encKey);
  const ipfsResult = await uploadToIPFS({ encrypted, iv }, metadata);
  return { ...ipfsResult, encryptionKey: encKey, encryptionKeyHash: crypto.createHash("sha256").update(encKey).digest("hex") };
};

module.exports = {
  encryptData, decryptData, generateEncryptionKey,
  uploadToIPFS, uploadFileToIPFS, fetchFromIPFS, uploadEncryptedRecord,
};
