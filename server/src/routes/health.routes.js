const express = require("express");

const router = express.Router();

router.get("/", (request, response) => {
  response.json({
    success: true,
    service: "e-mart-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;