const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const cors = require("cors");
const { default: axios } = require("axios");


app.use(
  cors({
    origin: ["http://localhost:5173", "https://mangomart.web.app","https://mangomart.firebaseapp.com"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded());

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f8w8siu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    const userCollection = client.db("MnagoMartDB").collection("accounts");
    const MangoCollection = client.db("MnagoMartDB").collection("mango");
    const paymentCollection = client.db("MnagoMartDB").collection("payment");

    const verifyToken = async (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ messsage: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1000h",
      });
      res.cookie("token", token, cookieOptions).send({ token });
      //  .send({success:true})
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    //  --------- users ----------
    app.get('/users',async(req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const cartItem = req.body;
      const result = await userCollection.insertOne(cartItem);
      res.send(result);
    });


    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    //  stripe payment gateway.......................... stripe payment

    app.post("/create-payment-intent", async (req, res) => {
      const user = req.body;
      const {totalprice} = user 

      try {
        const price = totalprice;
        const amount = parseInt(price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        res.status(500).send({
          error: "error from backend",
        });
      }
    });

    app.post('/Moneysave',async(req,res)=>{
      const user = req.body;
      const result = await paymentCollection.insertOne(user);
      const {quantity,id} = user
      const queries = {
        _id: new ObjectId(id)
      }
      const updates = {
         $inc:{
            quantity:  -parseInt(quantity)
         }
      }
      const save1 = await MangoCollection.updateOne(queries,updates)
      res.send(result)
    })

    app.get("/information/:email",async(req,res)=>{
      const email = req.params.email  
      const query = { email: email };
      const existingUser = await paymentCollection.find(query).toArray(); 
      res.send(existingUser)
   })

    //  mango collection.............................................

    app.get("/mangoInformation", async (req, res) => {
      const result = await MangoCollection.find().toArray();
      res.send(result);
    });

    // SSL Commerce.........................................................

    app.post('/sslComerece',async(req,res)=>{
      
      const user = req.body
      const {data} = user 
      const {email,name,Phone_number,date,quantity,amount,id} = data
      
      
      const tranId = new ObjectId().toString()
      const initiatedata = {
        store_id:"abcco66659d6617872",
        store_passwd:"abcco66659d6617872@ssl",
        total_amount:quantity,
        num_of_item:quantity,
        currency:"BDT",
        tran_id:id,
        success_url:"https://backend-two-theta-46.vercel.app/success-payment",
        fail_url:"https://backend-two-theta-46.vercel.app/failure-payment",
        cancel_url:"http://yoursite.com/cancel.php&",
        cus_name:name,
        cus_email:email,
        cus_add1:"Dhaka",
        cus_add2:"Dhaka",
        cus_city:"Dhaka",
        cus_state:"Dhaka",
        cus_postcode:"1000",
        cus_country:"Bangladesh",
        cus_phone:Phone_number,
        cus_fax:quantity,
        shipping_method:"NO",
        product_name:"Laptop",
        product_category:"Mango",
        product_profile:"general",
        multi_card_name:"mastercard,visacard,amexcard",
        value_a:"ref001_A",
        value_b:"ref002_B",
        value_c:"ref003_C",
        value_d:"ref004_D",
      }
        
    const response = await axios({
      method:"POST",
      url:"https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
      data:initiatedata,
      headers:{
        "Content-Type":"application/x-www-form-urlencoded",
      },
    })
    
    const saveData = {
       paymnetId:tranId,
       amount:amount,
       quantity:quantity,
       status:"pending",
       email:email
    }

    const save = await paymentCollection.insertOne(saveData)

    if(save){
      res.send({
        paymentUrl:response.data.GatewayPageURL,
      })

    }
})

app.post('/success-payment',async(req,res)=>{
       const successData = req.body 
      const {tran_id, amount} = successData 
       
       if(successData.status !== "VALID"){
        throw new Error("unauthorized,payment","invalid payment")
       }
      const query = {
        paymnetId: successData.tran_id
      }
      const update = {
         $set:{
           status:"success",
         }
      }

      const queries = {
        _id: new ObjectId(tran_id)
      }
      const updates = {
         $inc:{
            quantity:  -parseInt(amount)
         }
      }
      console.log("comming");
      
      const save = await paymentCollection.updateOne(query,update)
      console.log(save);
      
      const save1 = await MangoCollection.updateOne(queries,updates)
      
      res.redirect('http://localhost:5173/success')
 })

 app.post('/failure-payment',async(req,res)=>{
  res.redirect('http://localhost:5173/failure')
 })

   

    
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World! it s me how are you i am localhost");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
