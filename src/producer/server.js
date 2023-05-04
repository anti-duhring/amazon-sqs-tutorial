import express from 'express'
import { config } from '../config.js'

const app = express()
const port = config.producerPort

app.use(express.json())

app.post('/request-transfer', async(req, res) => {
    const { 
        fromAccount,
        toAccount,
        amount
    } = req.body;

    let responseTransaction = await fetch(`http://localhost:${config.consumerPort}/process-transfer`, {
        method: 'POST',
        body: JSON.stringify({ fromAccount, toAccount, amount }), 
        headers: { 'Content-Type': 'application/json' }
    })
    responseTransaction = await responseTransaction.json()

    res.status(200).json(responseTransaction)
})

app.listen(port, () => {
    console.log(`Producer app listening at http://localhost:${port}`)
})