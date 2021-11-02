import { Box, Button, Container, CssBaseline, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { MdDelete, MdSend } from 'react-icons/md';
import FilePreparer from './FilePreparer'
import axios from "axios"

function App() {

  const [confiaveis, setConfiaveis] = useState([])

  const enviarConfiaveis = async () => {
    const reqs = confiaveis.map(cert => {
      const data = new FormData()
      data.append("cert", cert)

      return axios.post("http://localhost/send-trusty", data)
    })
    try {
      const res = await Promise.all(reqs)

      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }

  const [testando, setTestando] = useState()

  const checarConfiavel = async () => {
    console.log(testando);
  }

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />
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
            <Button variant='contained' endIcon={<MdDelete />}>
              Limpar
            </Button>
          </Tooltip>
        </Box>
      </Paper>
    </Container >
  );
}

export default App;
