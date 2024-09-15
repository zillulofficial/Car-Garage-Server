const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app= express()
const port= process.env.PORT || 5000

// middleware
app.use(cors({
  origin: [,
    'https://car-garage-cfd09.web.app',
    'https://car-garage-cfd09.firebaseapp.com'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.awpu5n8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// custom middlewares
const verifyToken= async(req, res, next)=>{
  const token = req.cookies?.token
  console.log("value inside token: ",token);
  if(!token){
    return res.status(401).send({message: 'Unauthorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({message: 'Unauthorized'})
    }
    console.log("Value in the token: ", decoded);
    req.user= decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection= client.db('carGarage').collection('services')
    const bookingCollection= client.db('carGarage').collection('bookings')

    // auth related API
    app.post('/jwt', async(req,res)=>{
      const user= req.body
      const token =jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '3h'})
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true})
    })
    app.post('/logout', async(req, res)=>{
      const user= req.body
      console.log('logged out user: ', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

    // service related API
    app.get('/services', async(req, res)=>{
      const cursor= serviceCollection.find()
      const result= await cursor.toArray()
      res.send(result)
    })

    app.get('/services/:id', async(req, res)=>{
      const id= req.params.id
      const query= {_id: new ObjectId(id)} 
      const result= await serviceCollection.findOne(query)
      res.send(result)
    })


    // booking part
    app.post('/bookings', async(req, res)=>{
      const booking= req.body
      const result= await bookingCollection.insertOne(booking)
      res.send(result)
    })
    app.get('/bookings',verifyToken, async(req, res)=>{
      console.log(req.query.email);
      // console.log(req.cookies.token);
      console.log('user inside valid token: ',req.user );
      if(req.query.email!== req.user.email){
        return res.status(403).send({message: "Forbidden Access"})
      }
      let query= {}
      if(req.query?.email){
        query= {email: req.query.email}
      }
      const cursor= bookingCollection.find(query)
      const result= await cursor.toArray()
      res.send(result)
    })
    app.patch('/bookings/:id', async(req, res)=>{
      const id= req.params.id
      const filter= {_id: new ObjectId(id)} 
      const updatedBooking = req.body
      console.log(updatedBooking);
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result= await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.delete('/bookings/:id', async(req, res)=>{
      const id = req.params.id
      const query= {_id: new ObjectId(id)}
      const result= await bookingCollection.deleteOne(query)
      res.send(result)
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


app.get('/', (req,res)=>{
    res.send("Garage Server is Running")
})
app.listen(port,()=>{
console.log(`Car Garage server is running at port: ${port}`)
})