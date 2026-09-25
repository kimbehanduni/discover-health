require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");

const ResourceDAO = require("./dao/resourceDAO");
const ResourceController = require("./controllers/resourceController");
const createResourceRoutes = require("./routes/resourceRoutes");

const ReviewDAO = require("./dao/reviewDAO");
const ReviewController = require("./controllers/reviewController");
const createReviewRoutes = require("./routes/reviewRoutes");

// CREATE EXPRESS APP

const app = express();
const PORT = 3000;

// PASSWORD SECURITY

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
    if (typeof storedPassword !== "string") {
        return false;
    }

    // Support existing coursework users with
    // legacy plain-text passwords.
    if (!storedPassword.includes(":")) {
        const supplied = Buffer.from(password, "utf8");
        const stored = Buffer.from(storedPassword, "utf8");

        return (
            supplied.length === stored.length &&
            crypto.timingSafeEqual(supplied, stored)
        );
    }

    const parts = storedPassword.split(":");

    if (
        parts.length !== 2 ||
        !/^[a-f0-9]{32}$/i.test(parts[0]) ||
        !/^[a-f0-9]{128}$/i.test(parts[1])
    ) {
        return false;
    }

    const expected = Buffer.from(parts[1], "hex");

    const actual = crypto.scryptSync(
        password,
        parts[0],
        expected.length
    );

    return crypto.timingSafeEqual(expected, actual);
}

// BASIC MIDDLEWARE

app.use(express.json({ limit: "20kb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "20kb"
    })
);

// SESSION MIDDLEWARE

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
    console.error(
        "SESSION_SECRET must contain at least 32 characters."
    );

    process.exit(1);
}

if (!process.env.SESSION_SECRET) {
    console.warn(
        "SESSION_SECRET is not set; sessions will reset when the server restarts."
    );
}

app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "strict",
            secure: false,
            maxAge: 1000 * 60 * 60
        }
    })
);


// CSRF PROTECTION - SAME ORIGIN

function requireSameOrigin(request, response, next) {

    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        return next();
    }

    const allowedOrigin = `http://localhost:${PORT}`;
    const origin = request.get("Origin");

    if (origin !== allowedOrigin) {
        return response.status(403).json({
            error: "Request blocked: invalid or missing origin."
        });
    }

    next();
}

app.use(requireSameOrigin);

// SERVE PUBLIC FILES

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// DATABASE CONNECTION

const dbPath = path.join(__dirname, "DB.db");

const db = new sqlite3.Database(
    dbPath,
    (error) => {
        if (error) {
            console.error(
                "Error connecting to the database:",
                error.message
            );
        } else {
            console.log(
                "Connected to the SQLite database."
            );
        }
    }
);

// RESOURCE DAO, CONTROLLER AND ROUTES

const resourceDAO = new ResourceDAO(db);

const resourceController = new ResourceController(
    resourceDAO
);

const resourceRoutes = createResourceRoutes(
    resourceController
);

// REVIEW DAO, CONTROLLER AND ROUTES

const reviewDAO = new ReviewDAO(db);

const reviewController = new ReviewController(
    reviewDAO
);

const reviewRoutes = createReviewRoutes(
    reviewController
);

// REGISTER API ROUTES

app.use("/api", resourceRoutes);
app.use("/api", reviewRoutes);

// API TEST ROUTE

app.get("/api", (request, response) => {
    response.json({
        message: "DiscoverHealth API is running"
    });
});

// TASK 10 - LOGIN

