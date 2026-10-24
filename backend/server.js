const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "raghv@",
    database: "college_bus"
});

// Check Database Connection
db.connect((err) => {
    if (err) {
        console.log("MySQL Connection Failed:", err.message);
        return;
    }

    console.log("MySQL Connected Successfully!");
});

// Test API
app.get("/", (req, res) => {
    res.send("College Bus Backend is Running!");
});

// Get All Buses
app.get("/api/buses", (req, res) => {
    db.query("SELECT * FROM buses ORDER BY id DESC", (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(result);
    });
});


// Add New Bus
app.post("/api/buses", (req, res) => {
    const { bus_number, driver_name, phone, route, capacity, model } = req.body;

    if (!bus_number) {
        return res.status(400).json({ error: "Bus number is required" });
    }

    const sql = `
        INSERT INTO buses
        (bus_number, driver_name, phone, route, capacity, model)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        bus_number.trim().toUpperCase(),
        driver_name || null,
        phone || null,
        route || null,
        capacity || 50,
        model || null
    ], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: "Bus added successfully",
            id: result.insertId
        });
    });
});

// Get Entry/Exit History
app.get("/api/history", (req, res) => {
    db.query(
        "SELECT * FROM bus_history ORDER BY movement_time DESC",
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(result);
        }
    );
});

// Save Bus Entry/Exit
app.post("/api/history", (req, res) => {
    const {
        bus_number,
        movement_type,
        driver_name,
        route,
        verification,
        status,
        notes
    } = req.body;

    if (!bus_number || !["IN", "OUT", "ALERT"].includes(movement_type)) {
        return res.status(400).json({
            error: "Valid bus number and movement type are required"
        });
    }

    const sql = `
        INSERT INTO bus_history
        (bus_number, movement_type, driver_name, route, verification, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        bus_number.trim().toUpperCase(),
        movement_type,
        driver_name || null,
        route || null,
        verification || null,
        status || null,
        notes || null
    ], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Update bus status after IN/OUT
        if (movement_type === "IN" || movement_type === "OUT") {
            db.query(
                "UPDATE buses SET is_inside = ? WHERE bus_number = ?",
                [
                    movement_type === "IN",
                    bus_number.trim().toUpperCase()
                ],
                (updateErr) => {
                    if (updateErr) {
                        return res.status(500).json({
                            error: updateErr.message
                        });
                    }

                    res.status(201).json({
                        message: "Movement saved successfully",
                        id: result.insertId
                    });
                }
            );
        } else {
            res.status(201).json({
                message: "Alert saved successfully",
                id: result.insertId
            });
        }
    });
});

app.get("/test", (req, res) => {
    res.send("API is working!");
});
// Bus Entry: Naya record aur entry time save karo
app.post("/api/bus-entry", (req, res) => {
    const { bus_number } = req.body;

    if (!bus_number) {
        return res.status(400).json({ error: "Bus number required" });
    }

    const sql = `
        INSERT INTO bus_records (bus_number, entry_time, exit_time)
        VALUES (?, NOW(), NULL)
    `;

    db.query(sql, [bus_number.trim().toUpperCase()], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ message: "Entry time saved successfully" });
    });
});


// Bus Exit: Usi bus ki pending entry mein exit time save karo
app.post("/api/bus-exit", (req, res) => {
    const { bus_number } = req.body;

    if (!bus_number) {
        return res.status(400).json({ error: "Bus number required" });
    }

    const sql = `
        UPDATE bus_records
        SET exit_time = NOW()
        WHERE bus_number = ?
          AND exit_time IS NULL
        ORDER BY entry_time DESC
        LIMIT 1
    `;

    db.query(sql, [bus_number.trim().toUpperCase()], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Is bus ki pending entry nahi mili"
            });
        }

        res.json({ message: "Exit time saved successfully" });
    });
});
// Start Server
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
});