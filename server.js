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
      .maybeSingle();

    return res.json({
      debug: true,
      logged_in_user_id: user.id,
      logged_in_email: user.email,
      wallet_row: wallet,
      wallet_error: walletError
    });
  } catch (error) {
    console.error("Debug route crash:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

    const tremendousData = await tremendousResponse.json();
    console.log("Tremendous response:", tremendousData);

    if (!tremendousResponse.ok) {
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
app.post("/api/debug-user", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: wallet, error: walletError } = await supabase
      .from("creator_wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return res.json({
      logged_in_user_id: user.id,
      logged_in_email: user.email,
      wallet_row: wallet,
      wallet_error: walletError,
      supabase_url: process.env.SUPABASE_URL
    });
  } catch (error) {
    console.error("Debug route crash:", error);
    return res.status(500).json({ error: "Server error" });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
