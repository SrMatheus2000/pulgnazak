import { Alert, Box, Button, Container, CssBaseline, IconButton, Paper, Snackbar, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { MdDelete, MdSend } from 'react-icons/md';
import FilePreparer from './FilePreparer'
import axios from "axios"

function App() {

  const [severity, setSeverity] = useState("success")
  const [message, setMessage] = useState("")

  const handleClose = () => setMessage("")

  const [confiaveis, setConfiaveis] = useState([])

  const enviarConfiaveis = async () => {
    const reqs = confiaveis.map(cert => {
      const data = new FormData()
      data.append("cert", cert)
      return axios.post("https://pure-chamber-38883.herokuapp.com/send-trusty", data)
    })
    try {
      const res = await Promise.all(reqs)
      if (res.some(({ status }) => status !== 200)) {
        setSeverity("error")
        setMessage("Erro ao enviar certificados confiaveis");
        return
      }
      setSeverity("success")
      setMessage("Certificados cadastrados")
    } catch (error) {
      setSeverity("error")
      setMessage(error.response?.data?.message || error.response?.data || error.message || error)
    }
  }

  const [testando, setTestando] = useState()

  const checarConfiavel = async () => {
    try {
      const data = new FormData()
      data.append("cert", testando)

      const res = await axios.post("https://pure-chamber-38883.herokuapp.com/verify", data)
      setSeverity("success")
      setMessage(res.data.message || res.data)
    } catch (error) {
      setSeverity("error")
      setMessage(error.response?.data?.message || error.response?.data || error.message || error)
    }
  }

  const limparMemoria = async () => {
    try {
      const res = await axios.delete("https://pure-chamber-38883.herokuapp.com/clear")
      setSeverity("success")
      setMessage(res.data.message || res.data)
    } catch (error) {
      setSeverity("error")
      setMessage(error.response?.data?.message || error.response?.data || error.message || error)
    }
  }

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />

      <Snackbar open={!!message} onClose={handleClose}>
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant='h6' sx={{ mb: 2 }}>Cadastrar Certificados Confiáveis</Typography>
        <Box sx={{ width: '100%', display: 'flex', gap: 2, justifyContent: "center", alignItems: 'center', maxWidth: "100%" }}>
          <FilePreparer label="Certificados confiaveis" fullWidth multiple concat onChange={setConfiaveis} />
          <Tooltip arrow title='Enviar'>
            <IconButton onClick={enviarConfiaveis} sx={{ width: 50, height: 50 }}>
              <MdSend />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant='h6' sx={{ mb: 2 }}>Verificar se Certificado é confiável</Typography>
        <Box sx={{ width: '100%', display: 'flex', gap: 2, justifyContent: "center", alignItems: 'center', maxWidth: "100%" }}>
          <FilePreparer label="Certificados confiaveis" fullWidth onChange={setTestando} />
          <Tooltip arrow title='Enviar'>
            <IconButton onClick={checarConfiavel} sx={{ width: 50, height: 50 }}>
              <MdSend />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>


      <Paper
        elevation={3}
        sx={{
          p: 2,
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant='h6' sx={{ mb: 2 }}>Limpar Certificados Confiáveis</Typography>
        <Box sx={{ width: '100%', display: 'flex', gap: 2, justifyContent: "center", alignItems: 'center', maxWidth: "100%" }}>
          <Tooltip arrow title='Limpar'>
            <Button onClick={limparMemoria} variant='contained' endIcon={<MdDelete />}>
              Limpar
            </Button>
          </Tooltip>
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
