# Public Deployment Guide

Goal: run the Smart Healthcare Assistant on a public server so it works from
any device — phones, iPhones, Androids, any browser, anywhere.

## Free deployment (Oracle Cloud — $0/month, recommended)

Oracle Cloud's **Always Free** tier gives you a real 24/7 virtual server with
no monthly cost. Use the **ARM (Ampere A1)** shape — 4 OCPUs / 24 GB RAM for
free — which runs the whole Docker stack comfortably (MongoDB + AI + backend +
frontend). The 1 GB AMD "micro" shape is too small (MongoDB alone needs
~500 MB), so pick ARM.

### 1. Create the account

1. Go to https://www.oracle.com/cloud/free/ and click **Start for free**.
2. Sign up with your email. Oracle asks for a **credit card** — it is only for
   identity verification, **never charged** while you stay inside the free
   tier limits.
3. Pick your **home region** (closest to your users; it cannot be changed
   later, and ARM capacity varies by region — if "Out of capacity" appears,
   try another region or come back later).

### 2. Create the server (Compute > Instances > Create instance)

1. Name: `smart-healthcare`
2. **Placement**: default (or an AD with free capacity).
3. **Image**: select **Ubuntu 24.04** (an ARM-compatible image).
4. **Shape**: click *Change shape* → check **Ampere** (ARM) → select
   **VM.Standard.A1.Flex** → **4 OCPUs, 24 GB RAM** (shown as $0.00/mo).
5. **Networking**: default VCN is fine.
6. **SSH keys**: "Generate a key pair" and **download both keys**, or paste
   your public key.
7. Click **Create**. Wait ~2 minutes for it to boot. Note the **public IP**.

### 3. Open the firewall ports

Oracle's cloud firewall blocks everything by default. Open ports for web
traffic:

1. Console → **Networking > Virtual cloud networks** → your VCN →
   **Security Lists** → *Default Security List for ...* → **Add Ingress Rules**
2. Add these three rules (Source CIDR: `0.0.0.0/0`, Destination port ranges):

   | Port | Purpose |
   | --- | --- |
   | 80 | HTTP (needed for HTTPS via Caddy) |
   | 443 | HTTPS |
   | 8080 | plain HTTP fallback when you have no domain |

3. Save. Also make sure your OS firewall is off by default on this image
   (Ubuntu image ships without ufw active — verify later if the site does not
   load).

### 4. Deploy with one command

Connect to the server from a terminal on your PC:

```sh
ssh ubuntu@YOUR-SERVER-IP
```

Then:

```sh
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/YOUR_USERNAME/smart-healthcare-assistant.git
cd smart-healthcare-assistant
chmod +x deploy/deploy.sh

# No domain yet — plain HTTP on port 8080:
./deploy/deploy.sh

# Or with a domain (gets HTTPS automatically):
DOMAIN=myhealthcare.site REPO_URL=https://github.com/YOUR_USERNAME/smart-healthcare-assistant.git ./deploy/deploy.sh
```

What the script does:

1. Installs Docker + docker compose plugin (first run only).
2. Clones/pulls the code into `/opt/smart-healthcare-assistant`.
3. Creates `.env` with a random `JWT_SECRET` (edit it later with `nano .env`).
4. Trains the AI model artifacts if they are missing.
5. Starts the full stack (MongoDB + AI service + backend + frontend).
6. Prints health checks.

Open `http://YOUR-SERVER-IP:8080` from any phone — the site is live.

### Free hosted MongoDB (optional, recommended)

The deploy runs MongoDB inside the bundled container by default. For a free
**MongoDB Atlas M0** cluster (https://www.mongodb.com/atlas — no credit card
needed):

