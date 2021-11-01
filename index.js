const fileUpload = require('express-fileupload');
const { X509Certificate } = require('crypto');
const { pki } = require('node-forge')
const express = require('express');
const axios = require('axios')
const path = require('path')
const moment = require('moment')
const asn1 = require('asn1js');
const pkijs = require('pkijs');
const pvutils = require('pvutils');

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
 * Pega o certificado Root
 * 
 * @param {pki.Certificate} cert 
 * @returns 
 */
const getRootCertificate = async (cert) => {
  let result = cert

  let link = getParentLink(cert)

  while (link) {
    const res = await axios({ url: link, method: 'GET', responseType: 'arraybuffer' })
    const buff = Buffer.from(await res.data)
    const newCert = certFromFile(buff)
    result = newCert
    link = getParentLink(newCert)
  }

  return result
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
const caStore = pki.createCaStore();

/**
 * Instancia do servidor
 */
const app = express();

/**
 * Endpoint para retornar o front-end
 */
app.get('/*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
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
    return res.status(400).send('Tem que ter algo');
  }

  caStore.addCertificate(await getRootCertificate(certFromFile(req.files.cert.data)))

  res.send("Certificado adicionado aos confiaveis")
})

/**
 * Endpoint para verificar se um certificado é confiavel
 */
app.post('/verify', async (req, res) => {
  const cert = certFromFile(req.files.cert.data)
  try {
    const now = moment()
    const { notBefore, notAfter } = cert.validity
    if (now.isBefore(notBefore)) return res.send("Certificado ainda não está valendo")
    if (now.isAfter(notAfter)) return res.send("Certificado expirado")

    const chain = await createChain(cert)

    const revoked = await checkCRL(chain, cert)
    if (revoked) return res.send("Certificado Revogado")

    const ret = pki.verifyCertificateChain(caStore, chain);
    return res.send(ret ? "Certificado Confiável" : "Certificado não confiável")
  } catch (error) {
    res.send(error?.message || error)
  }
})

/**
 * Endpoint para limpar os certificados confiaveis
 */
app.delete('/clear', async (_, res) => {

  caStore.listAllCertificates().forEach(cert => {
    caStore.removeCertificate(cert)
  })

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
app.listen(8080, () => console.log(`Running ( port: 8080 )`));