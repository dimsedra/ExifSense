/**
 * ExifSense Forensic Cryptography & Key Management Module
 * Uses Web Crypto API for client-side signing and verification (non-repudiation)
 */

/**
 * Generates a new P-256 ECDSA key pair.
 * @returns {Promise<CryptoKeyPair>} The generated key pair.
 */
export async function generateInvestigatorKeyPair() {
    return await crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256"
        },
        true, // extractable
        ["sign", "verify"]
    );
}

/**
 * Exports a key pair to JWK format.
 * @param {CryptoKeyPair} keyPair 
 * @returns {Promise<object>} Object with { privateJwk, publicJwk }
 */
export async function exportKeysJwk(keyPair) {
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    return { privateJwk, publicJwk };
}

/**
 * Imports keys from JWK formats.
 * @param {object} privateJwk 
 * @param {object} publicJwk 
 * @returns {Promise<object>} Object with { privateKey, publicKey }
 */
export async function importKeysJwk(privateJwk, publicJwk) {
    const importParams = {
        name: "ECDSA",
        namedCurve: "P-256"
    };

    let privateKey = null;
    if (privateJwk) {
        privateKey = await crypto.subtle.importKey(
            "jwk",
            privateJwk,
            importParams,
            true,
            ["sign"]
        );
    }

    const publicKey = await crypto.subtle.importKey(
        "jwk",
        publicJwk,
        importParams,
        true,
        ["verify"]
    );

    return { privateKey, publicKey };
}

/**
 * Calculates a unique, stable Investigator ID from the public key coordinates.
 * @param {object} publicJwk 
 * @returns {Promise<string>} Investigator stamp ID (e.g. ES-A3B4D5E6)
 */
export async function calculateInvestigatorId(publicJwk) {
    try {
        const payloadString = JSON.stringify({ x: publicJwk.x, y: publicJwk.y, crv: publicJwk.crv });
        const encoder = new TextEncoder();
        const data = encoder.encode(payloadString);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        return `ES-${hashHex.substring(0, 10)}`;
    } catch (e) {
        console.error("Error calculating Investigator ID:", e);
        return `ES-UNKNOWN`;
    }
}

/**
 * Signs a text/object payload using the private key.
 * @param {CryptoKey} privateKey 
 * @param {object|string} payload 
 * @returns {Promise<string>} Hex representation of the signature.
 */
export async function signPayload(privateKey, payload) {
    const encoder = new TextEncoder();
    const dataString = typeof payload === "string" ? payload : JSON.stringify(payload);
    const data = encoder.encode(dataString);

    const signature = await crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: { name: "SHA-256" }
        },
        privateKey,
        data
    );

    // Convert signature array buffer to hex string
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

/**
 * Verifies a signature against a payload using a public key.
 * @param {CryptoKey|object} publicKey CryptoKey or JWK object of public key.
 * @param {string} signatureHex The signature to verify.
 * @param {object|string} payload The original signed payload.
 * @returns {Promise<boolean>} True if signature matches.
 */
export async function verifyPayload(publicKey, signatureHex, payload) {
    try {
        let key = publicKey;
        
        // Import if it's JWK
        if (!(publicKey instanceof CryptoKey)) {
            const imported = await importKeysJwk(null, publicKey);
            key = imported.publicKey;
        }

        const encoder = new TextEncoder();
        const dataString = typeof payload === "string" ? payload : JSON.stringify(payload);
        const data = encoder.encode(dataString);

        // Convert hex back to array buffer
        const signatureBytes = signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        const signatureBuffer = new Uint8Array(signatureBytes).buffer;

        return await crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" }
            },
            key,
            signatureBuffer,
            data
        );
    } catch (e) {
        console.error("Verification error:", e);
        return false;
    }
}

/**
 * Initializes or loads the persistent Investigator key pair.
 * @returns {Promise<object>} Current active identity details.
 */
export async function initInvestigatorIdentity() {
    const PRIV_KEY_KEY = "exifsense_inv_priv_jwk";
    const PUB_KEY_KEY = "exifsense_inv_pub_jwk";

    try {
        const storedPriv = localStorage.getItem(PRIV_KEY_KEY);
        const storedPub = localStorage.getItem(PUB_KEY_KEY);

        if (storedPriv && storedPub) {
            const privateJwk = JSON.parse(storedPriv);
            const publicJwk = JSON.parse(storedPub);
            const { privateKey, publicKey } = await importKeysJwk(privateJwk, publicJwk);
            const stampId = await calculateInvestigatorId(publicJwk);

            return { privateKey, publicKey, jwkPrivate: privateJwk, jwkPublic: publicJwk, stampId };
        }
    } catch (e) {
        console.warn("Could not import stored key pair, generating new one:", e);
    }

    // Generate new key pair
    const keyPair = await generateInvestigatorKeyPair();
    const { privateJwk, publicJwk } = await exportKeysJwk(keyPair);

    localStorage.setItem(PRIV_KEY_KEY, JSON.stringify(privateJwk));
    localStorage.setItem(PUB_KEY_KEY, JSON.stringify(publicJwk));

    const stampId = await calculateInvestigatorId(publicJwk);
    return { privateKey: keyPair.privateKey, publicKey: keyPair.publicKey, jwkPrivate: privateJwk, jwkPublic: publicJwk, stampId };
}

/**
 * Overwrites the current active keys with restored key data.
 * @param {object} privateJwk 
 * @param {object} publicJwk 
 * @returns {Promise<object>} The new identity details.
 */
export async function restoreIdentity(privateJwk, publicJwk) {
    const PRIV_KEY_KEY = "exifsense_inv_priv_jwk";
    const PUB_KEY_KEY = "exifsense_inv_pub_jwk";

    const { privateKey, publicKey } = await importKeysJwk(privateJwk, publicJwk);
    localStorage.setItem(PRIV_KEY_KEY, JSON.stringify(privateJwk));
    localStorage.setItem(PUB_KEY_KEY, JSON.stringify(publicJwk));
    
    const stampId = await calculateInvestigatorId(publicJwk);
    return { privateKey, publicKey, jwkPrivate: privateJwk, jwkPublic: publicJwk, stampId };
}
