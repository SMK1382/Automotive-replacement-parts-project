import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

app.use(express.json())

app.get('/', (req, res) =>{
    res.json({'message' : 'server running'})
})


const Port = Number(process.env.PORT) || 4000

app.listen(Port, () =>{
    console.log(`Start server on port ${Port}`);
})