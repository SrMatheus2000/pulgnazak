const fileUpload = require('express-fileupload');
const { X509Certificate } = require('crypto');
const { pki, util } = require('node-forge')
const express = require('express');
const axios = require('axios')
const path = require('path')
const moment = require('moment')
const asn1 = require('asn1js');
const pkijs = require('pkijs');
const pvutils = require('pvutils');
const cors = require('cors')

/**
 * Converte o binario para um certificado
 * 
 * @param {Buffer} file 
 * @returns 
 */
const certFromFile = file => pki.certificateFromPem(new X509Certificate(file))

/**
 * Pega o link do emissor do certificado
 * 
 * @param {pki.Certificate} cert
 * @returns {String}
 */
const getParentLink = (cert) => {
  try {
    return cert
      .getExtension('authorityInfoAccess').value
      .match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*).crt/g)[0]
  } catch (error) {
    return ''
  }
}

/**
 * Constroi a cadeia de certificacao
 * 
 * @param {pki.Certificate} cert 
 * @returns 
 */
const createChain = async (cert) => {
  const result = [cert]

  let link = getParentLink(cert)

  while (link) {
    const res = await axios({ url: link, method: 'GET', responseType: 'arraybuffer' })
    const buff = Buffer.from(await res.data)
    const newCert = certFromFile(buff)
    result.push(newCert)
    link = getParentLink(newCert)
  }

  return result
}

function asciiToHex(str = "") {
  const a = str.replace("0\x16\x80\x14", "")
  var arr1 = [];
  for (var n = 0, l = a.length; n < l; n++) {
    var hex = Number(a.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join('')//.slice(-40);
}

/**
 * Verifica se o certificado foi revogado em alguma das crls da cadeia
 * 
 * @param {pki.Certificate[]} chain 
 * @param {pki.Certificate} cert 
 * @returns 
 */
const checkCRL = async (chain, cert) => {
  const crls = []

  chain.forEach(item => {
    const urlFound = item
      .getExtension("cRLDistributionPoints")?.value
      ?.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*).crl/g)[0]
    if (urlFound) crls.push(urlFound)
  })

  for (const crlUrl of crls) {
    const res = await axios({ url: crlUrl, method: 'GET', responseType: 'arraybuffer' })
    const buffer = new Uint8Array(res.data).buffer

    const asn1crl = asn1.fromBER(buffer);
    const crl = new pkijs.CertificateRevocationList({
      schema: asn1crl.result
    })

    if (crl.revokedCertificates?.find(({ userCertificate }) =>
      cert.serialNumber.toUpperCase() === pvutils.bufferToHexCodes(userCertificate.valueBlock.valueHex).toUpperCase()
    )) return true
  }

  return false
}



/**
 * Local onde ficam armazenados os certificados
 */
const caStore = new Set();

/**
 * Instancia do servidor
 */
const app = express();
app.use(cors())
/**
 * Ter acesso aos arquivos do front
 */
app.use(express.static(path.join(__dirname, 'front', 'build')));

/**
 * Endpoint para retornar o front-end
 */
app.get('/*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'front', 'build', 'index.html'));
});

/**
 * Middleware de leitura de arquivos em transacoes http
 */
app.use(fileUpload());

/**
 * Endpoint para enviar um certificado confiavel
 */
app.post('/send-trusty', async (req, res) => {

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(500).send('Tem que ter algo');
  }

  const chain = await createChain(certFromFile(req.files.cert.data))


  chain.forEach(cert => {
    caStore.add(cert.getExtension("subjectKeyIdentifier")?.subjectKeyIdentifier?.replaceAll('0', ''));
    const auth = util.bytesToHex(cert.getExtension("authorityKeyIdentifier")?.value).substring(8).replaceAll('0', '');
    if (auth) caStore.add(auth);
  })

  // chain.forEach(cert => caStore.addCertificate(cert))

  res.send("Certificado adicionado aos confiaveis")
})

/**
 * Endpoint para verificar se um certificado é confiavel
 */
app.post('/verify', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(500).send('Tem que ter algo');
  }

  const cert = certFromFile(req.files.cert.data)
  try {
    const now = moment()
    const { notBefore, notAfter } = cert.validity
    if (now.isBefore(notBefore)) return res.status(500).send("Certificado ainda não está valendo")
    if (now.isAfter(notAfter)) return res.status(500).send("Certificado expirado")

    const chain = await createChain(cert)

    const revoked = await checkCRL(chain, cert)
    if (revoked) return res.status(500).send("Certificado Revogado")

    const ret = [...chain.reduce((add, curr) => {
      add.add(curr.getExtension("subjectKeyIdentifier")?.subjectKeyIdentifier?.replaceAll('0', ''));

      const auth = util.bytesToHex(curr.getExtension("authorityKeyIdentifier")?.value).substring(8).replaceAll('0', '')
      if (auth) add.add(auth);

      return add
    }, new Set())].some(item => [...caStore].includes(item))

    return res.status(ret ? 200 : 500).send(ret ? "Certificado Confiável" : "Certificado não confiável")
  } catch (error) {
    res.status(500).send(error?.message || error)
  }
})

/**
 * Endpoint para limpar os certificados confiaveis
 */
app.delete('/clear', async (_, res) => {

  caStore.clear()

  res.send("Memoria limpa")
})

/**
 * retornar erro 404
 */
app.use((req, res) => {
  res.status(404).send({ url: req.originalUrl + ' not found' });
});

/**
 * Ligar o server
 */
app.listen(process.env.PORT || 80, () => console.log(`Running ( port: ${process.env.PORT || '80'} )`));