1. Create a free cluster and a database user.
2. Copy the connection string (looks like
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/smart_healthcare`).
3. On the server: `nano /opt/smart-healthcare-assistant/.env` and add:

   ```
   MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/smart_healthcare
   ```

4. Re-run `./deploy/deploy.sh` — the bundled MongoDB is then skipped, your
   data lives in the cloud, and recreating the server never loses it.

### 5. Add a domain for the official look (optional)

1. Buy a domain at Porkbun / Namecheap / Cloudflare (e.g. `myhealthcare.site`,
   ~$10-15/year). Free alternative: create a `something.duckdns.org` name at
   duckdns.org and set it to your server IP.
2. In the DNS settings, create an **A record**: `@` and `www` → your server IP.
3. Wait 5–60 minutes for DNS to spread, then re-run the deploy script with the
   domain. **Caddy** issues and renews Let's Encrypt certificates
   automatically — you get a valid padlock on `https://yourdomain`.

> Note: Let's Encrypt cannot issue certificates for bare IPs — HTTPS requires
> a domain name.

---

## Alternative: cheap paid VPS (~$4-6/month)

If Oracle signup is not possible (some countries/CCs are rejected), the same
`deploy.sh` runs identically on any Ubuntu VPS:

| Provider | Price | Size |
| --- | --- | --- |
| Hetzner Cloud | ~EUR 4.51/mo | CX22: 2 vCPU, 4 GB RAM |
| DigitalOcean | ~$6/mo | Basic: 1 vCPU, 1 GB RAM |
| Hostinger VPS | ~$4.99/mo | 1 vCPU, 2 GB RAM |

Steps are the same: buy with Ubuntu 24.04 → SSH in → clone → run `deploy.sh`.

---

## Putting the code on GitHub

1. Install git and create a GitHub account (github.com).
2. Create a new repo named `smart-healthcare-assistant` (private or public).
3. From the monorepo root push it:

```sh
git init
git add .
git commit -m "feat: smart healthcare assistant monorepo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-healthcare-assistant.git
git push -u origin main
```

> Note: `ai-service/models/*.joblib` is gitignored on purpose. The deploy
> script retrains the model on the server automatically, so nothing is missing.

## Verify from your phone

1. Open your phone's browser (iPhone Safari / Android Chrome).
2. Go to `https://yourdomain` (or `http://YOUR-SERVER-IP:8080` without a
   domain).
3. Register a patient account and run a symptom check — it works because the
   whole stack lives on one public server; no localhost involved.

## Day-2 operations

| Task | Command (on the server) |
| --- | --- |
| Update to new code | `cd /opt/smart-healthcare-assistant && git pull && ./deploy/deploy.sh` |
| See backend logs | `docker compose logs -f backend` |
| See AI logs | `docker compose logs -f ai-service` |
| Check containers | `docker compose ps` |
| Restart everything | `docker compose restart` |
| Stop everything | `docker compose down` |
| Back up the database | `docker compose exec mongo mongodump --archive=/dump.gz && docker cp mongo:/dump.gz ./dump.gz` |

## Security checklist

- [ ] `JWT_SECRET` in `.env` is a long random string (the script generates one)
- [ ] Firewall allows only ports 22, 80, 443 (and 8080 while you test):

```sh
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw enable
```

- [ ] Set real SMTP credentials in `.env` so email notifications actually send
      (see `docs/notifications.md`); `EMAIL_TRANSPORT=console` just logs them
- [ ] Change the default admin/doctor accounts you create via the API

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Site loads but API errors | AI model not trained | `docker compose logs ai-service`; if it says artifacts unavailable, re-run `./deploy/deploy.sh` |
| `http://IP:8080` unreachable from outside | Oracle security list blocks it | Add the ingress rules from step 3 above, or just use a domain (ports 80/443) |
| Server unreachable over SSH | Oracle security list blocks 22 | Add an ingress rule for port 22 |
| Email reminders not sending | SMTP not configured | Set `EMAIL_TRANSPORT=smtp` + `SMTP_*` in `.env`, restart backend |
| HTTPS certificate error | DNS not propagated yet | Wait, then `docker compose restart caddy` |
| "Out of capacity" when creating ARM instance | Region is full | Try a different availability domain or region |