DiscoverHealth – Local Healthcare Resource Finder

A full-stack web application built with Node.js, Express, JavaScript and SQLite.

DiscoverHealth is a university project I developed as part of my BSc (Hons) Computer Science degree. The application helps users discover healthcare resources by location, explore them on an interactive map, recommend services and submit reviews.

I developed the application from the backend to the frontend, implementing a REST API, database integration, asynchronous JavaScript requests and interactive mapping using Leaflet and OpenStreetMap.

The project also gave me practical experience in authentication, server-side validation and web application security. I implemented session-based login, password hashing using Node.js scrypt, access control and same-origin request checks. I also carried out a dependency security audit and updated the project to resolve the vulnerabilities identified.

Key Features

Search for healthcare resources by geographical region.

Explore healthcare services using an interactive map.

Add new resources by selecting locations directly on the map.

Recommend healthcare resources and submit reviews.

Register, log in and manage authenticated sessions.

Server-side validation and protected API endpoints.

Tech Stack

Frontend: HTML, CSS, JavaScript, AJAX, Leaflet and OpenStreetMap
Backend: Node.js, Express.js and REST APIs
Database: SQLite
Security: Password hashing, session-based authentication, access control and dependency auditing

What I Learned

This project strengthened my understanding of full-stack development, particularly how frontend interfaces, REST APIs and relational databases work together. It also helped me develop practical debugging, testing and problem-solving skills while considering application security and user experience.

Developed as part of my BSc (Hons) Computer Science coursework.



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
