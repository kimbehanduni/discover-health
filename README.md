
### Environment Configuration

For security reasons, the application requires a `SESSION_SECRET` environment variable. The actual `.env` file is not included in the submission because it contains a private secret key.

Before running the application:

1. Copy the `.env.example` file and rename the copy to `.env`.
2. Generate a secure, random secret key by running the following command in the terminal:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Copy the generated key and replace the placeholder in your `.env` file:

   ```dotenv
   SESSION_SECRET=CREATE_YOUR_OWN_SECRET_KEY_HERE
   ```

4. Install the project dependencies and start the server:

   ```bash
   npm install
   npm start
   ```

5. Open http://localhost:3000 in your browser.

**Note:** The `.env` file and `node_modules` directory are intentionally excluded from the submission. The `.env.example` file is included as a configuration template.
