# Oracle Cloud — Quick Runbook

Everything is prepared. Do these 6 steps in order; each one takes 5-10 minutes.

## Step 1 — Create the free account

https://www.oracle.com/cloud/free/ → **Start for free**
Email + credit card (identity check only, never charged on Always Free).

## Step 2 — Create the server (Compute > Instances > Create instance)

| Setting | Value |
| --- | --- |
| Name | `smart-healthcare` |
| Image | **Ubuntu 24.04** |
| Shape | Change shape → **Ampere (ARM)** → `VM.Standard.A1.Flex` → **4 OCPU / 24 GB** ($0.00) |
| SSH keys | **Paste public keys** → paste the contents of `deploy/oracle_key.pub` |

Note the **public IP** when it appears.

## Step 3 — Open ports (Networking > VCN > Security List > Add Ingress Rules)

Source `0.0.0.0/0`, add three rules: **80**, **443**, **8080** (plus 22 if SSH fails).

## Step 4 — Push the code to GitHub

From this folder (after installing git):

```sh
git init
git add .
git commit -m "feat: smart healthcare assistant monorepo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-healthcare-assistant.git
git push -u origin main
```

## Step 5 — Deploy (from this PC, using the generated key)

```sh
ssh -i deploy/oracle_key ubuntu@YOUR-SERVER-IP

# on the server:
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/YOUR_USERNAME/smart-healthcare-assistant.git
cd smart-healthcare-assistant
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

(For HTTPS with a domain instead: add `DOMAIN=yourdomain` and set the DNS A
record first — see `docs/deployment.md`.)

## Step 6 — Verify

Open `http://YOUR-SERVER-IP:8080` from your phone. Register an account and
run a symptom check.

---

## Files

| File | Purpose |
| --- | --- |
| `deploy/oracle_key` | **Private key — keep it secret, never upload it anywhere** |
| `deploy/oracle_key.pub` | Public key — paste into Oracle during Step 2 |
| `deploy/deploy.sh` | One-command server setup (Docker + model + stack) |
| `docs/deployment.md` | Full guide: Oracle, domain, HTTPS, Atlas MongoDB, backups |

## Optional: free hosted MongoDB (Atlas)

Create a free M0 cluster at https://www.mongodb.com/atlas, then on the server
`nano /opt/smart-healthcare-assistant/.env`, add
`MONGO_URI=mongodb+srv://...`, re-run `./deploy/deploy.sh`. The bundled Mongo
container is skipped and your data survives server recreation.