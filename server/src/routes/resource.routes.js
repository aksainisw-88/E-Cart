const express = require("express");

const createResourceRouter = (resourceName) => {
  const router = express.Router();

  router.get("/", (request, response) => {
    response.json({
      success: true,
      resource: resourceName,
      data: [],
      message: `${resourceName} API is ready for implementation`,
    });
  });

  return router;
};

module.exports = { createResourceRouter };