app.post("/api/login", (request, response) => {
    const username = String(
        request.body?.username ?? ""
    ).trim();

    const password = String(
        request.body?.password ?? ""
    );

    if (!username || !password) {
        return response.status(400).json({
            error: "Username and password are required."
        });
    }

    const sql = `
        SELECT id, username, password, isAdmin
        FROM users
        WHERE username = ?
    `;

    db.get(sql, [username], (error, user) => {
        if (error) {
            console.error(
                "Login database error:",
                error.message
            );

            return response.status(500).json({
                error: "Unable to login."
            });
        }

        if (
            !user ||
            !verifyPassword(
                password,
                String(user.password)
            )
        ) {
            return response.status(401).json({
                error: "Invalid username or password."
            });
        }

        // Create a new session after authentication.

        const completeLogin = () => {
            request.session.regenerate(
                (sessionError) => {
                    if (sessionError) {
                        console.error(
                            "Session regeneration error:",
                            sessionError
                        );

                        return response.status(500).json({
                            error: "Unable to login."
                        });
                    }

                    request.session.user = {
                        id: user.id,
                        username: user.username,
                        isAdmin: Boolean(user.isAdmin)
                    };

                    request.session.save(
                        (saveError) => {
                            if (saveError) {
                                console.error(
                                    "Session save error:",
                                    saveError
                                );

                                return response
                                    .status(500)
                                    .json({
                                        error: "Unable to login."
                                    });
                            }

                            response.json({
                                message: "Login successful.",
                                user: request.session.user
                            });
                        }
                    );
                }
            );
        };

        // Upgrade old plain-text passwords
        // after a successful login.

        if (!String(user.password).includes(":")) {
            const upgradedPassword =
                hashPassword(password);

            db.run(
                `
                    UPDATE users
                    SET password = ?
                    WHERE id = ?
                `,
                [upgradedPassword, user.id],
                (updateError) => {
                    if (updateError) {
                        console.error(
                            "Password upgrade error:",
                            updateError.message
                        );

                        return response.status(500).json({
                            error: "Unable to login."
                        });
                    }

                    completeLogin();
                }
            );
        } else {
            completeLogin();
        }
    });
});

// TASK 10 - CHECK CURRENT SESSION

app.get("/api/session", (request, response) => {
    if (
        !request.session ||
        !request.session.user
    ) {
        return response.json({
            loggedIn: false,
            user: null
        });
    }

    response.json({
        loggedIn: true,
        user: request.session.user
    });
});

// TASK 10 - LOGOUT

app.post("/api/logout", (request, response) => {
    if (
        !request.session ||
        !request.session.user
    ) {
        return response.json({
            message: "No user is currently logged in."
        });
    }

    request.session.destroy((error) => {
        if (error) {
            console.error(
                "Logout error:",
                error
            );

            return response.status(500).json({
                error: "Unable to logout."
            });
        }

        response.clearCookie("connect.sid");

        response.json({
            message: "Logout successful."
        });
    });
});

// TASK 10 - SIGNUP ROUTE

app.post("/api/signup", (request, response) => {
    const username = String(
        request.body?.username ?? ""
    ).trim();

    const password = String(
        request.body?.password ?? ""
    );

    if (!username || !password) {
        return response.status(400).json({
            error: "Username and password are required."
        });
    }

    if (
        username.length < 3 ||
        username.length > 50
    ) {
        return response.status(400).json({
            error:
                "Username must be between 3 and 50 characters."
        });
    }

    if (
        password.length < 8 ||
        password.length > 100
    ) {
        return response.status(400).json({
            error:
                "Password must be between 8 and 100 characters."
        });
    }

    const checkSql = `
        SELECT id
        FROM users
        WHERE username = ?
    `;

    db.get(
        checkSql,
        [username],
        (error, existingUser) => {
            if (error) {
                console.error(
                    "Signup check error:",
                    error.message
                );

                return response.status(500).json({
                    error: "Unable to create user."
                });
            }

            if (existingUser) {
                return response.status(409).json({
                    error: "Username already exists."
                });
            }

            const hashedPassword =
                hashPassword(password);

            const insertSql = `
                INSERT INTO users
                    (username, password, isAdmin)
                VALUES (?, ?, ?)
            `;

            db.run(
                insertSql,
                [username, hashedPassword, 0],
                function (insertError) {
                    if (insertError) {
                        console.error(
                            "Signup insert error:",
                            insertError.message
                        );

                        if (
                            insertError.code ===
                            "SQLITE_CONSTRAINT"
                        ) {
                            return response.status(409).json({
                                error: "Username already exists."
                            });
                        }

                        return response.status(500).json({
                            error: "Unable to create user."
                        });
                    }

                    response.status(201).json({
                        message:
                            "User created successfully.",

                        user: {
                            id: this.lastID,
                            username: username
                        }
                    });
                }
            );
        }
    );
});

// START SERVER

app.listen(PORT, () => {
    console.log(
        `DiscoverHealth is running at http://localhost:${PORT}`
    );
});
