import express from 'express'
import { config } from '../config.js'
import { SqsService } from '../service/sqs.service.js'
import * as dotenv from 'dotenv';

dotenv.config()

const app = express()
const port = config.producerPort

app.use(express.json())

app.post('/transfer', async(req, res) => {
    const { 
        fromAccount,
        toAccount,
        amount
    } = req.body;

    try {
        const sqsService = new SqsService(process.env.AWS_MAIN_QUEUE_URL)
        await sqsService.sendMessage({
            body: JSON.stringify({
                fromAccount,
                toAccount,
                amount
            })
        })
    
        res.status(200).json({ message: 'Sua transação será processada' })
    } catch(err) {
        console.log(err)
        res.status(500).json({ message: 'Erro interno' })
    }
})

app.listen(port, () => {
    console.log(`Producer app listening at http://localhost:${port}`)
})