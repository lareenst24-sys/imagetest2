const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const token = req.headers.authorization?.split(" ")[1];
  const { data } = await supabase.auth.getUser(token);
  return data.user;
}

app.post("/api/claim-reward", async (req, res) => {
  const user = await getUser(req);

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data: wallet } = await supabase
    .from("creator_wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!wallet || wallet.balance < 10) {
    return res.status(400).json({ error: "Minimum payout is $10" });
  }

  const { data: existing } = await supabase
    .from("payouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (existing.length > 0) {
    return res.status(400).json({ error: "Already processing" });
  }

  const response = await fetch("https://testflight.tremendous.com/api/v2/orders", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.TREMENDOUS_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reward: {
        campaign_id: process.env.CAMPAIGN_ID,
        value: {
          denomination: wallet.balance,
          currency_code: "USD"
        },
        delivery: { method: "EMAIL" },
        recipient: {
          name: user.email,
          email: user.email
        }
      }
    })
  });

  const data = await response.json();

  await supabase.from("payouts").insert({
    user_id: user.id,
    amount: wallet.balance,
    status: "pending",
    order_id: data.order.id
  });

  await supabase
    .from("creator_wallets")
    .update({ balance: 0 })
    .eq("user_id", user.id);

  res.json({ success: true });
});

app.listen(3000, () => console.log("Server running"));
