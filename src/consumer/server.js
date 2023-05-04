import express from 'express'
import { config } from '../config.js'

const app = express()
export const port = config.consumerPort

app.use(express.json())

app.post('/process-transfer', (req, res) => {
    const { 
        fromAccount,
        toAccount,
        amount
    } = req.body;


    res.status(200).json({ message: `Transação da conta ${fromAccount} para conta ${toAccount} na quantia de ${amount} realizada com sucesso` })
})

app.listen(port, () => {
    console.log(`Consumer app listening at http://localhost:${port}`)
})