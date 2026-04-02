import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "https://eanova.online",
      "https://www.eanova.online",
      "https://lareenst24-sys.github.io"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.error("Auth error:", error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("getUser crash:", error);
    return null;
  }
}

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/api/claim-reward", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: wallet, error: walletError } = await supabase
      .from("creator_wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError) {
      console.error("Wallet fetch error:", walletError);
      return res.status(500).json({ error: "Could not fetch wallet" });
    }

    if (!wallet || Number(wallet.balance) < 10) {
      return res.status(400).json({ error: "Minimum payout is $10" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("payouts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (existingError) {
      console.error("Existing payout check error:", existingError);
      return res.status(500).json({ error: "Could not check existing payouts" });
    }

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Already processing" });
    }

    const tremendousResponse = await fetch(
      "https://testflight.tremendous.com/api/v2/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TREMENDOUS_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reward: {
            campaign_id: process.env.CAMPAIGN_ID,
            value: {
              denomination: Number(wallet.balance),
              currency_code: "USD"
            },
            delivery: {
              method: "EMAIL"
            },
            recipient: {
              name: user.email,
              email: user.email
            }
          }
        })
      }
    );

    const tremendousData = await tremendousResponse.json();

    if (!tremendousResponse.ok) {
      console.error("Tremendous error:", tremendousData);
      return res.status(500).json({
        error: "Tremendous request failed",
        details: tremendousData
      });
    }

    const orderId = tremendousData?.order?.id || null;

    const { error: payoutInsertError } = await supabase.from("payouts").insert({
      user_id: user.id,
      amount: Number(wallet.balance),
      status: "pending",
      order_id: orderId
    });

    if (payoutInsertError) {
      console.error("Payout insert error:", payoutInsertError);
      return res.status(500).json({ error: "Could not save payout" });
    }

    const { error: walletUpdateError } = await supabase
      .from("creator_wallets")
      .update({ balance: 0 })
      .eq("user_id", user.id);

    if (walletUpdateError) {
      console.error("Wallet update error:", walletUpdateError);
      return res.status(500).json({ error: "Could not update wallet" });
    }

    return res.json({
      success: true,
      message: "Reward claim submitted successfully"
    });
  } catch (error) {
    console.error("Claim route crash:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
