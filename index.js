
const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000
const cors = require('cors')
const { default: axios } = require('axios');
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5000/'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())
// app.use(express.urlencoded())

// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f8w8siu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    const userCollection = client.db('MangoMartDB').collection('users')
    // const mobileCollection = client.db('accountDB').collection('mobile')
    // const surveyorCollection = client.db('accountDB').collection('surveyor')
    // const reportCollection = client.db('accountDB').collection('report')
    // const FeedCollection = client.db('accountDB').collection('feedback')
    // const responseCollection = client.db('accountDB').collection('response')
    // const paymentCollection = client.db('accountDB').collection('payment')

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const cartItem = req.body;
      const result = await userCollection.insertOne(cartItem)
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('MangoMart is running');
})

app.listen(port, () => {
  console.log(`MangoMart is running on port ${port}`);
})

