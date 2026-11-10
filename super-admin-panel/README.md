# E-Cart Super Admin Panel

The panel authenticates with the E-Cart API and reads/writes subscription and payment-history records in the API's MongoDB database. It no longer uses browser-local sample data.

## Run locally

1. Configure the API's customer-specific `MONGO_URI`, shared `SUPER_ADMIN_MONGO_URI`, `CLIENT_URL`, and `SUPER_ADMIN_PANEL_URL` in `server/.env`. The super-admin URI should connect to the dedicated `Super_admin` database.
2. Create a super-admin account from the server directory:

   ```powershell
   npm run create-super-admin -- admin@example.com StrongPassword "Platform Admin"
   ```

3. Configure the API URL for Vite. Create `super-admin-panel/.env.local`:

   ```text
   VITE_API_URL=http://localhost:5000
   ```

4. Run both apps:

   ```powershell
   # server
   npm run dev

   # super-admin-panel
   npm install
   npm run dev -- --port 5174
   ```

Open the Vite URL (normally `http://localhost:5174`) and sign in with the super-admin account.

## Subscription flow

Create a client from **Clients** using the email address of the client's admin account. The API issues a registration number and random license key; the key is shown once and only its hash is stored. The customer admin enters both values in Admin > Settings. The API binds the license to that admin email and checks active status and validity dates on every admin API operation. Suspended or expired licenses cannot use admin operations. On API startup, MongoDB creates the `superadmins`, `subscriptions`, and encrypted customer database configuration collections and their indexes if they do not already exist.

For production, deploy this folder as its own Vercel project. `vercel.json` rewrites `/api/*` to the production API at `https://e-cart-1-pzrz.onrender.com`; update this destination if the API host changes. Set `SUPER_ADMIN_PANEL_URL` on the API to this panel's exact HTTPS origin so credentialed requests are allowed. Each customer API deployment uses its customer's `MONGO_URI` and the same platform `SUPER_ADMIN_MONGO_URI`. MongoDB URIs are server-only; neither browser app connects directly to MongoDB.

Registration-request intake, email delivery, and payment processing are not part of this implementation. Payment amounts and renewals are recorded as subscription history only.
