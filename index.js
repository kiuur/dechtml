const vm = require("vm")
const CryptoJS = require("crypto-js")

async function dechtml(buffer) {
  const html = buffer.toString("utf8")

  if (/const chunks =/.test(html)) {
    const c = html.match(/const chunks = (\[[\s\S]*?\]);/)[1]
    const k = html.match(/const splitKey = (\[[\s\S]*?\]);/)[1]
    const v = html.match(/const splitIv = (\[[\s\S]*?\]);/)[1]

    const s = {}
    vm.createContext(s)
    vm.runInContext(`chunks=${c}`, s)
    vm.runInContext(`splitKey=${k}`, s)
    vm.runInContext(`splitIv=${v}`, s)

    const keyArr = s.splitKey[0].concat(s.splitKey[1]).map(Number)
    const ivArr = s.splitIv[0].concat(s.splitIv[1]).map(Number)
    const key = CryptoJS.lib.WordArray.create(new Uint8Array(keyArr))
    const iv = CryptoJS.lib.WordArray.create(new Uint8Array(ivArr))

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(s.chunks.join("")) },
      key,
      { iv }
    )

    const words = decrypted.words
    const sigBytes = decrypted.sigBytes
    const out = Buffer.alloc(sigBytes)
    for (let i = 0; i < sigBytes; i++) {
      out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
    }
    return out
  }

  if (/atob\(/.test(html)) {
    const base64 = html.match(/atob\(["'`]([^"'`]+)["'`]\)/)[1]
    const decoded = Buffer.from(base64, "base64")

    let text
    try {
      const bin = decoded.toString("binary")
      text = decodeURIComponent(unescape(bin))
    } catch {
      text = decoded.toString("utf8")
    }

    return Buffer.from(text, "utf8")
  }

  return Buffer.from(html, "utf8")
}

module.exports = dechtml
